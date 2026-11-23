import { assertCanRequest, createRequest, listRequests, resolveRequest } from "../services/meetingRequests.service.js";
import { ValidationError } from "../utils/errors.js";
import { requireString, requireUuid } from "../utils/validation.js";

// GET /api/meeting-requests?organization_id=...&status=...
export async function list(req, res) {
  const { organization_id: organizationId, status } = req.query;
  requireUuid(organizationId, "organization_id query parameter is required");
  res.json({ status: "ok", meeting_requests: await listRequests({ user: req.user, organizationId, status }) });
}

// POST /api/meeting-requests — a stakeholder asks the PMO for a meeting.
// Body: { organization_id, title, reason, sub_project_id? }
export async function create(req, res) {
  const { organization_id: organizationId, title, reason, sub_project_id: subProjectId = null } = req.body ?? {};
  assertCanRequest(req.user);
  requireUuid(organizationId, "organization_id is required");
  requireString(title, "title is required");
  requireString(reason, "reason is required");
  if (subProjectId !== null) requireUuid(subProjectId, "invalid sub_project_id");
  const meetingRequest = await createRequest({
    user: req.user,
    organizationId,
    subProjectId,
    title: title.trim(),
    reason: reason.trim(),
  });
  res.status(201).json({ status: "ok", meeting_request: meetingRequest });
}

// PATCH /api/meeting-requests/:id (PMO/admin) — resolve a pending request.
// Body: { status: "approved", calendar_event_id } or { status: "declined" }.
export async function resolve(req, res) {
  requireUuid(req.params.id, "invalid meeting_request id");
  const { status, calendar_event_id: calendarEventId = null } = req.body ?? {};
  if (!["approved", "declined"].includes(status)) throw new ValidationError("status must be approved or declined");
  if (status === "approved") requireUuid(calendarEventId, "calendar_event_id is required when approving");
  const meetingRequest = await resolveRequest({ user: req.user, id: req.params.id, status, calendarEventId });
  res.json({ status: "ok", meeting_request: meetingRequest });
}
