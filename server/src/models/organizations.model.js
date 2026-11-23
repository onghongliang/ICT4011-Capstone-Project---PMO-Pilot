import { one, rows } from "../db/pool.js";

export function list() {
  return rows(`SELECT * FROM organizations ORDER BY created_at`);
}

export function findById(id) {
  return one(`SELECT * FROM organizations WHERE id = $1`, [id]);
}

export function create({ name, slug, timezone }) {
  return one(`INSERT INTO organizations (name, slug, timezone) VALUES ($1, $2, $3) RETURNING *`, [name, slug, timezone]);
}

// The organisation-wide Project Sponsor (organizations.sponsor_stakeholder_id).
export function findSponsor(organizationId) {
  return one(
    `SELECT sh.id, sh.full_name, sh.title, sh.email, sh.phone
     FROM organizations o JOIN stakeholders sh ON sh.id = o.sponsor_stakeholder_id
     WHERE o.id = $1 AND sh.is_active`,
    [organizationId]
  );
}

export async function isSponsor(stakeholderId) {
  return Boolean(await one(`SELECT 1 FROM organizations WHERE sponsor_stakeholder_id = $1`, [stakeholderId]));
}
