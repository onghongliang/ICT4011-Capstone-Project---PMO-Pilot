import { one, rows } from "../db/pool.js";
import { buildSetClause } from "../utils/validation.js";

export const UPDATABLE_COLUMNS = ["title", "description", "milestone_id", "assignee_stakeholder_id", "status", "priority", "due_date"];

// filters: { sub_project_id, milestone_id, assignee_stakeholder_id } (column → value).
// subProjectIds: optional visibility filter (null = all).
export function list({ organizationId, subProjectIds = null, filters = {}, status = null }) {
  const conditions = ["organization_id = $1"];
  const values = [organizationId];
  if (subProjectIds) {
    values.push(subProjectIds);
    conditions.push(`sub_project_id = ANY($${values.length}::uuid[])`);
  }
  for (const [column, value] of Object.entries(filters)) {
    values.push(value);
    conditions.push(`${column} = $${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }
  return rows(
    `SELECT * FROM action_items WHERE ${conditions.join(" AND ")} ORDER BY due_date NULLS LAST, priority`,
    values
  );
}

export function forSubProject(subProjectId) {
  return rows(
    `SELECT ai.*, sh.full_name AS assignee_name
     FROM action_items ai LEFT JOIN stakeholders sh ON sh.id = ai.assignee_stakeholder_id
     WHERE ai.sub_project_id = $1 ORDER BY ai.due_date NULLS LAST`,
    [subProjectId]
  );
}

export function openFor(subProjectId) {
  return rows(
    `SELECT ai.title, ai.priority, ai.due_date, ai.status, sh.full_name AS assignee_name
     FROM action_items ai LEFT JOIN stakeholders sh ON sh.id = ai.assignee_stakeholder_id
     WHERE ai.sub_project_id = $1 AND ai.status NOT IN ('done', 'cancelled')`,
    [subProjectId]
  );
}

export function findById(id) {
  return one(`SELECT * FROM action_items WHERE id = $1`, [id]);
}

export function create(item) {
  return one(
    `INSERT INTO action_items (organization_id, sub_project_id, milestone_id, title, description, assignee_stakeholder_id, status, priority, due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      item.organizationId,
      item.subProjectId,
      item.milestoneId,
      item.title,
      item.description,
      item.assigneeStakeholderId,
      item.status,
      item.priority,
      item.dueDate,
    ]
  );
}

// Returns null when there's nothing to update, undefined when not found.
export async function update(id, changes) {
  const set = buildSetClause(changes, UPDATABLE_COLUMNS, 2);
  if (!set) return null;
  return (await one(`UPDATE action_items SET ${set.clause} WHERE id = $1 RETURNING *`, [id, ...set.values])) ?? undefined;
}

export async function remove(id) {
  return Boolean(await one(`DELETE FROM action_items WHERE id = $1 RETURNING id`, [id]));
}
