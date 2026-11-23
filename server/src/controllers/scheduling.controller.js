import { queryAvailability } from "../services/availability.service.js";
import { draftAgenda, getProjectContext } from "../services/context.service.js";
import { recommendSlots } from "../services/recommendation.service.js";
import { findNextAvailableSlot } from "../services/scheduling.service.js";
import { ValidationError } from "../utils/errors.js";
import { optionalUuid, requireNonEmptyArray, requireString, requireTimeRange, requireUuid } from "../utils/validation.js";

// POST /api/availability/query — free/busy for people over one window;
// is_valid is false only when a mandatory person is busy.
export async function availability(req, res) {
  const body = req.body ?? {};
  if (!body.organization_id) throw new ValidationError("organization_id is required");
  requireNonEmptyArray(body.stakeholder_ids, "stakeholder_ids must be a non-empty array");
  const { startTime, endTime } = requireTimeRange(body.start_time, body.end_time);
  const result = await queryAvailability({
    organizationId: body.organization_id,
    subProjectId: body.sub_project_id ?? null,
    startTime,
    endTime,
    stakeholderIds: body.stakeholder_ids,
    extraMandatoryStakeholderIds: body.mandatory_stakeholder_ids ?? [],
    excludeCalendarEventId: body.exclude_calendar_event_id ?? null,
  });
  res.json({ status: "ok", ...result });
}

function searchParams(body) {
  requireUuid(body.organization_id, "organization_id is required");
  requireNonEmptyArray(body.attendee_stakeholder_ids, "attendee_stakeholder_ids must be a non-empty array");
  return {
    organizationId: body.organization_id,
    subProjectId: body.sub_project_id ?? null,
    attendeeStakeholderIds: body.attendee_stakeholder_ids,
    mandatoryStakeholderIds: body.mandatory_stakeholder_ids ?? [],
    durationMinutes: body.duration_minutes ?? 60,
    searchFromDate: body.search_from_date ?? null,
    excludeCalendarEventId: body.exclude_calendar_event_id ?? null,
  };
}

// POST /api/scheduling/find-slot — the earliest slot (first fit).
export async function findSlot(req, res) {
  res.json({ status: "ok", ...(await findNextAvailableSlot(searchParams(req.body ?? {}))) });
}

// POST /api/scheduling/recommend (PMO/admin) — the Recommendation Engine's
// top-ranked slots with rationale, before the next milestone deadline.
export async function recommend(req, res) {
  const body = req.body ?? {};
  const params = searchParams(body);
  const context = params.subProjectId ? await getProjectContext(params.subProjectId) : null;
  const result = await recommendSlots({
    ...params,
    avoidStartTime: body.avoid_start_time ?? null,
    deadline: context?.next_deadline ?? null,
    limit: Math.min(Math.max(Number(body.limit) || 3, 1), 5),
  });
  res.json({ status: "ok", ...result });
}

// POST /api/scheduling/agenda (PMO/admin) — the Context Engine's draft agenda.
// Body: { organization_id, sub_project_id?, title, meeting_type?, request_reason? }
export async function agenda(req, res) {
  const body = req.body ?? {};
  requireUuid(body.organization_id, "organization_id is required");
  requireString(body.title, "title is required");
  const result = await draftAgenda({
    organizationId: body.organization_id,
    subProjectId: optionalUuid(body.sub_project_id, "invalid sub_project_id"),
    title: body.title.trim(),
    meetingType: body.meeting_type ?? null,
    requestReason: body.request_reason ?? null,
  });
  res.json({ status: "ok", ...result });
}
