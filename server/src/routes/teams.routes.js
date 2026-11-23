import { Router } from "express";
import * as Teams from "../controllers/teams.controller.js";
import { PMO_ROLES, requireRole } from "../middleware/requireRole.js";

const router = Router();
router.get("/", Teams.structure);
router.get("/steerco", requireRole(...PMO_ROLES), Teams.steerco);
export default router;
