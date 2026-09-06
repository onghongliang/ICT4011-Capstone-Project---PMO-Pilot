import { randomUUID } from "node:crypto";
import "dotenv/config";
import { faker } from "@faker-js/faker";

import { pool } from "./pool.js";

// Fixed seed so re-running produces the same synthetic dataset (useful for
// demos/grading where "run it again" should look identical).
faker.seed(42);

const DAY_MS = 24 * 60 * 60 * 1000;

// Picks the start hour once and derives `end` from it, so the two never
// land on independently-randomized hours (which could put end before start).
function meetingWindow(dayOffset, durationMinutes, hour = faker.number.int({ min: 9, max: 16 })) {
  const start = new Date(Date.now() + dayOffset * DAY_MS);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return { start, end };
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function pick(arr) {
  return faker.helpers.arrayElement(arr);
}

async function insertOne(client, sql, values) {
  const result = await client.query(`${sql} RETURNING id`, values);
  return result.rows[0].id;
}

const SUB_PROJECT_DEFS = [
  { name: "Digital Transformation Programme", code: "DX-01", status: "active" },
  { name: "Data Migration & Integration", code: "DM-02", status: "active" },
  { name: "Customer Portal Revamp", code: "CP-03", status: "active" },
  { name: "Infrastructure Modernization", code: "IM-04", status: "planning" },
  { name: "Change Management & Training", code: "CM-05", status: "active" },
];

const MILESTONE_TEMPLATES = [
  "Requirements Sign-off",
  "Design Review Complete",
  "UAT Completion",
  "Go-Live Readiness Review",
  "Post-Implementation Review",
];

const ACTION_ITEM_STATUS_POOL = [
  "open", "open", "in_progress", "in_progress", "in_progress", "blocked", "done", "done", "cancelled",
];

const PRIORITY_POOL = ["low", "medium", "medium", "high", "critical"];

const MEETING_LOCATIONS = ["Conference Room A", "Conference Room B", "Board Room", "Microsoft Teams", "Zoom"];

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Everything FKs back to organizations (directly or transitively), so
    // truncating it with CASCADE clears the whole dataset in one shot.
    await client.query("TRUNCATE TABLE organizations CASCADE");

    const orgName = "Northfield Program Management Office";
    const orgSlug = "northfield-pmo";
    const orgId = await insertOne(
      client,
      `INSERT INTO organizations (name, slug, timezone) VALUES ($1, $2, $3)`,
      [orgName, orgSlug, "Asia/Singapore"]
    );

    // --- role_types -------------------------------------------------------
    const roleTypeDefs = [
      { code: "program_head", label: "Program Head", is_mandatory_default: true },
      { code: "sub_project_pic", label: "Sub-Project PIC", is_mandatory_default: true },
      { code: "sponsor", label: "Executive Sponsor", is_mandatory_default: false },
      { code: "contributor", label: "Contributor", is_mandatory_default: false },
    ];
    const roleTypeIdByCode = {};
    for (const rt of roleTypeDefs) {
      roleTypeIdByCode[rt.code] = await insertOne(
        client,
        `INSERT INTO role_types (organization_id, code, label, is_mandatory_default) VALUES ($1, $2, $3, $4)`,
        [orgId, rt.code, rt.label, rt.is_mandatory_default]
      );
    }

    // --- stakeholders -------------------------------------------------------
    // 1 Program Head + 5 PICs (one per sub-project) + 3 sponsors (shared
    // across sub-projects) + 9 general contributors.
    function makeStakeholder(title) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      return { firstName, lastName, title };
    }

    const stakeholderDefs = [
      makeStakeholder("Program Head"),
      ...SUB_PROJECT_DEFS.map(() => makeStakeholder("Sub-Project PIC")),
      makeStakeholder("Executive Sponsor"),
      makeStakeholder("Executive Sponsor"),
      makeStakeholder("Executive Sponsor"),
      ...Array.from({ length: 9 }, () => makeStakeholder(pick(["Business Analyst", "Project Coordinator", "Technical Lead", "QA Lead", "Change Manager"]))),
    ];

    const stakeholderIds = [];
    for (const s of stakeholderDefs) {
      const email = `${s.firstName}.${s.lastName}@${orgSlug}.test`.toLowerCase();
      const id = await insertOne(
        client,
        `INSERT INTO stakeholders (organization_id, full_name, email, phone, title)
         VALUES ($1, $2, $3, $4, $5)`,
        [orgId, `${s.firstName} ${s.lastName}`, email, faker.phone.number(), s.title]
      );
      stakeholderIds.push(id);
    }

    const programHeadId = stakeholderIds[0];
    const picIds = stakeholderIds.slice(1, 1 + SUB_PROJECT_DEFS.length);
    const sponsorIds = stakeholderIds.slice(1 + SUB_PROJECT_DEFS.length, 1 + SUB_PROJECT_DEFS.length + 3);
    const contributorIds = stakeholderIds.slice(1 + SUB_PROJECT_DEFS.length + 3);

    // --- sub_projects -------------------------------------------------------
    const subProjects = [];
    for (const def of SUB_PROJECT_DEFS) {
      const id = await insertOne(
        client,
        `INSERT INTO sub_projects (organization_id, name, code, description, status, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          orgId,
          def.name,
          def.code,
          faker.company.catchPhrase(),
          def.status,
          dateOnly(new Date(Date.now() - 120 * DAY_MS)),
          dateOnly(new Date(Date.now() + 180 * DAY_MS)),
        ]
      );
      subProjects.push({ ...def, id });
    }

    // --- sub_project_roles ---------------------------------------------------
    // Program Head is the same person across every sub-project; PIC is
    // distinct per sub-project; sponsors are shared across a couple of
    // tracks each, reflecting how one exec typically sponsors multiple
    // sub-projects in practice.
    const roleAssignments = {}; // subProjectId -> { program_head, sub_project_pic, sponsor }
    for (const [index, sp] of subProjects.entries()) {
      const picId = picIds[index];
      const sponsorId = sponsorIds[index % sponsorIds.length];

      await insertOne(
        client,
        `INSERT INTO sub_project_roles (organization_id, sub_project_id, role_type_id, stakeholder_id, is_mandatory, effective_from)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orgId, sp.id, roleTypeIdByCode.program_head, programHeadId, null, dateOnly(new Date(Date.now() - 120 * DAY_MS))]
      );
      await insertOne(
        client,
        `INSERT INTO sub_project_roles (organization_id, sub_project_id, role_type_id, stakeholder_id, is_mandatory, effective_from)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orgId, sp.id, roleTypeIdByCode.sub_project_pic, picId, null, dateOnly(new Date(Date.now() - 120 * DAY_MS))]
      );
      // Demonstrates the per-assignment override: on Data Migration, the
      // sponsor has explicitly asked to be treated as mandatory, overriding
      // the role_types default of false for 'sponsor'.
      const sponsorIsMandatory = sp.code === "DM-02" ? true : null;
      await insertOne(
        client,
        `INSERT INTO sub_project_roles (organization_id, sub_project_id, role_type_id, stakeholder_id, is_mandatory, effective_from)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orgId, sp.id, roleTypeIdByCode.sponsor, sponsorId, sponsorIsMandatory, dateOnly(new Date(Date.now() - 120 * DAY_MS))]
      );

      roleAssignments[sp.id] = {
        program_head: { stakeholderId: programHeadId, isMandatory: true },
        sub_project_pic: { stakeholderId: picId, isMandatory: true },
        sponsor: { stakeholderId: sponsorId, isMandatory: sponsorIsMandatory ?? false },
      };
    }

    // --- milestones -------------------------------------------------------
    const milestonesBySubProject = {};
    for (const sp of subProjects) {
      const milestones = [];
      for (let i = 0; i < MILESTONE_TEMPLATES.length; i++) {
        const offsetDays = -60 + i * 35; // spread across past and future
        const dueDate = new Date(Date.now() + offsetDays * DAY_MS);
        const status = offsetDays < -10
          ? pick(["completed", "completed", "delayed"])
          : offsetDays < 15
            ? pick(["at_risk", "in_progress"])
            : "pending";
        const id = await insertOne(
          client,
          `INSERT INTO milestones (organization_id, sub_project_id, name, description, due_date, status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orgId, sp.id, `${sp.code}: ${MILESTONE_TEMPLATES[i]}`, faker.lorem.sentence(), dateOnly(dueDate), status]
        );
        milestones.push({ id, dueDate, status });
      }
      milestonesBySubProject[sp.id] = milestones;
    }

    // --- action_items -------------------------------------------------------
    for (const sp of subProjects) {
      const milestones = milestonesBySubProject[sp.id];
      for (let i = 0; i < 5; i++) {
        const status = pick(ACTION_ITEM_STATUS_POOL);
        const priority = pick(PRIORITY_POOL);
        const assignee = pick([...contributorIds, roleAssignments[sp.id].sub_project_pic.stakeholderId]);
        const milestone = faker.datatype.boolean({ probability: 0.6 }) ? pick(milestones) : null;
        const dueOffset = faker.number.int({ min: -20, max: 40 });
        await client.query(
          `INSERT INTO action_items (organization_id, sub_project_id, milestone_id, title, description, assignee_stakeholder_id, status, priority, due_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            orgId,
            sp.id,
            milestone?.id ?? null,
            faker.hacker.phrase().replace(/^./, (c) => c.toUpperCase()),
            faker.lorem.sentence(),
            assignee,
            status,
            priority,
            dateOnly(new Date(Date.now() + dueOffset * DAY_MS)),
          ]
        );
      }
    }

    // --- calendar_events + attendees -----------------------------------------
    async function createEvent({ subProjectId, title, meetingType, start, end, status, includeSponsor }) {
      const eventId = await insertOne(
        client,
        `INSERT INTO calendar_events (organization_id, sub_project_id, title, meeting_type, start_time, end_time, location, status, ics_uid, created_by_stakeholder_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          orgId,
          subProjectId,
          title,
          meetingType,
          start,
          end,
          pick(MEETING_LOCATIONS),
          status,
          `${randomUUID()}@pmo-pilot.local`,
          programHeadId,
        ]
      );

      const isPast = end < new Date();
      const attendeeResponsePool = isPast
        ? ["accepted", "accepted", "declined"]
        : ["needs_action", "accepted", "tentative"];

      const attendees = [];
      if (subProjectId) {
        const roles = roleAssignments[subProjectId];
        attendees.push({ ...roles.program_head, roleTypeId: roleTypeIdByCode.program_head });
        attendees.push({ ...roles.sub_project_pic, roleTypeId: roleTypeIdByCode.sub_project_pic });
        if (includeSponsor) {
          attendees.push({ ...roles.sponsor, roleTypeId: roleTypeIdByCode.sponsor });
        }
      } else {
        // Org-wide steering committee: Program Head + every sub-project's PIC.
        attendees.push({ stakeholderId: programHeadId, isMandatory: true, roleTypeId: roleTypeIdByCode.program_head });
        for (const sp of subProjects) {
          attendees.push({ ...roleAssignments[sp.id].sub_project_pic, roleTypeId: roleTypeIdByCode.sub_project_pic });
        }
      }
      const contributorAttendee = pick(contributorIds);
      attendees.push({ stakeholderId: contributorAttendee, isMandatory: false, roleTypeId: roleTypeIdByCode.contributor });

      for (const a of attendees) {
        await client.query(
          `INSERT INTO calendar_event_attendees (calendar_event_id, stakeholder_id, role_type_id, is_mandatory, response_status)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (calendar_event_id, stakeholder_id) DO NOTHING`,
          [eventId, a.stakeholderId, a.roleTypeId, a.isMandatory, pick(attendeeResponsePool)]
        );
      }

      return eventId;
    }

    // All sub-projects share one Program Head, so every sub-project's
    // recurring meetings on the same relative day are staggered by index
    // (rather than each independently picking a random hour) to avoid
    // *accidental* Program Head double-bookings drowning out the one
    // deliberate conflict fixture created further below.
    for (const [index, sp] of subProjects.entries()) {
      {
        const { start, end } = meetingWindow(-7, 60, 9 + index);
        await createEvent({
          subProjectId: sp.id,
          title: `${sp.name} - Track Sync`,
          meetingType: "track_sync",
          start,
          end,
          status: "completed",
          includeSponsor: false,
        });
      }
      {
        const { start, end } = meetingWindow(7, 60, 9 + index);
        await createEvent({
          subProjectId: sp.id,
          title: `${sp.name} - Track Sync`,
          meetingType: "track_sync",
          start,
          end,
          status: "scheduled",
          includeSponsor: false,
        });
      }
      {
        const { start, end } = meetingWindow(21, 90, 9 + index * 2);
        await createEvent({
          subProjectId: sp.id,
          title: `${sp.name} - Milestone Review`,
          meetingType: "milestone_review",
          start,
          end,
          status: "scheduled",
          includeSponsor: true,
        });
      }
    }

    {
      const { start, end } = meetingWindow(10, 60, 10);
      await createEvent({
        subProjectId: null,
        title: "Quarterly Steering Committee",
        meetingType: "steering_committee",
        start,
        end,
        status: "scheduled",
        includeSponsor: false,
      });
    }

    // Deliberate double-booking: the shared Program Head is mandatory on both
    // this event and the DX-01 track sync below, at an overlapping time —
    // a fixture for testing the availability-query endpoint's conflict
    // attribution, not something an intelligent scheduler would ever produce.
    const dx01 = subProjects.find((sp) => sp.code === "DX-01");
    {
      const { start, end } = meetingWindow(10, 60, 10);
      await createEvent({
        subProjectId: dx01.id,
        title: `${dx01.name} - Urgent Scope Discussion`,
        meetingType: "ad_hoc",
        start,
        end,
        status: "scheduled",
        includeSponsor: false,
      });
    }

    // --- blackout_periods -------------------------------------------------------
    await client.query(
      `INSERT INTO blackout_periods (organization_id, sub_project_id, name, start_date, end_date, recurrence_rule, weight)
       VALUES ($1, NULL, $2, $3, $4, $5, $6)`,
      [
        orgId,
        "Quarter-Start Planning Freeze",
        "2026-01-01",
        "2026-01-14",
        "FREQ=YEARLY;BYMONTH=1,4,7,10;BYMONTHDAY=1-14",
        0.7,
      ]
    );
    await client.query(
      `INSERT INTO blackout_periods (organization_id, sub_project_id, name, start_date, end_date, recurrence_rule, weight)
       VALUES ($1, NULL, $2, $3, $4, NULL, $5)`,
      [orgId, "National Day Public Holiday", dateOnly(new Date(Date.now() + 40 * DAY_MS)), dateOnly(new Date(Date.now() + 40 * DAY_MS)), 0.9]
    );
    // Deliberate overlap with the DM-02 Milestone Review event (scheduled at
    // +21 days) so a blackout-aware availability query has something to
    // down-weight in the seed data, not just skip over.
    await client.query(
      `INSERT INTO blackout_periods (organization_id, sub_project_id, name, start_date, end_date, recurrence_rule, weight)
       VALUES ($1, $2, $3, $4, $5, NULL, $6)`,
      [
        orgId,
        subProjects.find((sp) => sp.code === "DM-02").id,
        "DM-02 UAT Change Freeze",
        dateOnly(new Date(Date.now() + 18 * DAY_MS)),
        dateOnly(new Date(Date.now() + 25 * DAY_MS)),
        0.6,
      ]
    );

    await client.query("COMMIT");

    const counts = await client.query(`
      SELECT
        (SELECT count(*) FROM organizations) AS organizations,
        (SELECT count(*) FROM stakeholders) AS stakeholders,
        (SELECT count(*) FROM sub_projects) AS sub_projects,
        (SELECT count(*) FROM role_types) AS role_types,
        (SELECT count(*) FROM sub_project_roles) AS sub_project_roles,
        (SELECT count(*) FROM milestones) AS milestones,
        (SELECT count(*) FROM action_items) AS action_items,
        (SELECT count(*) FROM calendar_events) AS calendar_events,
        (SELECT count(*) FROM calendar_event_attendees) AS calendar_event_attendees,
        (SELECT count(*) FROM blackout_periods) AS blackout_periods
    `);
    console.log("Seeded:", counts.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
