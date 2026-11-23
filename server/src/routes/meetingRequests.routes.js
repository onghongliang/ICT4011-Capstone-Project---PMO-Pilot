import { Router } from "express";
import * as MeetingRequests from "../controllers/meetingRequests.controller.js";
import { PMO_ROLES, requireRole } from "../middleware/requireRole.js";

const router = Router();
router.get("/", MeetingRequests.list);
router.post("/", MeetingRequests.create);
router.patch("/:id", requireRole(...PMO_ROLES), MeetingRequests.resolve);
export default router;
