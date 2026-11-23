import { Router } from "express";
import * as Invitations from "../controllers/invitations.controller.js";
import { PMO_ROLES, requireRole } from "../middleware/requireRole.js";

const router = Router();
router.get("/", Invitations.listMine);
router.get("/declines", requireRole(...PMO_ROLES), Invitations.listDeclines);
router.post("/declines/:attendeeId/dismiss", requireRole(...PMO_ROLES), Invitations.dismiss);
router.patch("/:calendarEventId", Invitations.update);
export default router;
