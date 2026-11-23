import { queryAvailability } from "./availability.service.js";
import { withStandingAttendees } from "./recommendation.service.js";

const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 17;

function isWeekday(date) {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  return day >= 1 && day <= 5;
}

// First-fit search (POST /api/scheduling/find-slot): the earliest weekday
// business-hours slot where every attendee is free, falling back to the
// earliest where just the mandatory ones are (reporting who'd miss it).
// Uses queryAvailability(), so a slot it returns passes the same check the
// booking endpoint re-runs. The chats use the ranked recommendSlots()
// instead; this stays for callers that just want the earliest slot, e.g. a
// future LLM agent's tool.
export async function findNextAvailableSlot({
  organizationId,
  subProjectId = null,
  attendeeStakeholderIds,
  durationMinutes = 60,
  searchFromDate = null,
  searchDays = 14,
  // Attendees who must be free on top of the sub-project's mandatory roles
  // (e.g. a meeting's requester, or someone who declined and is being
  // rescheduled around).
  mandatoryStakeholderIds = [],
  // When moving an existing meeting, ignore it so its attendees don't
  // appear busy in their own current slot.
  excludeCalendarEventId = null,
}) {
  ({ attendeeIds: attendeeStakeholderIds, mandatoryIds: mandatoryStakeholderIds } = await withStandingAttendees(
    organizationId,
    attendeeStakeholderIds,
    mandatoryStakeholderIds
  ));

  const rangeStart = searchFromDate ? new Date(searchFromDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  rangeStart.setHours(0, 0, 0, 0);

  const durationHours = durationMinutes / 60;
  let fallback = null; // earliest slot where only the mandatory attendees are free

  for (let dayOffset = 0; dayOffset < searchDays; dayOffset++) {
    const day = new Date(rangeStart);
    day.setDate(day.getDate() + dayOffset);
    if (!isWeekday(day)) continue;

    for (let hour = BUSINESS_START_HOUR; hour + durationHours <= BUSINESS_END_HOUR; hour++) {
      const candidateStart = new Date(day);
      candidateStart.setHours(hour, 0, 0, 0);
      const candidateEnd = new Date(candidateStart.getTime() + durationMinutes * 60 * 1000);

      const availability = await queryAvailability({
        organizationId,
        subProjectId,
        startTime: candidateStart,
        endTime: candidateEnd,
        stakeholderIds: attendeeStakeholderIds,
        extraMandatoryStakeholderIds: mandatoryStakeholderIds,
        excludeCalendarEventId,
      });

      if (!availability.is_valid) continue;
      const slot = { found: true, start_time: candidateStart, end_time: candidateEnd, availability };
      if (availability.stakeholders.every((s) => s.is_free)) {
        return { ...slot, everyone_free: true, unavailable: [] };
      }
      fallback ??= slot;
    }
  }

  if (!fallback) return { found: false };
  return {
    ...fallback,
    everyone_free: false,
    unavailable: fallback.availability.stakeholders
      .filter((s) => !s.is_free)
      .map((s) => ({ stakeholder_id: s.stakeholder_id, full_name: s.full_name, conflict: s.conflicts[0]?.title ?? null })),
  };
}
