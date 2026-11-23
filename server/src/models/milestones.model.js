import { one, rows } from "../db/pool.js";
import { buildSetClause } from "../utils/validation.js";

export const UPDATABLE_COLUMNS = ["name", "description", "due_date", "status"];

// subProjectIds: optional visibility filter (null = all).
export function list({ organizationId, subProjectIds = null, subProjectId = null, status = null }) {
  const conditions = ["organization_id = $1"];
  const values = [organizationId];
  if (subProjectIds) {
    values.push(subProjectIds);
    conditions.push(`sub_project_id = ANY($${values.length}::uuid[])`);
  }
  if (subProjectId) {
    values.push(subProjectId);
    conditions.push(`sub_project_id = $${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }
  return rows(`SELECT * FROM milestones WHERE ${conditions.join(" AND ")} ORDER BY due_date`, values);
}

export function forSubProject(subProjectId) {
  return rows(`SELECT * FROM milestones WHERE sub_project_id = $1 ORDER BY due_date`, [subProjectId]);
}

// Not yet completed and not past due: what a meeting should land before.
export function upcomingFor(subProjectId) {
  return rows(
    `SELECT name, due_date, status FROM milestones
     WHERE sub_project_id = $1 AND status NOT IN ('completed') AND due_date >= CURRENT_DATE
     ORDER BY due_date`,
    [subProjectId]
  );
}

export function findById(id) {
  return one(`SELECT * FROM milestones WHERE id = $1`, [id]);
}

export function create({ organizationId, subProjectId, name, description, dueDate, status }) {
  return one(
    `INSERT INTO milestones (organization_id, sub_project_id, name, description, due_date, status)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [organizationId, subProjectId, name, description, dueDate, status]
  );
}

// Returns null when there's nothing to update, undefined when not found.
export async function update(id, changes) {
  const set = buildSetClause(changes, UPDATABLE_COLUMNS, 2);
  if (!set) return null;
  return (await one(`UPDATE milestones SET ${set.clause} WHERE id = $1 RETURNING *`, [id, ...set.values])) ?? undefined;
}

// Linked action items keep existing (milestone_id is ON DELETE SET NULL).
export async function remove(id) {
  return Boolean(await one(`DELETE FROM milestones WHERE id = $1 RETURNING id`, [id]));
}
