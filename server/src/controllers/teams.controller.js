import { getTeamStructure, steercoAttendees } from "../services/teams.service.js";
import { requireUuid } from "../utils/validation.js";

// GET /api/teams?organization_id=... — the team structure the user may see.
export async function structure(req, res) {
  requireUuid(req.query.organization_id, "organization_id query parameter is required");
  res.json({ status: "ok", ...(await getTeamStructure({ organizationId: req.query.organization_id, user: req.user })) });
}

// GET /api/teams/steerco?organization_id=... (PMO/admin) — who a steering
// committee involves (Project Sponsor, Project Lead, Process Owners).
export async function steerco(req, res) {
  requireUuid(req.query.organization_id, "organization_id query parameter is required");
  res.json({ status: "ok", attendees: await steercoAttendees(req.query.organization_id) });
}
