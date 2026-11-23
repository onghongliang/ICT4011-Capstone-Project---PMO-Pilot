import * as ActionItems from "../models/actionItems.model.js";
import { visibleSubProjectIds } from "../services/access.service.js";
import { NotFoundError, translateDbError, ValidationError } from "../utils/errors.js";
import { requireAllowed, requireString, requireUuid } from "../utils/validation.js";

const STATUS_CHECK = "action_items_status_check";
const PRIORITY_CHECK = "action_items_priority_check";

// POST /api/action-items
export async function create(req, res) {
  const {
    organization_id: organizationId,
    sub_project_id: subProjectId,
    milestone_id: milestoneId = null,
    title,
    description = null,
    assignee_stakeholder_id: assigneeStakeholderId = null,
    status = "open",
    priority = "medium",
    due_date: dueDate = null,
  } = req.body ?? {};
  requireUuid(organizationId, "organization_id is required");
  requireUuid(subProjectId, "sub_project_id is required");
  requireString(title, "title is required");
  await requireAllowed(status, STATUS_CHECK, "status");
  await requireAllowed(priority, PRIORITY_CHECK, "priority");
  try {
    const actionItem = await ActionItems.create({
      organizationId,
      subProjectId,
      milestoneId,
      title,
      description,
      assigneeStakeholderId,
      status,
      priority,
      dueDate,
    });
    res.status(201).json({ status: "ok", action_item: actionItem });
  } catch (err) {
    translateDbError(err, {
      23503: "organization_id, sub_project_id, milestone_id, or assignee_stakeholder_id was not found",
    });
  }
}

// GET /api/action-items?organization_id=...&sub_project_id=...&milestone_id=...
// &assignee_stakeholder_id=...&status=... — only for the projects the user may see.
export async function list(req, res) {
  const { organization_id: organizationId, status } = req.query;
  requireUuid(organizationId, "organization_id query parameter is required");
  const filters = {};
  for (const column of ["sub_project_id", "milestone_id", "assignee_stakeholder_id"]) {
    if (req.query[column] === undefined) continue;
    filters[column] = requireUuid(req.query[column], `invalid ${column}`);
  }
  if (status) await requireAllowed(status, STATUS_CHECK, "status");
  const actionItems = await ActionItems.list({
    organizationId,
    subProjectIds: await visibleSubProjectIds(req.user),
    filters,
    status: status || null,
  });
  res.json({ status: "ok", action_items: actionItems });
}

// GET /api/action-items/:id
export async function get(req, res) {
  requireUuid(req.params.id, "invalid action_item id");
  const actionItem = await ActionItems.findById(req.params.id);
  if (!actionItem) throw new NotFoundError("action_item not found");
  res.json({ status: "ok", action_item: actionItem });
}

// PATCH /api/action-items/:id
export async function update(req, res) {
  requireUuid(req.params.id, "invalid action_item id");
  if (req.body?.status !== undefined) await requireAllowed(req.body.status, STATUS_CHECK, "status");
  if (req.body?.priority !== undefined) await requireAllowed(req.body.priority, PRIORITY_CHECK, "priority");
  let actionItem;
  try {
    actionItem = await ActionItems.update(req.params.id, req.body ?? {});
  } catch (err) {
    translateDbError(err, { 23503: "milestone_id or assignee_stakeholder_id was not found" });
  }
  if (actionItem === null) throw new ValidationError("no updatable fields provided");
  if (!actionItem) throw new NotFoundError("action_item not found");
  res.json({ status: "ok", action_item: actionItem });
}

// DELETE /api/action-items/:id
export async function remove(req, res) {
  requireUuid(req.params.id, "invalid action_item id");
  if (!(await ActionItems.remove(req.params.id))) throw new NotFoundError("action_item not found");
  res.status(204).send();
}
