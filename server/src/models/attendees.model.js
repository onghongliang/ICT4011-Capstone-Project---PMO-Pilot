import { one, rows } from "../db/pool.js";

// calendar_event_attendees: who is invited to which meeting, their response
// (with decline reason / suggested time) and the disruption assessment.

export function detailedFor(calendarEventId) {
  return rows(
    `SELECT cea.id, cea.stakeholder_id, sh.full_name, sh.email, cea.is_mandatory, cea.response_status,
            cea.decline_reason, cea.suggested_start_time, cea.suggested_end_time,
            rt.code AS role_code, rt.label AS role_label
     FROM calendar_event_attendees cea
     JOIN stakeholders sh ON sh.id = cea.stakeholder_id
     LEFT JOIN role_types rt ON rt.id = cea.role_type_id
     WHERE cea.calendar_event_id = $1
     ORDER BY cea.is_mandatory DESC, sh.full_name`,
    [calendarEventId]
  );
}

export function basicFor(calendarEventId) {
  return rows(`SELECT stakeholder_id, is_mandatory FROM calendar_event_attendees WHERE calendar_event_id = $1`, [
    calendarEventId,
  ]);
}

export function insert({ calendarEventId, stakeholderId, roleTypeId, isMandatory }, db) {
  return one(
    `INSERT INTO calendar_event_attendees (calendar_event_id, stakeholder_id, role_type_id, is_mandatory, response_status)
     VALUES ($1, $2, $3, $4, 'needs_action')
     RETURNING *`,
    [calendarEventId, stakeholderId, roleTypeId, isMandatory],
    db
  );
}

// After a reschedule everyone must re-confirm; open declines become resolved.
export function resetResponses(calendarEventId, db) {
  return one(
    `UPDATE calendar_event_attendees
     SET response_status = 'needs_action', responded_at = NULL,
         decline_reason = NULL, suggested_start_time = NULL, suggested_end_time = NULL,
         is_critical_decline = NULL, proposed_alternatives = NULL,
         decline_resolved_at = CASE WHEN response_status = 'declined' THEN now() ELSE decline_resolved_at END
     WHERE calendar_event_id = $1`,
    [calendarEventId],
    db
  );
}

// A person's upcoming invitations; cancelled meetings stay listed (as
// cancelled) until their time has passed, so attendees are told.
export function invitationsFor(stakeholderId) {
  return rows(
    `SELECT ce.id AS calendar_event_id, ce.title, ce.start_time, ce.end_time, ce.location,
            sp.name AS sub_project_name, organizer.full_name AS organizer_name,
            cea.is_mandatory, cea.response_status, cea.decline_reason,
            cea.suggested_start_time, cea.suggested_end_time,
            ce.status AS event_status, ce.cancel_reason, ce.cancelled_at, canceller.full_name AS cancelled_by_name,
            ce.reschedule_reason
     FROM calendar_event_attendees cea
     JOIN calendar_events ce ON ce.id = cea.calendar_event_id
     LEFT JOIN sub_projects sp ON sp.id = ce.sub_project_id
     LEFT JOIN stakeholders organizer ON organizer.id = ce.created_by_stakeholder_id
     LEFT JOIN stakeholders canceller ON canceller.id = ce.cancelled_by_stakeholder_id
     WHERE cea.stakeholder_id = $1 AND ce.status IN ('scheduled', 'cancelled') AND ce.end_time > now()
     ORDER BY ce.start_time`,
    [stakeholderId]
  );
}

// The PMO's queue: declines on upcoming meetings not yet rescheduled or dismissed.
export function openDeclines(organizationId) {
  return rows(
    `SELECT cea.id AS attendee_id, cea.stakeholder_id, sh.full_name, cea.is_mandatory,
            cea.decline_reason, cea.suggested_start_time, cea.suggested_end_time, cea.responded_at,
            cea.is_critical_decline, cea.proposed_alternatives,
            ce.id AS calendar_event_id, ce.title, ce.start_time, ce.end_time, ce.sub_project_id,
            sp.name AS sub_project_name
     FROM calendar_event_attendees cea
     JOIN calendar_events ce ON ce.id = cea.calendar_event_id
     JOIN stakeholders sh ON sh.id = cea.stakeholder_id
     LEFT JOIN sub_projects sp ON sp.id = ce.sub_project_id
     WHERE ce.organization_id = $1 AND cea.response_status = 'declined'
       AND cea.decline_resolved_at IS NULL AND cea.responded_at IS NOT NULL
       AND ce.status != 'cancelled' AND ce.end_time > now()
     ORDER BY cea.responded_at DESC`,
    [organizationId]
  );
}

export async function dismissDecline(attendeeId) {
  return Boolean(
    await one(
      `UPDATE calendar_event_attendees SET decline_resolved_at = now()
       WHERE id = $1 AND response_status = 'declined' AND decline_resolved_at IS NULL
       RETURNING id`,
      [attendeeId]
    )
  );
}

// Records accept/decline. Declining (re)opens it in the PMO's queue;
// accepting clears earlier decline details. Null if not invited.
export function respond({ calendarEventId, stakeholderId, responseStatus, declineReason, suggestedStart, suggestedEnd }) {
  return one(
    `UPDATE calendar_event_attendees
     SET response_status = $1, responded_at = now(),
         decline_reason = $2, suggested_start_time = $3, suggested_end_time = $4,
         decline_resolved_at = NULL, is_critical_decline = NULL, proposed_alternatives = NULL
     WHERE calendar_event_id = $5 AND stakeholder_id = $6
     RETURNING calendar_event_id, response_status, decline_reason, suggested_start_time, suggested_end_time`,
    [responseStatus, declineReason, suggestedStart, suggestedEnd, calendarEventId, stakeholderId]
  );
}

// A declined attendee with their meeting, for the disruption handler.
export function findDecline(calendarEventId, stakeholderId) {
  return one(
    `SELECT ce.id, ce.organization_id, ce.sub_project_id, ce.start_time, ce.end_time, ce.status,
            cea.is_mandatory
     FROM calendar_event_attendees cea
     JOIN calendar_events ce ON ce.id = cea.calendar_event_id
     WHERE cea.calendar_event_id = $1 AND cea.stakeholder_id = $2 AND cea.response_status = 'declined'`,
    [calendarEventId, stakeholderId]
  );
}

export function saveDeclineAssessment(calendarEventId, stakeholderId, { critical, alternatives }) {
  return one(
    `UPDATE calendar_event_attendees SET is_critical_decline = $1, proposed_alternatives = $2
     WHERE calendar_event_id = $3 AND stakeholder_id = $4 AND response_status = 'declined'`,
    [critical, alternatives ? JSON.stringify(alternatives) : null, calendarEventId, stakeholderId]
  );
}
