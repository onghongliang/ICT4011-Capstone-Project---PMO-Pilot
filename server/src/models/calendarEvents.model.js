import { one, rows } from "../db/pool.js";

// Non-cancelled meetings, optionally within a window and/or for a sub-project.
export function list({ organizationId, start = null, end = null, subProjectId = null }) {
  const conditions = ["organization_id = $1", "status != 'cancelled'"];
  const values = [organizationId];
  if (start) {
    values.push(start);
    conditions.push(`end_time > $${values.length}`);
  }
  if (end) {
    values.push(end);
    conditions.push(`start_time < $${values.length}`);
  }
  if (subProjectId) {
    values.push(subProjectId);
    conditions.push(`sub_project_id = $${values.length}`);
  }
  return rows(`SELECT * FROM calendar_events WHERE ${conditions.join(" AND ")} ORDER BY start_time`, values);
}

export function findById(id) {
  return one(`SELECT * FROM calendar_events WHERE id = $1`, [id]);
}

// A sub-project's meetings (incl. cancelled) with attendee counts.
export function forSubProject(subProjectId) {
  return rows(
    `SELECT ce.id, ce.title, ce.meeting_type, ce.start_time, ce.end_time, ce.location, ce.status, ce.cancel_reason,
            (SELECT count(*)::int FROM calendar_event_attendees cea WHERE cea.calendar_event_id = ce.id) AS attendee_count
     FROM calendar_events ce WHERE ce.sub_project_id = $1
     ORDER BY ce.start_time`,
    [subProjectId]
  );
}

export function insert(event, db) {
  return one(
    `INSERT INTO calendar_events
       (organization_id, sub_project_id, title, description, meeting_type, start_time, end_time, location, status, ics_uid, created_by_stakeholder_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled', $9, $10)
     RETURNING *`,
    [
      event.organizationId,
      event.subProjectId,
      event.title,
      event.description,
      event.meetingType,
      event.startTime,
      event.endTime,
      event.location,
      event.icsUid,
      event.createdByStakeholderId,
    ],
    db
  );
}

// Moves a meeting; bumps the iCalendar SEQUENCE so invites update in place.
export function reschedule(id, { startTime, endTime, reason }, db) {
  return one(
    `UPDATE calendar_events SET start_time = $1, end_time = $2, sequence = sequence + 1, reschedule_reason = $4
     WHERE id = $3 RETURNING *`,
    [startTime, endTime, id, reason],
    db
  );
}

// Only a scheduled meeting can be cancelled; returns null otherwise.
export function cancel(id, { reason, cancelledBy }) {
  return one(
    `UPDATE calendar_events
     SET status = 'cancelled', cancelled_at = now(), cancel_reason = $2,
         cancelled_by_stakeholder_id = $3, sequence = sequence + 1
     WHERE id = $1 AND status = 'scheduled'
     RETURNING *`,
    [id, reason, cancelledBy]
  );
}

// Other (non-cancelled) meetings the given people are in that overlap the window.
export function conflictsFor({ stakeholderIds, startTime, endTime, excludeCalendarEventId = null }) {
  return rows(
    `SELECT ce.id AS calendar_event_id, ce.title, ce.start_time, ce.end_time,
            cea.stakeholder_id, cea.is_mandatory AS attendee_is_mandatory, rt.label AS attendee_role
     FROM calendar_event_attendees cea
     JOIN calendar_events ce ON ce.id = cea.calendar_event_id
     LEFT JOIN role_types rt ON rt.id = cea.role_type_id
     WHERE cea.stakeholder_id = ANY($1::uuid[])
       AND ce.status != 'cancelled'
       AND ce.start_time < $2
       AND ce.end_time > $3
       AND ($4::uuid IS NULL OR ce.id != $4)`,
    [stakeholderIds, endTime, startTime, excludeCalendarEventId]
  );
}
