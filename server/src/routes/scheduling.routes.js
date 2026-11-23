import { Router } from "express";
import * as Scheduling from "../controllers/scheduling.controller.js";
import { PMO_ROLES, requireRole } from "../middleware/requireRole.js";

const router = Router();
router.post("/find-slot", Scheduling.findSlot);
router.post("/recommend", requireRole(...PMO_ROLES), Scheduling.recommend);
router.post("/agenda", requireRole(...PMO_ROLES), Scheduling.agenda);
export default router;
