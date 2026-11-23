import { one, rows } from "../db/pool.js";
import { buildSetClause } from "../utils/validation.js";

export const UPDATABLE_COLUMNS = ["full_name", "email", "phone", "title", "is_active"];

// ids: optional visibility filter (null = everyone).
export function list({ organizationId, isActive = null, ids = null }) {
  const conditions = ["organization_id = $1"];
  const values = [organizationId];
  if (isActive !== null) {
    values.push(isActive);
    conditions.push(`is_active = $${values.length}`);
  }
  if (ids) {
    values.push(ids);
    conditions.push(`id = ANY($${values.length}::uuid[])`);
  }
  return rows(`SELECT * FROM stakeholders WHERE ${conditions.join(" AND ")} ORDER BY full_name`, values);
}

export function findById(id) {
  return one(`SELECT * FROM stakeholders WHERE id = $1`, [id]);
}

export function create({ organizationId, fullName, email, phone = null, title = null }, db) {
  return one(
    `INSERT INTO stakeholders (organization_id, full_name, email, phone, title)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [organizationId, fullName, email, phone, title],
    db
  );
}

// Returns null when there's nothing to update, undefined when not found.
export async function update(id, changes) {
  const set = buildSetClause(changes, UPDATABLE_COLUMNS, 2);
  if (!set) return null;
  return (await one(`UPDATE stakeholders SET ${set.clause} WHERE id = $1 RETURNING *`, [id, ...set.values])) ?? undefined;
}

// Soft delete: stakeholders are referenced by historical meetings, roles
// and action items, which should keep their FK target.
export function deactivate(id) {
  return one(`UPDATE stakeholders SET is_active = false WHERE id = $1 RETURNING *`, [id]);
}

export async function countInOrganization(organizationId, ids) {
  return (
    await rows(`SELECT id FROM stakeholders WHERE organization_id = $1 AND id = ANY($2::uuid[])`, [organizationId, ids])
  ).length;
}

// Name + email for sending invites.
export function findContacts(ids) {
  return rows(`SELECT id, full_name, email FROM stakeholders WHERE id = ANY($1::uuid[])`, [ids]);
}

export function findNamesInOrganization(organizationId, ids) {
  return rows(`SELECT id, full_name FROM stakeholders WHERE organization_id = $1 AND id = ANY($2::uuid[])`, [
    organizationId,
    ids,
  ]);
}

// Active people on no team and not in the PMO office or the sponsor seat.
export function findUnassigned(organizationId) {
  return rows(
    `SELECT sh.id, sh.full_name, sh.title, sh.email, sh.phone FROM stakeholders sh
     WHERE sh.organization_id = $1 AND sh.is_active
       AND sh.id NOT IN (SELECT stakeholder_id FROM sub_project_roles WHERE effective_to IS NULL)
       AND sh.id NOT IN (SELECT stakeholder_id FROM sub_project_members)
       AND sh.id NOT IN (SELECT stakeholder_id FROM users WHERE role = 'pmo' AND stakeholder_id IS NOT NULL)
       AND sh.id IS DISTINCT FROM (SELECT sponsor_stakeholder_id FROM organizations WHERE id = $1)
     ORDER BY sh.full_name`,
    [organizationId]
  );
}
