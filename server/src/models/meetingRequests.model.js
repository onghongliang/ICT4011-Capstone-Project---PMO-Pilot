import { one, rows } from "../db/pool.js";

const SELECT_REQUESTS = `
  SELECT mr.*, req.full_name AS requested_by_name, req.email AS requested_by_email,
         sp.name AS sub_project_name, sp.code AS sub_project_code,
         handler.full_name AS handled_by_name,
         ce.start_time AS event_start_time, ce.end_time AS event_end_time
  FROM meeting_requests mr
  JOIN stakeholders req ON req.id = mr.requested_by_stakeholder_id
  LEFT JOIN sub_projects sp ON sp.id = mr.sub_project_id
  LEFT JOIN stakeholders handler ON handler.id = mr.handled_by_stakeholder_id
  LEFT JOIN calendar_events ce ON ce.id = mr.calendar_event_id`;

// requestedBy: limit to one requester's own requests (null = all).
export function list({ organizationId, requestedBy = null, status = null }) {
  const conditions = ["mr.organization_id = $1"];
  const values = [organizationId];
  if (requestedBy) {
    values.push(requestedBy);
    conditions.push(`mr.requested_by_stakeholder_id = $${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`mr.status = $${values.length}`);
  }
  return rows(`${SELECT_REQUESTS} WHERE ${conditions.join(" AND ")} ORDER BY mr.created_at DESC`, values);
}

export function findById(id) {
  return one(`${SELECT_REQUESTS} WHERE mr.id = $1`, [id]);
}

export async function create({ organizationId, requestedBy, subProjectId, title, reason }) {
  const inserted = await one(
    `INSERT INTO meeting_requests (organization_id, requested_by_stakeholder_id, sub_project_id, title, reason)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [organizationId, requestedBy, subProjectId, title, reason]
  );
  return findById(inserted.id);
}

// Only a pending request can be resolved; returns false otherwise.
export async function resolve(id, { status, calendarEventId, handledBy }) {
  return Boolean(
    await one(
      `UPDATE meeting_requests
       SET status = $1, calendar_event_id = $2, handled_by_stakeholder_id = $3
       WHERE id = $4 AND status = 'pending'
       RETURNING id`,
      [status, calendarEventId, handledBy, id]
    )
  );
}
