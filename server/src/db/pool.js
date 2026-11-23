import pg from "pg";
import { config } from "../config/env.js";

const { Pool } = pg;

// A pool (not a single client) lets multiple requests query concurrently.
export const pool = new Pool({ connectionString: config.databaseUrl });

// Query helpers used by the models. `db` is the pool by default, or a
// transaction client (see withTransaction) when a write spans several tables.
export async function rows(sql, params = [], db = pool) {
  return (await db.query(sql, params)).rows;
}

export async function one(sql, params = [], db = pool) {
  return (await db.query(sql, params)).rows[0] ?? null;
}

// The database's current time; doubles as a connectivity check.
export async function ping() {
  return (await one("SELECT NOW() AS current_time")).current_time;
}

// Runs `work(client)` inside BEGIN/COMMIT, rolling back if it throws.
export async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
