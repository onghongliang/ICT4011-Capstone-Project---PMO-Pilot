import * as Attendees from "../models/attendees.model.js";
import { dismissDecline, respond } from "../services/invitations.service.js";
import { ForbiddenError, ValidationError } from "../utils/errors.js";
import { requireUuid } from "../utils/validation.js";

// GET /api/invitations — the user's upcoming invitations (empty for admin,
// who isn't a stakeholder).
export async function listMine(req, res) {
  const invitations = req.user.stakeholder_id ? await Attendees.invitationsFor(req.user.stakeholder_id) : [];
  res.json({ status: "ok", invitations });
}

// GET /api/invitations/declines?organization_id=... (PMO/admin) — open declines
// with reason, suggested time, criticality and precomputed alternatives.
export async function listDeclines(req, res) {
  requireUuid(req.query.organization_id, "organization_id query parameter is required");
  res.json({ status: "ok", declines: await Attendees.openDeclines(req.query.organization_id) });
}

// POST /api/invitations/declines/:attendeeId/dismiss (PMO/admin) — keep the
// meeting as scheduled.
export async function dismiss(req, res) {
  requireUuid(req.params.attendeeId, "invalid attendee id");
  await dismissDecline(req.params.attendeeId);
  res.json({ status: "ok" });
}

// PATCH /api/invitations/:calendarEventId — accept, or decline with a reason
// and an optional suggested time.
export async function update(req, res) {
  requireUuid(req.params.calendarEventId, "invalid calendar_event id");
  const { response_status: responseStatus, decline_reason: declineReason = null, suggested_start_time: suggested = null } =
    req.body ?? {};
  if (!["accepted", "declined"].includes(responseStatus)) {
    throw new ValidationError("response_status must be accepted or declined");
  }
  if (!req.user.stakeholder_id) throw new ForbiddenError("this account isn't invited to meetings");

  const invitation = await respond({
    calendarEventId: req.params.calendarEventId,
    stakeholderId: req.user.stakeholder_id,
    responseStatus,
    declineReason,
    suggestedStartRaw: suggested,
  });
  res.json({ status: "ok", invitation });
}
