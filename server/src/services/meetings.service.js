import { randomUUID } from "node:crypto";

import { config } from "../config/env.js";
import { withTransaction } from "../db/pool.js";
import { sendInviteEmail } from "../integrations/email.js";
import { buildIcsInvite } from "../integrations/ics.js";
import * as Attendees from "../models/attendees.model.js";
import * as CalendarEvents from "../models/calendarEvents.model.js";
import * as Stakeholders from "../models/stakeholders.model.js";
import * as SubProjects from "../models/subProjects.model.js";
import * as Teams from "../models/teams.model.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { queryAvailability } from "./availability.service.js";
import { pmoOfficerIds, projectLeadIds, steercoAttendees } from "./teams.service.js";

// Meeting lifecycle: book, reschedule, cancel. Every change re-runs the
// same availability check as the availability endpoint, writes in a
// transaction, then emails .ics invites (non-fatal per attendee).

// Applies the standing rules to a requested attendee list:
//   - a steering committee's attendees are fixed (Sponsor, Lead, Process
//     Owners), so whatever was sent is replaced;
//   - the Project Lead is always invited and required;
//   - every PMO officer is invited as optional.
async function resolveStandingAttendees({ organizationId, meetingType, attendees }) {
  if (meetingType === "steering_committee") {
    attendees = (await steercoAttendees(organizationId)).map((a) => ({ stakeholderId: a.stakeholder_id, isMandatory: true }));
    if (attendees.length === 0) {
      throw new ValidationError("No steering committee members found (Project Sponsor, Project Lead, Process Owners)");
    }
  }
  const [leadIds, pmoIds] = await Promise.all([projectLeadIds(organizationId), pmoOfficerIds(organizationId)]);
  attendees = attendees.map((a) => (leadIds.includes(a.stakeholderId) ? { ...a, isMandatory: true } : a));
  const listed = new Set(attendees.map((a) => a.stakeholderId));
  return [
    ...attendees,
    ...leadIds.filter((id) => !listed.has(id)).map((id) => ({ stakeholderId: id, isMandatory: true })),
    ...pmoIds.filter((id) => !listed.has(id) && !leadIds.includes(id)).map((id) => ({ stakeholderId: id, isMandatory: false })),
  ];
}

// Fills in each attendee's mandatory flag and role from the sub-project's
// roles, unless the caller set them explicitly.
async function resolveRoles(subProjectId, attendees) {
  const roleByStakeholder = new Map(
    subProjectId ? (await Teams.roleAssignmentsOf(subProjectId)).map((r) => [r.stakeholder_id, r]) : []
  );
  return attendees.map((a) => {
    const role = roleByStakeholder.get(a.stakeholderId);
    return {
      stakeholderId: a.stakeholderId,
      isMandatory: a.isMandatory ?? role?.is_mandatory ?? false,
      roleTypeId: a.roleTypeId ?? role?.role_type_id ?? null,
    };
  });
}

// Books a meeting only if every mandatory attendee is free. A kick-off for a
// sub-project in planning moves it to active in the same transaction.
// Returns { booked: false, availability } on a clash.
export async function bookMeeting({
  organizationId,
  subProjectId = null,
  title,
  description = null,
  meetingType = null,
  startTime,
  endTime,
  location = null,
  createdByStakeholderId = null,
  attendees,
}) {
  if (meetingType === "steering_committee") subProjectId = null;
  const invited = await resolveStandingAttendees({ organizationId, meetingType, attendees });
  const stakeholderIds = invited.map((a) => a.stakeholderId);

  if ((await Stakeholders.countInOrganization(organizationId, stakeholderIds)) !== new Set(stakeholderIds).size) {
    throw new ValidationError("One or more attendee stakeholder_ids were not found in this organization");
  }
  if (subProjectId && !(await SubProjects.existsInOrganization(organizationId, subProjectId))) {
    throw new ValidationError("sub_project_id was not found in this organization");
  }

  const resolved = await resolveRoles(subProjectId, invited);
  const availability = await queryAvailability({
    organizationId,
    subProjectId,
    startTime,
    endTime,
    stakeholderIds,
    extraMandatoryStakeholderIds: resolved.filter((a) => a.isMandatory).map((a) => a.stakeholderId),
  });
  if (!availability.is_valid) return { booked: false, availability };

  const { event, attendeeRows, subProjectActivated } = await withTransaction(async (db) => {
    const event = await CalendarEvents.insert(
      {
        organizationId,
        subProjectId,
        title,
        description,
        meetingType,
        startTime,
        endTime,
        location,
        icsUid: `${randomUUID()}@pmo-pilot.local`,
        createdByStakeholderId,
      },
      db
    );
    const subProjectActivated =
      meetingType === "kickoff" && subProjectId ? await SubProjects.activateIfPlanning(subProjectId, db) : false;
    const attendeeRows = [];
    for (const a of resolved) {
      attendeeRows.push(await Attendees.insert({ calendarEventId: event.id, ...a }, db));
    }
    return { event, attendeeRows, subProjectActivated };
  });

  const invites = await sendInvites({ event, attendees: resolved });
  return { booked: true, event, attendees: attendeeRows, availability, invites, subProjectActivated };
}

