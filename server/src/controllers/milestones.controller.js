import * as Milestones from "../models/milestones.model.js";
import { visibleSubProjectIds } from "../services/access.service.js";
import { NotFoundError, translateDbError, ValidationError } from "../utils/errors.js";
import { requireAllowed, requireString, requireUuid } from "../utils/validation.js";

const STATUS_CHECK = "milestones_status_check";

// POST /api/milestones
export async function create(req, res) {
  const {
    organization_id: organizationId,
    sub_project_id: subProjectId,
    name,
    description = null,
    due_date: dueDate,
    status = "pending",
  } = req.body ?? {};
  requireUuid(organizationId, "organization_id is required");
  requireUuid(subProjectId, "sub_project_id is required");
  requireString(name, "name is required");
  requireString(dueDate, "due_date is required");
  await requireAllowed(status, STATUS_CHECK, "status");
  try {
    const milestone = await Milestones.create({ organizationId, subProjectId, name, description, dueDate, status });
    res.status(201).json({ status: "ok", milestone });
  } catch (err) {
    translateDbError(err, { 23503: "organization_id or sub_project_id was not found" });
  }
}

// GET /api/milestones?organization_id=...&sub_project_id=...&status=... —
// only for the projects the user may see.
export async function list(req, res) {
  const { organization_id: organizationId, sub_project_id: subProjectId, status } = req.query;
  requireUuid(organizationId, "organization_id query parameter is required");
  if (subProjectId) requireUuid(subProjectId, "invalid sub_project_id");
  if (status) await requireAllowed(status, STATUS_CHECK, "status");
  const milestones = await Milestones.list({
    organizationId,
    subProjectIds: await visibleSubProjectIds(req.user),
    subProjectId: subProjectId || null,
    status: status || null,
  });
  res.json({ status: "ok", milestones });
}

// GET /api/milestones/:id
export async function get(req, res) {
  requireUuid(req.params.id, "invalid milestone id");
  const milestone = await Milestones.findById(req.params.id);
  if (!milestone) throw new NotFoundError("milestone not found");
  res.json({ status: "ok", milestone });
}

// PATCH /api/milestones/:id
export async function update(req, res) {
  requireUuid(req.params.id, "invalid milestone id");
  if (req.body?.status !== undefined) await requireAllowed(req.body.status, STATUS_CHECK, "status");
  const milestone = await Milestones.update(req.params.id, req.body ?? {});
  if (milestone === null) throw new ValidationError("no updatable fields provided");
  if (!milestone) throw new NotFoundError("milestone not found");
  res.json({ status: "ok", milestone });
}

// DELETE /api/milestones/:id — linked action items just lose their milestone.
export async function remove(req, res) {
  requireUuid(req.params.id, "invalid milestone id");
  if (!(await Milestones.remove(req.params.id))) throw new NotFoundError("milestone not found");
  res.status(204).send();
}
