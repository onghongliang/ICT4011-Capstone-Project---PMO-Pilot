import { useEffect, useRef, useState } from "react";
import { checkAvailability, getCalendarEvent, rescheduleMeeting } from "../api/calendar.js";
import { dismissDecline } from "../api/invitations.js";
import { recommendSlots } from "../api/scheduling.js";
import { useOrg } from "../context/OrgContext.jsx";
import { formatRange, formatSlot } from "../utils/format.js";

// The rescheduling flow (disruption handling) as a chat:
//   criticality check   — the server flagged whether the decliner is mandatory;
//   conflict attribution — who declined and why;
//   slot re-calculation  — the decliner's suggested time (if it works) plus
//     the alternatives computed when the decline came in, within the next
//     milestone deadline;
//   reschedule & alert   — moving it tells every attendee who was unavailable.
export function useRescheduleChat({ decline, onDone, onClose }) {
  const { organization } = useOrg();
  const [messages, setMessages] = useState([]);
  const [step, setStep] = useState("loading");
  const [attendees, setAttendees] = useState([]);
  const [options, setOptions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const started = useRef(false);

  const durationMinutes = (new Date(decline.end_time) - new Date(decline.start_time)) / 60000;

  function say(from, content) {
    setMessages((prev) => [...prev, { from, content }]);
  }

  // Everyone mandatory on the meeting, plus the decliner.
  function mandatoryIdsFor(list) {
    const ids = list.filter((a) => a.is_mandatory).map((a) => a.stakeholder_id);
    if (!ids.includes(decline.stakeholder_id)) ids.push(decline.stakeholder_id);
    return ids;
  }

  useEffect(() => {
    // Ref guard: StrictMode runs this effect twice in dev.
    if (started.current) return;
    started.current = true;
    start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    say(
      "bot",
      `${decline.full_name} declined "${decline.title}" (${formatRange(decline.start_time, decline.end_time)}). Reason: "${decline.decline_reason}". ${
        decline.is_critical_decline === false
          ? "They're not a mandatory attendee, so the meeting can go ahead without them, but you can still move it."
          : "They're a mandatory attendee, so the meeting needs to move."
      }`
    );
    try {
      const { attendees: list } = await getCalendarEvent(decline.calendar_event_id);
      setAttendees(list);
      const found = [];

      const suggested = await checkSuggestedTime(list);
      if (suggested) found.push(suggested);

      const precomputed = decline.proposed_alternatives;
      const alternatives = precomputed?.slots?.length ? precomputed : await fetchAlternatives(list, null);
      found.push(...alternatives.slots.filter((s) => !found.some((f) => f.start_time === s.start_time)));
      say("bot", alternativesMessage(alternatives, Boolean(precomputed?.slots?.length)));
      setOptions(found);
      setStep(found.length > 0 ? "choose" : "no-slot");
    } catch (err) {
      setError(err.message);
    }
  }

  // The decliner's own suggestion, as an option if every mandatory attendee is free.
  async function checkSuggestedTime(list) {
    if (!decline.suggested_start_time) return null;
    const check = await checkAvailability({
      organization_id: organization.id,
      sub_project_id: decline.sub_project_id,
      start_time: decline.suggested_start_time,
      end_time: decline.suggested_end_time,
      stakeholder_ids: list.map((a) => a.stakeholder_id),
      mandatory_stakeholder_ids: mandatoryIdsFor(list),
      exclude_calendar_event_id: decline.calendar_event_id,
    });
    const when = formatSlot(decline.suggested_start_time);
    if (!check.is_valid) {
      const why = check.blocking_conflicts.map((c) => `${c.full_name} is busy ("${c.conflicting_events[0].title}")`).join("; ");
      say("bot", `Their suggested time, ${when}, doesn't work: ${why}.`);
      return null;
    }
    say("bot", `Their suggested time, ${when}, works for every mandatory attendee.`);
    const busyOptional = check.stakeholders.filter((s) => !s.is_free);
    return {
      start_time: decline.suggested_start_time,
      end_time: decline.suggested_end_time,
      rationale: [
        `Suggested by ${decline.full_name}`,
        busyOptional.length === 0
          ? "Everyone invited is free"
          : `All required attendees free; ${busyOptional.map((s) => s.full_name).join(", ")} busy`,
      ],
    };
  }

  function fetchAlternatives(list, searchFromDate) {
    return recommendSlots({
      organization_id: organization.id,
      sub_project_id: decline.sub_project_id,
      attendee_stakeholder_ids: list.map((a) => a.stakeholder_id),
      mandatory_stakeholder_ids: mandatoryIdsFor(list),
      duration_minutes: durationMinutes,
      search_from_date: searchFromDate,
      exclude_calendar_event_id: decline.calendar_event_id,
      avoid_start_time: decline.start_time,
    });
  }

  async function showLaterTimes() {
    say("user", "Show later times");
    try {
      const next = new Date(options[options.length - 1].start_time);
      next.setDate(next.getDate() + 1);
      const data = await fetchAlternatives(attendees, next.toISOString());
      say("bot", alternativesMessage(data, false));
      setOptions(data.slots);
      setStep(data.slots.length ? "choose" : "no-slot");
    } catch (err) {
      setError(err.message);
    }
  }

  async function moveTo(slot) {
    setBusy(true);
    setError(null);
    say("user", `Move it to ${formatSlot(slot.start_time)}`);
    try {
      const data = await rescheduleMeeting(decline.calendar_event_id, {
        start_time: slot.start_time,
        end_time: slot.end_time,
        mandatory_stakeholder_ids: [decline.stakeholder_id],
        reason: `${decline.full_name} was unavailable: ${decline.decline_reason}`,
      });
      if (data.status === "conflict") {
        say("bot", "That slot was just taken. Let me find fresh alternatives.");
        const fresh = await fetchAlternatives(attendees, null);
        say("bot", alternativesMessage(fresh, false));
        setOptions(fresh.slots);
        setStep(fresh.slots.length ? "choose" : "no-slot");
        return;
      }
      say(
        "bot",
        `Done: "${decline.title}" is now ${formatRange(data.event.start_time, data.event.end_time)}. Every attendee has been sent an updated invite saying ${decline.full_name} was unavailable and why, and asked to confirm the new time.`
      );
      setStep("done");
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function keepOriginal() {
    setBusy(true);
    setError(null);
    try {
      await dismissDecline(decline.attendee_id);
      onDone();
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return { messages, step, options, busy, error, showLaterTimes, moveTo, keepOriginal };
}

function alternativesMessage(data, precomputed) {
  if (!data.slots.length) {
    return "I couldn't find another slot in the next two weeks where every mandatory attendee is free.";
  }
  const deadline = data.deadline ? new Date(data.deadline).toLocaleDateString() : null;
  return `${precomputed ? "I worked out these alternatives as soon as the decline came in" : "Here are the best alternatives"}${
    deadline && !data.after_deadline ? `, all before the next milestone deadline (${deadline})` : ""
  }${deadline && data.after_deadline ? `. None fit before the milestone deadline (${deadline})` : ""}:`;
}
