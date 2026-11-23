import * as Organizations from "../models/organizations.model.js";
import { NotFoundError, translateDbError } from "../utils/errors.js";
import { requireString, requireUuid } from "../utils/validation.js";

// POST /api/organizations — not needed by the single-org seed, but keeps the
// multi-tenant schema usable.
export async function create(req, res) {
  const { name, slug, timezone = "UTC" } = req.body ?? {};
  requireString(name, "name is required");
  requireString(slug, "slug is required");
  try {
    res.status(201).json({ status: "ok", organization: await Organizations.create({ name, slug, timezone }) });
  } catch (err) {
    translateDbError(err, { 23505: "slug already exists" });
  }
}

// GET /api/organizations
export async function list(req, res) {
  res.json({ status: "ok", organizations: await Organizations.list() });
}

// GET /api/organizations/:id
export async function get(req, res) {
  requireUuid(req.params.id, "invalid organization id");
  const organization = await Organizations.findById(req.params.id);
  if (!organization) throw new NotFoundError("organization not found");
  res.json({ status: "ok", organization });
}
