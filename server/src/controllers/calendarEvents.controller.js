import * as Attendees from "../models/attendees.model.js";
import * as CalendarEvents from "../models/calendarEvents.model.js";
import { bookMeeting, cancelMeeting, rescheduleMeeting } from "../services/meetings.service.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { requireAllowed, requireTimeRange, requireUuid, requireUuidArray, trimmedOrNull } from "../utils/validation.js";

// GET /api/calendar-events?organization_id=...&start=...&end=...&sub_project_id=...
// Non-cancelled meetings, optionally within the calendar's visible window.
export async function list(req, res) {
  const { organization_id: organizationId, start, end, sub_project_id: subProjectId } = req.query;
  requireUuid(organizationId, "organization_id query parameter is required");
  if (subProjectId) requireUuid(subProjectId, "invalid sub_project_id");
  const calendarEvents = await CalendarEvents.list({ organizationId, start, end, subProjectId });
  res.json({ status: "ok", calendar_events: calendarEvents });
}

// GET /api/calendar-events/:id — one meeting with its attendees.
export async function get(req, res) {
  requireUuid(req.params.id, "invalid calendar_event id");
  const calendarEvent = await CalendarEvents.findById(req.params.id);
  if (!calendarEvent) throw new NotFoundError("calendar_event not found");
  res.json({ status: "ok", calendar_event: calendarEvent, attendees: await Attendees.detailedFor(req.params.id) });
}

// Booking body attendees → [{ stakeholderId, isMandatory?, roleTypeId? }].
// A steering committee's attendees are decided server-side, so it needs none.
function parseAttendees(raw, isSteerco) {
  if (isSteerco) return [];
  if (!Array.isArray(raw) || raw.length === 0) throw new ValidationError("attendees must be a non-empty array");
  const attendees = raw.map((a) => {
    if (!a || typeof a.stakeholder_id !== "string") throw new ValidationError("each attendee requires a stakeholder_id");
    return {
      stakeholderId: a.stakeholder_id,
      isMandatory: typeof a.is_mandatory === "boolean" ? a.is_mandatory : undefined,
      roleTypeId: a.role_type_id ?? undefined,
    };
  });
  if (new Set(attendees.map((a) => a.stakeholderId)).size !== attendees.length) {
    throw new ValidationError("duplicate stakeholder_id in attendees");
  }
  return attendees;
}

// POST /api/calendar-events (PMO/admin) — books only if every mandatory
// attendee is free; otherwise 409 with the availability attribution.
export async function book(req, res) {
  const body = req.body ?? {};
  const meetingType = body.meeting_type ?? null;
  if (!body.organization_id) throw new ValidationError("organization_id is required");
  if (!body.title || typeof body.title !== "string") throw new ValidationError("title is required");
  if (meetingType !== null) await requireAllowed(meetingType, "calendar_events_meeting_type_check", "meeting_type");
  const attendees = parseAttendees(body.attendees, meetingType === "steering_committee");
  const { startTime, endTime } = requireTimeRange(body.start_time, body.end_time);

  const result = await bookMeeting({
    organizationId: body.organization_id,
    subProjectId: body.sub_project_id ?? null,
    title: body.title,
    description: body.description ?? null,
    meetingType,
    startTime,
    endTime,
    location: body.location ?? null,
    // Defaults to the logged-in PMO officer (null for admin).
    createdByStakeholderId: body.created_by_stakeholder_id ?? req.user?.stakeholder_id ?? null,
    attendees,
  });
  if (!result.booked) return res.status(409).json({ status: "conflict", availability: result.availability });
  res.status(201).json({
    status: "ok",
    event: result.event,
    attendees: result.attendees,
    invites: result.invites,
    sub_project_activated: result.subProjectActivated,
  });
}

// POST /api/calendar-events/:id/cancel (PMO/admin). Body: { reason? }
export async function cancel(req, res) {
  requireUuid(req.params.id, "invalid calendar_event id");
  const { event, invites } = await cancelMeeting({
    calendarEventId: req.params.id,
    reason: trimmedOrNull(req.body?.reason),
    cancelledByStakeholderId: req.user.stakeholder_id ?? null,
  });
  res.json({ status: "ok", event, invites });
}

// POST /api/calendar-events/:id/reschedule (PMO/admin).
// Body: { start_time, end_time, mandatory_stakeholder_ids?, reason? } —
// extra people who must be free (e.g. whoever declined), and why it moved.
export async function reschedule(req, res) {
  requireUuid(req.params.id, "invalid calendar_event id");
  const { start_time: start, end_time: end, mandatory_stakeholder_ids: extraMandatory = [], reason = null } = req.body ?? {};
  const { startTime, endTime } = requireTimeRange(start, end);
  requireUuidArray(extraMandatory, "mandatory_stakeholder_ids must be an array of ids");

  const result = await rescheduleMeeting({
    calendarEventId: req.params.id,
    startTime,
    endTime,
    extraMandatoryStakeholderIds: extraMandatory,
    reason: trimmedOrNull(reason),
  });
  if (!result.rescheduled) return res.status(409).json({ status: "conflict", availability: result.availability });
  res.json({ status: "ok", event: result.event, invites: result.invites });
}
