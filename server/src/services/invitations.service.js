import { calendarEventBus, EVENTS } from "../integrations/eventBus.js";
import * as Attendees from "../models/attendees.model.js";
import * as CalendarEvents from "../models/calendarEvents.model.js";
import { ConflictError, NotFoundError, ValidationError } from "../utils/errors.js";
import { requireString } from "../utils/validation.js";

// An attendee accepts or declines. Declining needs a reason and may suggest
// a better time (keeping the meeting's length). A decline is published on
// the event bus, where the disruption handler assesses it after this
// returns.
export async function respond({ calendarEventId, stakeholderId, responseStatus, declineReason, suggestedStartRaw }) {
  const event = await CalendarEvents.findById(calendarEventId);
  if (event?.status === "cancelled") throw new ConflictError("this meeting has been cancelled");
  if (responseStatus === "declined") requireString(declineReason, "decline_reason is required when declining");

  let suggestedStart = null;
  let suggestedEnd = null;
  if (responseStatus === "declined" && suggestedStartRaw) {
    suggestedStart = new Date(suggestedStartRaw);
    if (Number.isNaN(suggestedStart.getTime())) {
      throw new ValidationError("suggested_start_time must be a valid ISO timestamp");
    }
    if (suggestedStart <= new Date()) throw new ValidationError("suggested time must be in the future");
    if (event) suggestedEnd = new Date(suggestedStart.getTime() + (event.end_time - event.start_time));
  }

  const invitation = await Attendees.respond({
    calendarEventId,
    stakeholderId,
    responseStatus,
    declineReason: responseStatus === "declined" ? declineReason.trim() : null,
    suggestedStart,
    suggestedEnd,
  });
  if (!invitation) throw new NotFoundError("you're not invited to this meeting");

  if (responseStatus === "declined") {
    calendarEventBus.emit(EVENTS.ATTENDEE_DECLINED, { calendarEventId, stakeholderId });
  }
  return invitation;
}

export async function dismissDecline(attendeeId) {
  if (!(await Attendees.dismissDecline(attendeeId))) throw new NotFoundError("open decline not found");
}
