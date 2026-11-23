import * as Stakeholders from "../models/stakeholders.model.js";
import { visibleStakeholderIds } from "../services/access.service.js";
import { NotFoundError, translateDbError, ValidationError } from "../utils/errors.js";
import { requireString, requireUuid } from "../utils/validation.js";

const DUPLICATE_EMAIL = "a stakeholder with this email already exists in this organization";

// POST /api/stakeholders (PMO/admin)
export async function create(req, res) {
  const { organization_id: organizationId, full_name: fullName, email, phone = null, title = null } = req.body ?? {};
  requireUuid(organizationId, "organization_id is required");
  requireString(fullName, "full_name is required");
  requireString(email, "email is required");
  try {
    const stakeholder = await Stakeholders.create({ organizationId, fullName, email, phone, title });
    res.status(201).json({ status: "ok", stakeholder });
  } catch (err) {
    translateDbError(err, { 23505: DUPLICATE_EMAIL, 23503: "organization_id was not found" });
  }
}

// GET /api/stakeholders?organization_id=...&is_active=true — only the people
// the user may see.
export async function list(req, res) {
  const { organization_id: organizationId, is_active: isActiveRaw } = req.query;
  requireUuid(organizationId, "organization_id query parameter is required");
  const visible = await visibleStakeholderIds(req.user);
  const stakeholders = await Stakeholders.list({
    organizationId,
    isActive: isActiveRaw === "true" || isActiveRaw === "false" ? isActiveRaw === "true" : null,
    ids: visible ? [...visible] : null,
  });
  res.json({ status: "ok", stakeholders });
}

// GET /api/stakeholders/:id — someone outside your teams is reported as
// not found (not forbidden), so the API doesn't confirm who exists.
export async function get(req, res) {
  requireUuid(req.params.id, "invalid stakeholder id");
  const [visible, stakeholder] = await Promise.all([visibleStakeholderIds(req.user), Stakeholders.findById(req.params.id)]);
  if (!stakeholder || (visible && !visible.has(req.params.id))) throw new NotFoundError("stakeholder not found");
  res.json({ status: "ok", stakeholder });
}

// PATCH /api/stakeholders/:id (PMO/admin)
export async function update(req, res) {
  requireUuid(req.params.id, "invalid stakeholder id");
  let stakeholder;
  try {
    stakeholder = await Stakeholders.update(req.params.id, req.body ?? {});
  } catch (err) {
    translateDbError(err, { 23505: DUPLICATE_EMAIL });
  }
  if (stakeholder === null) throw new ValidationError("no updatable fields provided");
  if (!stakeholder) throw new NotFoundError("stakeholder not found");
  res.json({ status: "ok", stakeholder });
}

// DELETE /api/stakeholders/:id (PMO/admin) — soft delete.
export async function deactivate(req, res) {
  requireUuid(req.params.id, "invalid stakeholder id");
  const stakeholder = await Stakeholders.deactivate(req.params.id);
  if (!stakeholder) throw new NotFoundError("stakeholder not found");
  res.json({ status: "ok", stakeholder });
}
