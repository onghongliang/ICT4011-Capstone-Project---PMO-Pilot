import { Router } from "express";
import { queryAvailability } from "../services/availability.js";

const router = Router();

// POST /api/availability/query - free/busy check across stakeholders for a
// time window; is_valid is false only when a *mandatory* stakeholder has a
// conflict (see queryAvailability for how "mandatory" is resolved).
router.post("/query", async (req, res) => {
  const {
    organization_id: organizationId,
    sub_project_id: subProjectId = null,
    start_time: startTimeRaw,
    end_time: endTimeRaw,
    stakeholder_ids: stakeholderIds,
    mandatory_stakeholder_ids: extraMandatoryStakeholderIds = [],
    exclude_calendar_event_id: excludeCalendarEventId = null,
  } = req.body ?? {};

  if (!organizationId) {
    return res.status(400).json({ status: "error", message: "organization_id is required" });
  }
  if (!Array.isArray(stakeholderIds) || stakeholderIds.length === 0) {
    return res.status(400).json({ status: "error", message: "stakeholder_ids must be a non-empty array" });
  }

  const startTime = new Date(startTimeRaw);
  const endTime = new Date(endTimeRaw);
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return res.status(400).json({ status: "error", message: "start_time and end_time must be valid ISO timestamps" });
  }
  if (endTime <= startTime) {
    return res.status(400).json({ status: "error", message: "end_time must be after start_time" });
  }

  try {
    const result = await queryAvailability({
      organizationId,
      subProjectId,
      startTime,
      endTime,
      stakeholderIds,
      extraMandatoryStakeholderIds,
      excludeCalendarEventId,
    });
    res.json({ status: "ok", ...result });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;
