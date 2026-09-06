import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

// GET /api/health - basic liveness check
router.get("/", (req, res) => {
  res.json({ status: "ok", service: "pmo-pilot-server" });
});

// GET /api/health/db - confirms the server can actually reach PostgreSQL
router.get("/db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS current_time");
    res.json({ status: "ok", db_time: result.rows[0].current_time });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;