// Moves a meeting, re-checking availability (ignoring the meeting itself).
// extraMandatoryStakeholderIds (e.g. whoever declined) must be free too.
// Everyone is asked to re-confirm, open declines are resolved, and updated
// invites carry the reason (who was unavailable and why).
export async function rescheduleMeeting({ calendarEventId, startTime, endTime, extraMandatoryStakeholderIds = [], reason = null }) {
  const existing = await CalendarEvents.findById(calendarEventId);
  if (!existing || existing.status === "cancelled") {
    throw new NotFoundError("calendar_event not found or cancelled");
  }
  const attendees = await Attendees.basicFor(calendarEventId);

  const availability = await queryAvailability({
    organizationId: existing.organization_id,
    subProjectId: existing.sub_project_id,
    startTime,
    endTime,
    stakeholderIds: attendees.map((a) => a.stakeholder_id),
    extraMandatoryStakeholderIds: [
      ...attendees.filter((a) => a.is_mandatory).map((a) => a.stakeholder_id),
      ...extraMandatoryStakeholderIds,
    ],
    excludeCalendarEventId: calendarEventId,
  });
  if (!availability.is_valid) return { rescheduled: false, availability };

  const event = await withTransaction(async (db) => {
    const updated = await CalendarEvents.reschedule(calendarEventId, { startTime, endTime, reason }, db);
    await Attendees.resetResponses(calendarEventId, db);
    return updated;
  });

  const invites = await sendInvites({ event, attendees: toInviteList(attendees), isUpdate: true });
  return { rescheduled: true, event, availability, invites };
}

// Cancels a scheduled meeting (kept, with who/when/why) and emails an
// iCalendar CANCEL so it leaves attendees' real calendars too.
export async function cancelMeeting({ calendarEventId, reason = null, cancelledByStakeholderId = null }) {
  const event = await CalendarEvents.cancel(calendarEventId, { reason, cancelledBy: cancelledByStakeholderId });
  if (!event) throw new NotFoundError("scheduled calendar_event not found");
  const attendees = await Attendees.basicFor(calendarEventId);
  const invites = await sendInvites({ event, attendees: toInviteList(attendees), method: "CANCEL" });
  return { event, invites };
}

function toInviteList(attendeeRows) {
  return attendeeRows.map((a) => ({ stakeholderId: a.stakeholder_id, isMandatory: a.is_mandatory }));
}

function inviteText(event, { isUpdate, isCancel }) {
  const lead = isCancel ? "This meeting has been cancelled" : isUpdate ? "This meeting has been rescheduled" : "You have been invited";
  let text = `${lead}: "${event.title}" from ${new Date(event.start_time).toISOString()} to ${new Date(event.end_time).toISOString()}.`;
  if (isCancel && event.cancel_reason) text += ` Reason: ${event.cancel_reason}`;
  if (isUpdate && event.reschedule_reason) text += ` Rescheduled because ${event.reschedule_reason}.`;
  if (!isCancel && event.description) text += `\n\n${event.description}`;
  return text;
}

// Emails the .ics to every attendee. Runs after the transaction committed;
// failures are per-attendee and non-fatal — a booking must never be undone
// because an email bounced or SMTP is down.
async function sendInvites({ event, attendees, isUpdate = false, method = "REQUEST" }) {
  const contacts = new Map((await Stakeholders.findContacts(attendees.map((a) => a.stakeholderId))).map((c) => [c.id, c]));
  const organizerContact = event.created_by_stakeholder_id ? contacts.get(event.created_by_stakeholder_id) : null;
  const organizer = organizerContact
    ? { name: organizerContact.full_name, email: organizerContact.email }
    : { name: "PMO Pilot", email: config.smtp.fromAddress };

  const icsContent = buildIcsInvite({
    event,
    organizer,
    attendees: attendees.map((a) => {
      const c = contacts.get(a.stakeholderId);
      return { name: c?.full_name ?? "Unknown", email: c?.email, isMandatory: a.isMandatory };
    }),
    method,
  });
  const isCancel = method === "CANCEL";
  const subject = `${isCancel ? "Cancelled" : isUpdate ? "Updated invite" : "Invite"}: ${event.title}`;
  const text = inviteText(event, { isUpdate, isCancel });

  const invites = [];
  for (const a of attendees) {
    const contact = contacts.get(a.stakeholderId);
    if (!contact?.email) {
      invites.push({ stakeholder_id: a.stakeholderId, status: "skipped", reason: "no email on file" });
      continue;
    }
    try {
      const result = await sendInviteEmail({ to: contact.email, subject, text, icsContent, method });
      invites.push({ stakeholder_id: a.stakeholderId, email: contact.email, status: "sent", ...result });
    } catch (err) {
      invites.push({ stakeholder_id: a.stakeholderId, email: contact.email, status: "failed", error: err.message });
    }
  }
  return invites;
}
