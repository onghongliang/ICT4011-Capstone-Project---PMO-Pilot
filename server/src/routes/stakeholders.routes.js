import { Router } from "express";
import * as Stakeholders from "../controllers/stakeholders.controller.js";
import { PMO_ROLES, requireRole } from "../middleware/requireRole.js";

// Reads are filtered to the people the user may see; changes are PMO/admin only.
const router = Router();
router.post("/", requireRole(...PMO_ROLES), Stakeholders.create);
router.get("/", Stakeholders.list);
router.get("/:id", Stakeholders.get);
router.patch("/:id", requireRole(...PMO_ROLES), Stakeholders.update);
router.delete("/:id", requireRole(...PMO_ROLES), Stakeholders.deactivate);
export default router;
