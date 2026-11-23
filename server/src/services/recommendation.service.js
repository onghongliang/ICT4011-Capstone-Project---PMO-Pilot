import { queryAvailability } from "./availability.service.js";
import { pmoOfficerIds, projectLeadIds } from "./teams.service.js";

// Recommendation & Optimisation Engine. Treats scheduling as a constraint
// problem solved heuristically rather than exhaustively:
//   - hard constraint: every mandatory attendee is free (queryAvailability's
//     is_valid) — anything else is discarded outright;
//   - soft constraints, scored: optional attendees free, blackout periods
//     avoided (penalised by their weight, never forbidden), sooner slots
//     preferred (more strongly when a milestone deadline is near), and the
//     lunch hour avoided.
// It returns the top-ranked candidates (at most one per day, for variety),
// each with a plain-language rationale the chat shows to the coordinator.

const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 17;
const DAY_MS = 24 * 60 * 60 * 1000;

const WEIGHTS = {
  optionalBusy: 20, // per optional attendee who would miss it
  blackout: 40, // × the blackout period's weight (0–1)
  perDay: 1.5, // urgency: each day further out
  perDayWithDeadline: 4, // urgency when a milestone deadline applies
  lunch: 10,
};

function isWeekday(date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function dateLabel(d) {
  return new Date(d).toLocaleDateString("en-SG", { day: "numeric", month: "short" });
}

// bookMeeting always adds the Project Lead (required) and the PMO officers
// (optional), so every search must account for them the same way.
export async function withStandingAttendees(organizationId, attendeeIds, mandatoryIds) {
  const [leadIds, pmoIds] = await Promise.all([projectLeadIds(organizationId), pmoOfficerIds(organizationId)]);
  return {
    attendeeIds: [...new Set([...attendeeIds, ...leadIds, ...pmoIds])],
    mandatoryIds: [...new Set([...mandatoryIds, ...leadIds])],
  };
}

function scoreCandidate(availability, { daysOut, hour, deadline }) {
  const rationale = [];
  let score = 100;

  const optionalBusy = availability.stakeholders.filter((s) => !s.is_mandatory && !s.is_free);
  if (optionalBusy.length === 0) {
    rationale.push("Everyone invited is free");
  } else {
    score -= WEIGHTS.optionalBusy * optionalBusy.length;
    rationale.push(
      `All required attendees free; ${optionalBusy
        .map((s) => `${s.full_name} busy ("${s.conflicts[0]?.title}")`)
        .join(", ")}`
    );
  }

  const blackoutWeight = Math.max(0, ...availability.blackout_periods.map((b) => b.weight));
  if (blackoutWeight > 0) {
    score -= WEIGHTS.blackout * blackoutWeight;
    rationale.push(`Falls in ${availability.blackout_periods.map((b) => b.name).join(", ")} (soft constraint)`);
  }

  score -= daysOut * (deadline ? WEIGHTS.perDayWithDeadline : WEIGHTS.perDay);
  if (deadline) rationale.push(`Before the next milestone deadline (${dateLabel(deadline)})`);

  if (hour === 12) {
    score -= WEIGHTS.lunch;
    rationale.push("Over lunch");
  }

  return {
    score: Math.round(score),
    everyone_free: optionalBusy.length === 0,
    unavailable: optionalBusy.map((s) => ({ stakeholder_id: s.stakeholder_id, full_name: s.full_name, conflict: s.conflicts[0]?.title ?? null })),
    blackouts: availability.blackout_periods.map((b) => b.name),
    rationale,
  };
}

// Returns { found, slots: [...top `limit` by score], deadline, after_deadline }.
// With a deadline (the next milestone), candidates are searched up to it
// first; only if none fit does it widen to the full window and say so.
export async function recommendSlots({
  organizationId,
  subProjectId = null,
  attendeeStakeholderIds,
  mandatoryStakeholderIds = [],
  durationMinutes = 60,
  searchFromDate = null,
  searchDays = 14,
  excludeCalendarEventId = null,
  // Skip this exact start (e.g. the slot someone just declined).
  avoidStartTime = null,
  deadline = null,
  limit = 3,
}) {
  const { attendeeIds, mandatoryIds } = await withStandingAttendees(
    organizationId,
    attendeeStakeholderIds,
    mandatoryStakeholderIds
  );

  const rangeStart = searchFromDate ? new Date(searchFromDate) : new Date(Date.now() + DAY_MS);
  rangeStart.setHours(0, 0, 0, 0);
  const deadlineDate = deadline ? new Date(deadline) : null;
  const hasUsableDeadline = deadlineDate && deadlineDate > rangeStart;

  async function search(windowEnd) {
    const candidates = [];
    for (let day = new Date(rangeStart); day < windowEnd; day = new Date(day.getTime() + DAY_MS)) {
      if (!isWeekday(day)) continue;
      for (let hour = BUSINESS_START_HOUR; hour + durationMinutes / 60 <= BUSINESS_END_HOUR; hour++) {
        const start = new Date(day);
        start.setHours(hour, 0, 0, 0);
        if (start <= new Date()) continue;
        if (avoidStartTime && start.getTime() === new Date(avoidStartTime).getTime()) continue;
        const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

        const availability = await queryAvailability({
          organizationId,
          subProjectId,
          startTime: start,
          endTime: end,
          stakeholderIds: attendeeIds,
          extraMandatoryStakeholderIds: mandatoryIds,
          excludeCalendarEventId,
        });
        if (!availability.is_valid) continue; // hard constraint

        const daysOut = Math.round((start - rangeStart) / DAY_MS);
        candidates.push({
          start_time: start,
          end_time: end,
          availability,
          ...scoreCandidate(availability, { daysOut, hour, deadline: hasUsableDeadline ? deadlineDate : null }),
        });
      }
    }
    // Best score first; ties go to the earlier slot. At most one per day.
    candidates.sort((a, b) => b.score - a.score || a.start_time - b.start_time);
    const seenDays = new Set();
    const picked = [];
    for (const c of candidates) {
      const dayKey = c.start_time.toDateString();
      if (seenDays.has(dayKey)) continue;
      seenDays.add(dayKey);
      picked.push(c);
      if (picked.length === limit) break;
    }
    return picked;
  }

  const fullWindowEnd = new Date(rangeStart.getTime() + searchDays * DAY_MS);
  let afterDeadline = false;
  let slots = [];
  if (hasUsableDeadline) {
    slots = await search(new Date(Math.min(deadlineDate.getTime(), fullWindowEnd.getTime())));
  }
  if (slots.length === 0) {
    afterDeadline = Boolean(hasUsableDeadline);
    slots = await search(fullWindowEnd);
  }

  return { found: slots.length > 0, slots, deadline: deadlineDate, after_deadline: afterDeadline };
}
