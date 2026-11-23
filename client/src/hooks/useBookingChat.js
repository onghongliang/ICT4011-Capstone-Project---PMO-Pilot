import { useEffect, useRef, useState } from "react";
import { bookMeeting } from "../api/calendar.js";
import { listProjectMembers, listProjectRoles, listProjects } from "../api/projects.js";
import { draftAgenda, recommendSlots } from "../api/scheduling.js";
import { getSteercoAttendees } from "../api/teams.js";
import { useOrg } from "../context/OrgContext.jsx";
import { formatSlot } from "../utils/format.js";

// The scheduling flow (new meeting request) as a guided chat:
//   1. meeting title intake
//   2. sub-project selection (or Steering Committee)
//   3. hierarchy lookup: mandatory attendees from the project's roles
//   4. availability check: the Recommendation Engine's ranked slots
//   5. context-aware agenda drafted from the project data, editable
//   6. confirmation & dispatch: booking + .ics invites
// The "assistant" is deterministic today (scripted prompts over the real
// scheduling services), so an LLM can drive the same steps later.
// With `request` (a stakeholder's meeting request) or `kickoff` (a
// sub-project in planning), the title and sub-project come preset.
export function useBookingChat({ request = null, kickoff = null, onBooked }) {
  const { organization } = useOrg();
  const presetSubProjectId = request?.sub_project_id ?? kickoff?.id ?? null;
  const presetTitle = request?.title ?? (kickoff ? `${kickoff.name} Kick-off Meeting` : null);

  const [subProjects, setSubProjects] = useState([]);
  const [messages, setMessages] = useState(() => [{ from: "bot", content: openingMessage(request, kickoff) }]);
  const [step, setStep] = useState(presetTitle ? "pick-subproject" : "ask-title");
  const [title, setTitle] = useState(presetTitle ?? "");
  const [subProject, setSubProject] = useState(null);
  // A steering committee: org-wide (no sub-project) with fixed membership.
  const [steerco, setSteerco] = useState(false);
  // Everyone invited: { stakeholder_id, full_name, label, is_mandatory }.
  const [team, setTeam] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [chosen, setChosen] = useState(null);
  const [agendaText, setAgendaText] = useState("");
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState(null);
  const autoPicked = useRef(false);

  const meetingType = kickoff ? "kickoff" : steerco ? "steering_committee" : null;

  useEffect(() => {
    if (!organization) return;
    listProjects(organization.id).then(({ subProjects: list }) => {
      setSubProjects(list);
      const preset = presetSubProjectId && list.find((sp) => sp.id === presetSubProjectId);
      // Ref guard: StrictMode runs this effect twice in dev.
      if (preset && !autoPicked.current) {
        autoPicked.current = true;
        pickSubProject(preset);
      }
    });
  }, [organization]); // eslint-disable-line react-hooks/exhaustive-deps

  function say(from, content) {
    setMessages((prev) => [...prev, { from, content }]);
  }

  // Step 1: meeting title intake.
  function submitTitle(value) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setTitle(trimmed);
    say("user", trimmed);
    say("bot", "Which sub-project is this for? Or pick Steering Committee for a SteerCo meeting.");
    setStep("pick-subproject");
  }

  // Steps 2–3: sub-project selection and hierarchy lookup.
  async function pickSubProject(sp) {
    setSubProject(sp);
    say("user", `${sp.name} (${sp.code})`);
    const [roles, members] = await Promise.all([listProjectRoles(sp.id), listProjectMembers(sp.id)]);
    const fullTeam = buildTeam(roles, members, request);
    setTeam(fullTeam);
    const required = fullTeam.filter((a) => a.is_mandatory).map((a) => `${a.full_name} (${a.label})`);
    const optional = fullTeam.filter((a) => !a.is_mandatory).map((a) => a.full_name);
    say(
      "bot",
      [
        required.length > 0 ? `Mandatory: ${required.join(", ")}.` : "This sub-project has no mandatory roles set.",
        optional.length > 0 ? `I'll also try to fit in ${optional.join(", ")}.` : null,
        "The PMO office is invited automatically too.",
      ]
        .filter(Boolean)
        .join(" ")
    );
    recommend(sp, fullTeam, null);
  }

  // Steering committee: the server decides who attends (Project Sponsor,
  // Project Lead, Process Owners); fetched here to show and search against.
  async function pickSteerco() {
    setSteerco(true);
    say("user", "Steering Committee (SteerCo)");
    const attendees = await getSteercoAttendees(organization.id);
    setTeam(attendees);
    say(
      "bot",
      `A steering committee involves only ${attendees.map((a) => `${a.full_name} (${a.label})`).join(", ")}. The PMO office is invited automatically too.`
    );
    recommend(null, attendees, null);
  }

  // Step 4: availability check — the top-ranked slots with their rationale.
  async function recommend(sp, attendees, searchFromDate) {
    setStep("searching");
    setError(null);
    say("bot", "Ranking the best Monday–Friday slots against everyone's availability…");
    try {
      const data = await recommendSlots({
        organization_id: organization.id,
        sub_project_id: sp?.id ?? null,
        attendee_stakeholder_ids: attendees.map((a) => a.stakeholder_id),
        mandatory_stakeholder_ids: attendees.filter((a) => a.is_mandatory).map((a) => a.stakeholder_id),
        search_from_date: searchFromDate,
      });
      if (!data.found) {
        say("bot", "I couldn't find a slot in the next two weeks where every mandatory attendee is free.");
        setStep("no-slot");
        return;
      }
      setRecommendation(data);
      say("bot", optionsMessage(data));
      setStep("choose-slot");
    } catch (err) {
      setError(err.message);
    }
  }

  function showLaterTimes() {
    const last = recommendation.slots[recommendation.slots.length - 1];
    const next = new Date(last.start_time);
    next.setDate(next.getDate() + 1);
    say("user", "Show later times");
    recommend(subProject, team, next.toISOString());
  }

  // Step 5: context-aware agenda, drafted from the project data.
  async function chooseSlot(slot) {
    setChosen(slot);
    say("user", formatSlot(slot.start_time));
    setStep("drafting");
    try {
      const agenda = await draftAgenda({
        organization_id: organization.id,
        sub_project_id: subProject?.id ?? null,
        title,
        meeting_type: meetingType,
        request_reason: request?.reason ?? null,
      });
      setAgendaText(agenda);
      say("bot", "I've drafted an agenda from the project's milestones and action items. Edit it if you like, then confirm.");
      setStep("agenda");
    } catch (err) {
      setError(err.message);
    }
  }

  // Step 6: confirmation & dispatch.
  async function confirmBooking() {
    setBooking(true);
    setError(null);
    try {
      const data = await bookMeeting({
        organization_id: organization.id,
        sub_project_id: subProject?.id ?? null,
        title,
        description: agendaText.trim() || null,
        meeting_type: meetingType,
        start_time: chosen.start_time,
        end_time: chosen.end_time,
        attendees: team.map((a) => ({ stakeholder_id: a.stakeholder_id, is_mandatory: a.is_mandatory })),
      });
      if (data.status === "conflict") {
        // The booking endpoint's own re-check caught a slot taken since.
        say("bot", "That slot was just taken. Let me re-rank the options.");
        recommend(subProject, team, null);
        return;
      }
      say(
        "bot",
        `Booked! "${data.event.title}" is on the calendar, and invites with the agenda have gone out.${
          data.sub_project_activated ? ` ${subProject?.name} is now Active.` : ""
        }`
      );
      setStep("booked");
      onBooked(data.event);
    } catch (err) {
      setError(err.message);
    } finally {
      setBooking(false);
    }
  }

  return {
    messages,
    step,
    setStep,
    subProjects,
    // Show the project chips only when the user still has to choose one.
    showProjectChoice: step === "pick-subproject" && !subProject && !steerco && !presetSubProjectId,
    canPickSteerco: !request,
    recommendation,
    chosen,
    agendaText,
    setAgendaText,
    booking,
    error,
    submitTitle,
    pickSubProject,
    pickSteerco,
    showLaterTimes,
    chooseSlot,
    confirmBooking,
  };
}

