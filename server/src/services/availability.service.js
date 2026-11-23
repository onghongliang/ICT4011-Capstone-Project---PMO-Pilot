import * as BlackoutPeriods from "../models/blackoutPeriods.model.js";
import * as CalendarEvents from "../models/calendarEvents.model.js";
import * as Stakeholders from "../models/stakeholders.model.js";
import * as Teams from "../models/teams.model.js";

// Free/busy check for a set of people over one time window. Who is
// mandatory comes from the sub-project's roles (not hardcoded titles), plus
// any extra ids passed in. The slot is invalid (is_valid: false) only when a
// mandatory person is busy; everyone else's conflicts are reported but
// non-blocking. Overlapping blackout periods are returned as soft signals.
export async function queryAvailability({
  organizationId,
  subProjectId = null,
  startTime,
  endTime,
  stakeholderIds,
  extraMandatoryStakeholderIds = [],
  excludeCalendarEventId = null,
}) {
  const [people, roles, conflictRows, blackouts] = await Promise.all([
    Stakeholders.findNamesInOrganization(organizationId, stakeholderIds),
    subProjectId ? Teams.rolesOf(subProjectId) : [],
    CalendarEvents.conflictsFor({ stakeholderIds, startTime, endTime, excludeCalendarEventId }),
    BlackoutPeriods.overlapping({ organizationId, subProjectId, startTime, endTime }),
  ]);
  const nameById = new Map(people.map((p) => [p.id, p.full_name]));

  const mandatoryRoleByStakeholder = new Map();
  for (const r of roles) {
    if (r.is_mandatory) mandatoryRoleByStakeholder.set(r.stakeholder_id, r.role_label);
  }
  for (const id of extraMandatoryStakeholderIds) {
    if (!mandatoryRoleByStakeholder.has(id)) mandatoryRoleByStakeholder.set(id, null);
  }

  const conflictsByStakeholder = new Map();
  for (const row of conflictRows) {
    if (!conflictsByStakeholder.has(row.stakeholder_id)) conflictsByStakeholder.set(row.stakeholder_id, []);
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
    const conflicts = conflictsByStakeholder.get(id) ?? [];
    return {
      stakeholder_id: id,
      full_name: nameById.get(id) ?? null,
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

  return {
    start_time: startTime,
    end_time: endTime,
    is_valid: blockingConflicts.length === 0,
    stakeholders,
    blocking_conflicts: blockingConflicts,
    blackout_periods: blackouts.map((b) => ({
      id: b.id,
      name: b.name,
      weight: Number(b.weight),
      scope: b.sub_project_id ? "sub_project" : "organization",
      recurrence_rule: b.recurrence_rule,
    })),
  };
}
