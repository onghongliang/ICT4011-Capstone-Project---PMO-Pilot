import { pool } from "../db/pool.js";

const cache = new Map();

// Derives a CHECK constraint's allowed values directly from Postgres's own
// constraint definition (via pg_get_constraintdef), rather than maintaining
// a second, hand-copied list of the same values in JS that could silently
// drift out of sync with the schema. Only handles the
// `col = ANY (ARRAY['a'::text, 'b'::text, ...])` shape our enum-style
// constraints use — not a general CHECK-expression parser.
export async function getAllowedValues(constraintName) {
  if (cache.has(constraintName)) return cache.get(constraintName);

  const result = await pool.query(
    `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1`,
    [constraintName]
  );
  if (result.rows.length === 0) {
    throw new Error(`No constraint named "${constraintName}" found`);
  }

  const values = [...result.rows[0].def.matchAll(/'([^']*)'::text/g)].map((m) => m[1]);
  cache.set(constraintName, values);
  return values;
}

// Pre-warms the cache for every enum-style constraint the API validates
// against, so the first real request to each route never pays a DB
// round-trip for this.
export async function warmAllowedValuesCache() {
  await Promise.all(
    [
      "sub_projects_status_check",
      "milestones_status_check",
      "action_items_status_check",
      "action_items_priority_check",
      "calendar_events_meeting_type_check",
    ].map((name) => getAllowedValues(name))
  );
}
