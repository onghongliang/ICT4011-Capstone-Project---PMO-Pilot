import { one, rows } from "../db/pool.js";

// Team membership: leadership roles (sub_project_roles + role_types) and
// general members (sub_project_members).

// A stakeholder's sub-projects: the ones they lead or are a member of.
const MY_SUB_PROJECTS_SQL = `
  SELECT sub_project_id FROM sub_project_roles WHERE stakeholder_id = $1 AND effective_to IS NULL
  UNION
  SELECT sub_project_id FROM sub_project_members WHERE stakeholder_id = $1`;

export async function subProjectIdsFor(stakeholderId) {
  return (await rows(MY_SUB_PROJECTS_SQL, [stakeholderId])).map((r) => r.sub_project_id);
}

export async function isProjectLead(stakeholderId) {
  return Boolean(
    await one(
      `SELECT 1 FROM sub_project_roles spr JOIN role_types rt ON rt.id = spr.role_type_id
       WHERE spr.stakeholder_id = $1 AND rt.code = 'project_lead' AND spr.effective_to IS NULL
       LIMIT 1`,
      [stakeholderId]
    )
  );
}

// Everyone a non-oversight user may see: themselves, teammates on any
// shared sub-project, the PMO officers and the Project Sponsor.
export async function visibleStakeholderIdsFor(stakeholderId) {
  const result = await rows(
    `WITH mine AS (${MY_SUB_PROJECTS_SQL})
     SELECT $1::uuid AS id
     UNION SELECT stakeholder_id FROM sub_project_roles
       WHERE effective_to IS NULL AND sub_project_id IN (SELECT sub_project_id FROM mine)
     UNION SELECT stakeholder_id FROM sub_project_members
       WHERE sub_project_id IN (SELECT sub_project_id FROM mine)
     UNION SELECT stakeholder_id FROM users WHERE role = 'pmo' AND stakeholder_id IS NOT NULL
     UNION SELECT sponsor_stakeholder_id FROM organizations WHERE sponsor_stakeholder_id IS NOT NULL`,
    [stakeholderId]
  );
  return new Set(result.map((r) => r.id));
}

export async function projectLeadIds(organizationId) {
  const result = await rows(
    `SELECT DISTINCT spr.stakeholder_id FROM sub_project_roles spr
     JOIN role_types rt ON rt.id = spr.role_type_id
     WHERE spr.organization_id = $1 AND rt.code = 'project_lead' AND spr.effective_to IS NULL`,
    [organizationId]
  );
  return result.map((r) => r.stakeholder_id);
}

// Current role holders of one sub-project, with whether each is mandatory
// (the per-assignment override, else the role type's default).
export function rolesOf(subProjectId) {
  return rows(
    `SELECT spr.id, spr.stakeholder_id, sh.full_name, sh.email,
            rt.code AS role_code, rt.label AS role_label,
            COALESCE(spr.is_mandatory, rt.is_mandatory_default) AS is_mandatory
     FROM sub_project_roles spr
     JOIN stakeholders sh ON sh.id = spr.stakeholder_id
     JOIN role_types rt ON rt.id = spr.role_type_id
     WHERE spr.sub_project_id = $1 AND spr.effective_to IS NULL
     ORDER BY is_mandatory DESC, rt.label`,
    [subProjectId]
  );
}

// Role holder → (role type, mandatory), for resolving a booking's attendees.
export function roleAssignmentsOf(subProjectId) {
  return rows(
    `SELECT spr.stakeholder_id, spr.role_type_id,
            COALESCE(spr.is_mandatory, rt.is_mandatory_default) AS is_mandatory
     FROM sub_project_roles spr
     JOIN role_types rt ON rt.id = spr.role_type_id
     WHERE spr.sub_project_id = $1 AND spr.effective_to IS NULL`,
    [subProjectId]
  );
}

