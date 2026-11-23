import { calendarEventBus, EVENTS } from "../integrations/eventBus.js";
import * as Attendees from "../models/attendees.model.js";
import { getProjectContext } from "./context.service.js";
import { recommendSlots } from "./recommendation.service.js";

// Rescheduling flow (disruption handling), triggered by a decline:
//   1. criticality check — is the decliner a mandatory attendee?
//   2. conflict attribution — who and why is already on the attendee row
//      (decline_reason), recorded when they responded;
//   3. slot re-calculation — for a critical decline, proactively find the
//      best alternatives where every mandatory attendee (including the
//      decliner) is free, within the next milestone deadline;
//   4. the results are stored on the attendee row, so the PMO's decline
//      card shows them immediately (proactive re-coordination).
// A non-critical decline is recorded but needs no reschedule.
export async function handleDecline({ calendarEventId, stakeholderId }) {
  const decline = await Attendees.findDecline(calendarEventId, stakeholderId);
  if (!decline || decline.status !== "scheduled") return;

  const critical = decline.is_mandatory;
  let alternatives = null;
  if (critical) {
    const attendees = await Attendees.basicFor(calendarEventId);
    const context = decline.sub_project_id ? await getProjectContext(decline.sub_project_id) : null;
    const recommendation = await recommendSlots({
      organizationId: decline.organization_id,
      subProjectId: decline.sub_project_id,
      attendeeStakeholderIds: attendees.map((a) => a.stakeholder_id),
      mandatoryStakeholderIds: [...attendees.filter((a) => a.is_mandatory).map((a) => a.stakeholder_id), stakeholderId],
      durationMinutes: (decline.end_time - decline.start_time) / 60000,
      excludeCalendarEventId: calendarEventId,
      avoidStartTime: decline.start_time,
      deadline: context?.next_deadline ?? null,
    });
    alternatives = {
      computed_at: new Date(),
      deadline: recommendation.deadline,
      after_deadline: recommendation.after_deadline,
      slots: recommendation.slots.map(({ availability: _availability, ...slot }) => slot),
    };
  }
  await Attendees.saveDeclineAssessment(calendarEventId, stakeholderId, { critical, alternatives });
}

export function registerDisruptionHandlers() {
  calendarEventBus.on(EVENTS.ATTENDEE_DECLINED, (payload) => {
    handleDecline(payload).catch((err) => console.error("Disruption handler failed:", err.message));
  });
}
