import * as SubProjects from "../models/subProjects.model.js";
import * as Teams from "../models/teams.model.js";
import { getOverview, listProjects } from "../services/projects.service.js";
import { NotFoundError, translateDbError, ValidationError } from "../utils/errors.js";
import { requireAllowed, requireString, requireUuid } from "../utils/validation.js";

const STATUS_CHECK = "sub_projects_status_check";
const DB_ERRORS = {
  23505: "a sub-project with this code already exists in this organization",
  23503: "organization_id was not found",
  23514: "end_date must not be before start_date",
};

// POST /api/sub-projects
export async function create(req, res) {
  const {
    organization_id: organizationId,
    name,
    code = null,
    description = null,
    status = "planning",
    start_date: startDate = null,
    end_date: endDate = null,
  } = req.body ?? {};
  requireUuid(organizationId, "organization_id is required");
  requireString(name, "name is required");
  await requireAllowed(status, STATUS_CHECK, "status");
  try {
    const subProject = await SubProjects.create({ organizationId, name, code, description, status, startDate, endDate });
    res.status(201).json({ status: "ok", sub_project: subProject });
  } catch (err) {
    translateDbError(err, DB_ERRORS);
  }
}

// GET /api/sub-projects?organization_id=...&status=... — only the projects
// the user may see; can_view_details says whether they may open one.
export async function list(req, res) {
  const { organization_id: organizationId, status } = req.query;
  requireUuid(organizationId, "organization_id query parameter is required");
  if (status) await requireAllowed(status, STATUS_CHECK, "status");
  const { subProjects, canViewDetails } = await listProjects({ user: req.user, organizationId, status });
  res.json({ status: "ok", sub_projects: subProjects, can_view_details: canViewDetails });
}

// GET /api/sub-projects/:id/overview — the project detail page (oversight only).
export async function overview(req, res) {
  requireUuid(req.params.id, "invalid sub_project id");
  const o = await getOverview({ user: req.user, subProjectId: req.params.id });
  res.json({
    status: "ok",
    sub_project: o.subProject,
    leadership: o.leadership,
    members: o.members,
    milestones: o.milestones,
    action_items: o.actionItems,
    meetings: o.meetings,
  });
}

// GET /api/sub-projects/:id
export async function get(req, res) {
  requireUuid(req.params.id, "invalid sub_project id");
  const subProject = await SubProjects.findById(req.params.id);
  if (!subProject) throw new NotFoundError("sub_project not found");
  res.json({ status: "ok", sub_project: subProject });
}

// GET /api/sub-projects/:id/roles — current leadership (Project Lead, PIC, …).
export async function roles(req, res) {
  requireUuid(req.params.id, "invalid sub_project id");
  res.json({ status: "ok", roles: await Teams.rolesOf(req.params.id) });
}

// GET /api/sub-projects/:id/members — team members beyond the leadership.
export async function members(req, res) {
  requireUuid(req.params.id, "invalid sub_project id");
  res.json({ status: "ok", members: await Teams.membersOf(req.params.id) });
}

// PATCH /api/sub-projects/:id — no DELETE: retire one with status
// "cancelled", since deleting would cascade away its history.
export async function update(req, res) {
  requireUuid(req.params.id, "invalid sub_project id");
  if (req.body?.status !== undefined) await requireAllowed(req.body.status, STATUS_CHECK, "status");
  let subProject;
  try {
    subProject = await SubProjects.update(req.params.id, req.body ?? {});
  } catch (err) {
    translateDbError(err, DB_ERRORS);
  }
  if (subProject === null) throw new ValidationError("no updatable fields provided");
  if (!subProject) throw new NotFoundError("sub_project not found");
  res.json({ status: "ok", sub_project: subProject });
}