// Leadership in hierarchy order (Project Lead, Process Owner, PIC).
export function leadershipOf(subProjectId) {
  return rows(
    `SELECT spr.stakeholder_id, sh.full_name, sh.email, rt.code AS role_code, rt.label AS role_label
     FROM sub_project_roles spr
     JOIN role_types rt ON rt.id = spr.role_type_id
     JOIN stakeholders sh ON sh.id = spr.stakeholder_id
     WHERE spr.sub_project_id = $1 AND spr.effective_to IS NULL
     ORDER BY CASE rt.code WHEN 'project_lead' THEN 0 WHEN 'process_owner' THEN 1 WHEN 'pic' THEN 2 ELSE 3 END`,
    [subProjectId]
  );
}

export function membersOf(subProjectId, { orderByTitle = false } = {}) {
  return rows(
    `SELECT spm.stakeholder_id, sh.full_name, sh.email, sh.title
     FROM sub_project_members spm
     JOIN stakeholders sh ON sh.id = spm.stakeholder_id
     WHERE spm.sub_project_id = $1 AND sh.is_active
     ORDER BY ${orderByTitle ? "sh.title, sh.full_name" : "sh.full_name"}`,
    [subProjectId]
  );
}

export function addMember({ organizationId, subProjectId, stakeholderId }, db) {
  return one(
    `INSERT INTO sub_project_members (organization_id, sub_project_id, stakeholder_id) VALUES ($1, $2, $3) RETURNING id`,
    [organizationId, subProjectId, stakeholderId],
    db
  );
}

// All leadership and members across the organisation (team structure page).
export function allLeadership(organizationId) {
  return rows(
    `SELECT spr.sub_project_id, rt.code AS role_code, rt.label AS role_label,
            sh.id, sh.full_name, sh.title, sh.email, sh.phone
     FROM sub_project_roles spr
     JOIN role_types rt ON rt.id = spr.role_type_id
     JOIN stakeholders sh ON sh.id = spr.stakeholder_id
     WHERE spr.organization_id = $1 AND spr.effective_to IS NULL AND sh.is_active`,
    [organizationId]
  );
}

export function allMembers(organizationId) {
  return rows(
    `SELECT spm.sub_project_id, sh.id, sh.full_name, sh.title, sh.email, sh.phone
     FROM sub_project_members spm
     JOIN stakeholders sh ON sh.id = spm.stakeholder_id
     WHERE spm.organization_id = $1 AND sh.is_active
     ORDER BY sh.title, sh.full_name`,
    [organizationId]
  );
}

// Each Project Lead / Process Owner once (as Project Lead if both).
export function steercoRoleHolders(organizationId) {
  return rows(
    `SELECT DISTINCT ON (spr.stakeholder_id) spr.stakeholder_id, sh.full_name, rt.code, rt.label
     FROM sub_project_roles spr
     JOIN role_types rt ON rt.id = spr.role_type_id
     JOIN stakeholders sh ON sh.id = spr.stakeholder_id
     WHERE spr.organization_id = $1 AND spr.effective_to IS NULL AND sh.is_active
       AND rt.code IN ('project_lead', 'process_owner')
     ORDER BY spr.stakeholder_id, rt.code = 'project_lead' DESC`,
    [organizationId]
  );
}

// Every person's project positions, for the admin user list.
export function assignmentsForOrganization(organizationId) {
  return rows(
    `SELECT spr.stakeholder_id, sp.code, rt.label AS position
     FROM sub_project_roles spr
     JOIN sub_projects sp ON sp.id = spr.sub_project_id
     JOIN role_types rt ON rt.id = spr.role_type_id
     WHERE spr.organization_id = $1 AND spr.effective_to IS NULL
     UNION ALL
     SELECT spm.stakeholder_id, sp.code, 'Member' AS position
     FROM sub_project_members spm
     JOIN sub_projects sp ON sp.id = spm.sub_project_id
     WHERE spm.organization_id = $1
     ORDER BY code`,
    [organizationId]
  );
}
