import { ping } from "../db/pool.js";

// GET /api/health — liveness
export function status(req, res) {
  res.json({ status: "ok", service: "pmo-pilot-server" });
}

// GET /api/health/db — confirms the server can reach PostgreSQL
export async function database(req, res) {
  res.json({ status: "ok", db_time: await ping() });
}
