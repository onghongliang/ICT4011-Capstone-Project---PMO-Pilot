import { pool } from "../db/pool.js";

// Checks free/busy for a list of stakeholders over a time window, and
// derives which of them are mandatory for the given sub-project (from
// sub_project_roles/role_types) rather than hardcoding "Program Head"/"PIC".
// A slot is only invalid (`is_valid: false`) when a *mandatory* stakeholder
// has a conflict — everyone else's conflicts are reported but non-blocking.
export async function queryAvailability({
  organizationId,
  subProjectId = null,
  startTime,
  endTime,
  stakeholderIds,
  extraMandatoryStakeholderIds = [],
  excludeCalendarEventId = null,
}) {
  const stakeholderResult = await pool.query(
    `SELECT id, full_name FROM stakeholders WHERE organization_id = $1 AND id = ANY($2::uuid[])`,
    [organizationId, stakeholderIds]
  );
  const stakeholderById = new Map(stakeholderResult.rows.map((row) => [row.id, row]));

  const mandatoryRoleByStakeholder = new Map();
  if (subProjectId) {
    const roleResult = await pool.query(
      `SELECT spr.stakeholder_id, rt.label AS role_label,
              COALESCE(spr.is_mandatory, rt.is_mandatory_default) AS is_mandatory
       FROM sub_project_roles spr
       JOIN role_types rt ON rt.id = spr.role_type_id
       WHERE spr.sub_project_id = $1 AND spr.effective_to IS NULL`,
      [subProjectId]
    );
    for (const row of roleResult.rows) {
      if (row.is_mandatory) {
        mandatoryRoleByStakeholder.set(row.stakeholder_id, row.role_label);
      }
    }
  }
  for (const id of extraMandatoryStakeholderIds) {
    if (!mandatoryRoleByStakeholder.has(id)) {
      mandatoryRoleByStakeholder.set(id, null);
    }
  }

  const conflictResult = await pool.query(
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

  const conflictsByStakeholder = new Map();
  for (const row of conflictResult.rows) {
    if (!conflictsByStakeholder.has(row.stakeholder_id)) {
      conflictsByStakeholder.set(row.stakeholder_id, []);
    }
    conflictsByStakeholder.get(row.stakeholder_id).push({
      calendar_event_id: row.calendar_event_id,
      title: row.title,
      start_time: row.start_time,
      end_time: row.end_time,
      attendee_role: row.attendee_role,
      attendee_is_mandatory: row.attendee_is_mandatory,
    });
  }

  const stakeholders = stakeholderIds.map((id) => {
    const stakeholder = stakeholderById.get(id);
    const conflicts = conflictsByStakeholder.get(id) ?? [];
    return {
      stakeholder_id: id,
      full_name: stakeholder?.full_name ?? null,
      is_mandatory: mandatoryRoleByStakeholder.has(id),
      mandatory_role: mandatoryRoleByStakeholder.get(id) ?? null,
      is_free: conflicts.length === 0,
      conflicts,
    };
  });

  const blockingConflicts = stakeholders
    .filter((s) => s.is_mandatory && !s.is_free)
    .map((s) => ({
      stakeholder_id: s.stakeholder_id,
      full_name: s.full_name,
      mandatory_role: s.mandatory_role,
      reason: `${s.mandatory_role ?? "Mandatory attendee"} ${s.full_name} is already booked on "${s.conflicts[0].title}" (${s.conflicts[0].start_time.toISOString()} - ${s.conflicts[0].end_time.toISOString()})`,
      conflicting_events: s.conflicts,
    }));

  const blackoutResult = await pool.query(
    `SELECT id, name, start_date, end_date, recurrence_rule, weight, sub_project_id
     FROM blackout_periods
     WHERE organization_id = $1
       AND is_active = true
       AND (sub_project_id IS NULL OR sub_project_id = $2)
       AND start_date <= $3::date
       AND end_date >= $4::date`,
    [organizationId, subProjectId, endTime, startTime]
  );

  return {
    start_time: startTime,
    end_time: endTime,
    is_valid: blockingConflicts.length === 0,
    stakeholders,
    blocking_conflicts: blockingConflicts,
    blackout_periods: blackoutResult.rows.map((b) => ({
      id: b.id,
      name: b.name,
      weight: Number(b.weight),
      scope: b.sub_project_id ? "sub_project" : "organization",
      recurrence_rule: b.recurrence_rule,
    })),
  };
}