function openingMessage(request, kickoff) {
  if (kickoff) {
    return `Let's schedule the kick-off meeting for ${kickoff.name}. Once it's booked, the project moves from Planning to Active.`;
  }
  if (request) {
    return `Let's schedule ${request.requested_by_name}'s request: "${request.title}".${
      request.sub_project_id ? "" : " Which sub-project is this meeting for?"
    }`;
  }
  return "Hi! What's the meeting title?";
}

// Leadership roles (mandatory per the sub-project's settings), team members
// (optional) and, for a request, the requester (mandatory).
function buildTeam(roles, members, request) {
  const byId = new Map();
  for (const r of roles) {
    byId.set(r.stakeholder_id, { stakeholder_id: r.stakeholder_id, full_name: r.full_name, label: r.role_label, is_mandatory: r.is_mandatory });
  }
  for (const m of members) {
    if (!byId.has(m.stakeholder_id)) {
      byId.set(m.stakeholder_id, { stakeholder_id: m.stakeholder_id, full_name: m.full_name, label: m.title, is_mandatory: false });
    }
  }
  if (request) {
    const existing = byId.get(request.requested_by_stakeholder_id);
    byId.set(request.requested_by_stakeholder_id, {
      stakeholder_id: request.requested_by_stakeholder_id,
      full_name: request.requested_by_name,
      label: existing?.label ?? "Requester",
      is_mandatory: true,
    });
  }
  return [...byId.values()];
}

function optionsMessage(data) {
  const deadline = data.deadline ? new Date(data.deadline).toLocaleDateString() : null;
  return `Here are the top ${data.slots.length} options${
    deadline && !data.after_deadline ? `, all before the next milestone deadline (${deadline})` : ""
  }${deadline && data.after_deadline ? `. None fit before the next milestone deadline (${deadline}), so these are the earliest after it` : ""}. Pick one:`;
}
