import { one, rows } from "../db/pool.js";

// The login row joined to the person it belongs to (null stakeholder for admin).
export function findByUsername(username) {
  return one(
    `SELECT u.id, u.username, u.password_hash, u.role, u.stakeholder_id, sh.full_name
     FROM users u
     LEFT JOIN stakeholders sh ON sh.id = u.stakeholder_id
     WHERE u.username = $1`,
    [username]
  );
}

export function listForOrganization(organizationId) {
  return rows(
    `SELECT u.id, u.username, u.role, u.created_at, sh.id AS stakeholder_id, sh.full_name, sh.email, sh.title
     FROM users u
     LEFT JOIN stakeholders sh ON sh.id = u.stakeholder_id
     WHERE sh.organization_id = $1 OR u.stakeholder_id IS NULL
     ORDER BY u.role = 'admin' DESC, u.role = 'pmo' DESC, sh.full_name`,
    [organizationId]
  );
}

export function create({ username, passwordHash, stakeholderId, role }, db) {
  return one(
    `INSERT INTO users (username, password_hash, stakeholder_id, role) VALUES ($1, $2, $3, $4)
     RETURNING id, username, role`,
    [username, passwordHash, stakeholderId, role],
    db
  );
}

export async function pmoStakeholderIds(organizationId) {
  const result = await rows(
    `SELECT sh.id FROM users u JOIN stakeholders sh ON sh.id = u.stakeholder_id
     WHERE u.role = 'pmo' AND sh.organization_id = $1 AND sh.is_active`,
    [organizationId]
  );
  return result.map((r) => r.id);
}

export function pmoOffice(organizationId) {
  return rows(
    `SELECT sh.id, sh.full_name, sh.title, sh.email, sh.phone
     FROM users u JOIN stakeholders sh ON sh.id = u.stakeholder_id
     WHERE u.role = 'pmo' AND sh.organization_id = $1 AND sh.is_active
     ORDER BY sh.full_name`,
    [organizationId]
  );
}
