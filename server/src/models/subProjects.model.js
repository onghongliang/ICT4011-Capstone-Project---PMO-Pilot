import { one, rows } from "../db/pool.js";
import { buildSetClause } from "../utils/validation.js";

export const UPDATABLE_COLUMNS = ["name", "code", "description", "status", "start_date", "end_date"];

// ids: optional visibility filter (null = all).
export function list({ organizationId, ids = null, status = null }) {
  const conditions = ["organization_id = $1"];
  const values = [organizationId];
  if (ids) {
    values.push(ids);
    conditions.push(`id = ANY($${values.length}::uuid[])`);
  }
  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }
  return rows(`SELECT * FROM sub_projects WHERE ${conditions.join(" AND ")} ORDER BY name`, values);
}

// Ordered by code, for the team structure page.
export function listByCode({ organizationId, ids = null }) {
  const values = [organizationId];
  let filter = "";
  if (ids) {
    values.push(ids);
    filter = `AND id = ANY($2::uuid[])`;
  }
  return rows(`SELECT id, name, code, status FROM sub_projects WHERE organization_id = $1 ${filter} ORDER BY code`, values);
}

export function findById(id) {
  return one(`SELECT * FROM sub_projects WHERE id = $1`, [id]);
}

export function findSummary(id) {
  return one(`SELECT id, name, code, status, description FROM sub_projects WHERE id = $1`, [id]);
}

export async function existsInOrganization(organizationId, id) {
  return Boolean(await one(`SELECT id FROM sub_projects WHERE organization_id = $1 AND id = $2`, [organizationId, id]));
}

export async function countInOrganization(organizationId, ids, db) {
  return (
    await rows(`SELECT id FROM sub_projects WHERE organization_id = $1 AND id = ANY($2::uuid[])`, [organizationId, ids], db)
  ).length;
}

export function create({ organizationId, name, code, description, status, startDate, endDate }) {
  return one(
    `INSERT INTO sub_projects (organization_id, name, code, description, status, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [organizationId, name, code, description, status, startDate, endDate]
  );
}

// Returns null when there's nothing to update, undefined when not found.
export async function update(id, changes) {
  const set = buildSetClause(changes, UPDATABLE_COLUMNS, 2);
  if (!set) return null;
  return (await one(`UPDATE sub_projects SET ${set.clause} WHERE id = $1 RETURNING *`, [id, ...set.values])) ?? undefined;
}

// Planning → active (on booking its kick-off). Returns whether it changed.
export async function activateIfPlanning(id, db) {
  return Boolean(
    await one(`UPDATE sub_projects SET status = 'active' WHERE id = $1 AND status = 'planning' RETURNING id`, [id], db)
  );
}

// One line per sub-project for the steering committee agenda.
export function statusSummaries(organizationId) {
  return rows(
    `SELECT sp.name, sp.code, sp.status,
            (SELECT min(m.due_date) FROM milestones m
             WHERE m.sub_project_id = sp.id AND m.status <> 'completed' AND m.due_date >= CURRENT_DATE) AS next_due,
            (SELECT count(*)::int FROM action_items ai
             WHERE ai.sub_project_id = sp.id AND ai.status NOT IN ('done', 'cancelled')) AS open_items
     FROM sub_projects sp WHERE sp.organization_id = $1 ORDER BY sp.code`,
    [organizationId]
  );
}
