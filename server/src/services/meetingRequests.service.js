import { isPmo } from "../middleware/requireRole.js";
import * as MeetingRequests from "../models/meetingRequests.model.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";

// PMO/admin see every request (their incoming queue); a stakeholder sees
// only the requests they sent.
export function listRequests({ user, organizationId, status }) {
  return MeetingRequests.list({
    organizationId,
    requestedBy: isPmo(user) ? null : user.stakeholder_id,
    status: status || null,
  });
}

// Only accounts tied to a person (not the admin) can ask for meetings.
export function assertCanRequest(user) {
  if (!user.stakeholder_id) throw new ForbiddenError("only stakeholder accounts can request meetings");
}

export function createRequest({ user, organizationId, subProjectId, title, reason }) {
  assertCanRequest(user);
  return MeetingRequests.create({ organizationId, requestedBy: user.stakeholder_id, subProjectId, title, reason });
}

// Approve (linking the meeting booked for it) or decline a pending request.
export async function resolveRequest({ user, id, status, calendarEventId }) {
  const resolved = await MeetingRequests.resolve(id, {
    status,
    calendarEventId: status === "approved" ? calendarEventId : null,
    handledBy: user.stakeholder_id ?? null,
  });
  if (!resolved) throw new NotFoundError("pending meeting_request not found");
  return MeetingRequests.findById(id);
}
