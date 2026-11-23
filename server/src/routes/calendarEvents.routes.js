import { Router } from "express";
import * as CalendarEvents from "../controllers/calendarEvents.controller.js";
import { PMO_ROLES, requireRole } from "../middleware/requireRole.js";

// Booking, rescheduling and cancelling are PMO/admin only; stakeholders
// request meetings through /api/meeting-requests instead.
const router = Router();
router.get("/", CalendarEvents.list);
router.get("/:id", CalendarEvents.get);
router.post("/", requireRole(...PMO_ROLES), CalendarEvents.book);
router.post("/:id/cancel", requireRole(...PMO_ROLES), CalendarEvents.cancel);
router.post("/:id/reschedule", requireRole(...PMO_ROLES), CalendarEvents.reschedule);
export default router;
