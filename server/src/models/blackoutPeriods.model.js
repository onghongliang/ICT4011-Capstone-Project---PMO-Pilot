import { rows } from "../db/pool.js";

// Active blackout periods (organisation-wide, or for this sub-project) that
// overlap the given window. Soft constraints: they lower a slot's score but
// never block it.
export function overlapping({ organizationId, subProjectId = null, startTime, endTime }) {
  return rows(
    `SELECT id, name, start_date, end_date, recurrence_rule, weight, sub_project_id
     FROM blackout_periods
     WHERE organization_id = $1
       AND is_active = true
       AND (sub_project_id IS NULL OR sub_project_id = $2)
       AND start_date <= $3::date
       AND end_date >= $4::date`,
    [organizationId, subProjectId, endTime, startTime]
  );
}
