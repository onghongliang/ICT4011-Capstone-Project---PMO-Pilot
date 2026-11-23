import "dotenv/config";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";

import { pool } from "./pool.js";
faker.seed(42);

const SG_NAME_POOL = [
  { firstName: "Wei Ming", lastName: "Tan" },
  { firstName: "Hui Min", lastName: "Lim" },
  { firstName: "Jia Hao", lastName: "Lee" },
  { firstName: "Mei Ling", lastName: "Ng" },
  { firstName: "Zhi Wei", lastName: "Ong" },
  { firstName: "Xin Yi", lastName: "Wong" },
  { firstName: "Jun Jie", lastName: "Chua" },
  { firstName: "Li Ying", lastName: "Koh" },
  { firstName: "Kai Xin", lastName: "Goh" },
  { firstName: "Shu Hui", lastName: "Teo" },
  { firstName: "Yong Jie", lastName: "Chong" },
  { firstName: "Hui Ling", lastName: "Yeo" },
  { firstName: "Wen Jie", lastName: "Low" },
  { firstName: "Pei Shan", lastName: "Heng" },
  { firstName: "Jing Wei", lastName: "Sim" },
  { firstName: "Muhammad Haziq", lastName: "Rahman" },
  { firstName: "Nur Aisyah", lastName: "Ismail" },
  { firstName: "Ahmad Faizal", lastName: "Hassan" },
  { firstName: "Siti Nurhaliza", lastName: "Yusof" },
  { firstName: "Mohamed Farid", lastName: "Ibrahim" },
  { firstName: "Nurul Huda", lastName: "Abdullah" },
  { firstName: "Raj", lastName: "Kumar" },
  { firstName: "Priya", lastName: "Sharma" },
  { firstName: "Suresh", lastName: "Nair" },
  { firstName: "Kavitha", lastName: "Rajendran" },
  { firstName: "Arun", lastName: "Prakash" },
  { firstName: "Deepa", lastName: "Krishnan" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

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
  {
    name: "Budget & Planning",
    code: "BP-01",
    status: "planning",
    description: "Annual budget preparation, quarterly forecasting and resource allocation across departments.",
  },
  {
    name: "IT",
    code: "IT-02",
    status: "planning",
    description: "Core systems upgrade, infrastructure support and IT service improvements.",
  },
  {
    name: "Research",
    code: "RS-03",
    status: "planning",
    description: "Policy and market research to inform programme decisions, including surveys and data analysis.",
  },
  {
    name: "Tax",
    code: "TX-04",
    status: "planning",
    description: "Tax compliance review and preparation for upcoming regulatory changes.",
  },
  {
    name: "Strategy",
    code: "ST-05",
    status: "planning",
    description: "Organisation-wide strategic planning, KPI tracking and progress reporting to senior management.",
  },
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Everything FKs back to organizations (directly or transitively), so
    // truncating it with CASCADE clears the whole dataset in one shot.
    await client.query("TRUNCATE TABLE organizations CASCADE");

    const orgName = "SIT PMO";
    const orgSlug = "sitpmo";
    const orgId = await insertOne(
      client,
      `INSERT INTO organizations (name, slug, timezone) VALUES ($1, $2, $3)`,
      [orgName, orgSlug, "Asia/Singapore"]
    );

    // --- admin login --------------------------------------------------------
    // Not organization-scoped (app-level access, separate from the PMO domain
    // model), so it isn't cleared by the TRUNCATE above — reset explicitly on
    // every reseed so credentials stay the known/documented default.
    const adminUsername = "admin";
    const adminPassword = process.env.ADMIN_SEED_PASSWORD || "sitpmo-admin";
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
    await client.query(
      `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'admin')
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'`,
      [adminUsername, adminPasswordHash]
    );

    // Every stakeholder (PMO officers included) gets a login, all sharing one
    // demo password. Hashed once up front since bcrypt is deliberately slow.
    // These rows cascade away with the TRUNCATE above (via stakeholder_id),
    // so they're simply recreated on every reseed.
    const userPassword = process.env.USER_SEED_PASSWORD || "password";
    const userPasswordHash = await bcrypt.hash(userPassword, 10);
    const seededLogins = [];
    async function createLogin(stakeholderId, email, fullName, role) {
      const username = email.split("@")[0];
      await client.query(
        `INSERT INTO users (username, password_hash, stakeholder_id, role) VALUES ($1, $2, $3, $4)
         ON CONFLICT (username) DO UPDATE
           SET password_hash = EXCLUDED.password_hash, stakeholder_id = EXCLUDED.stakeholder_id, role = EXCLUDED.role`,
        [username, userPasswordHash, stakeholderId, role]
      );
      seededLogins.push({ username, fullName, role });
    }

    // --- role_types -------------------------------------------------------
    const roleTypeDefs = [
      { code: "project_lead", label: "Project Lead", is_mandatory_default: true },
      { code: "pic", label: "PIC", is_mandatory_default: true },
      { code: "process_owner", label: "Process Owner", is_mandatory_default: false },
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
    // 1 Project Lead + 5 PICs (one per sub-project) + 3 process owners (shared
    // across sub-projects) + 9 general contributors.
    const shuffledNames = faker.helpers.shuffle([...SG_NAME_POOL]);
    let nextNameIndex = 0;
    function makeStakeholder(title) {
      const { firstName, lastName } = shuffledNames[nextNameIndex];
      nextNameIndex += 1;
      return { firstName, lastName, title };
    }

    const stakeholderDefs = [
      makeStakeholder("Project Lead"),
      ...SUB_PROJECT_DEFS.map(() => makeStakeholder("PIC")),
      makeStakeholder("Process Owner"),
      makeStakeholder("Process Owner"),
      makeStakeholder("Process Owner"),
      ...Array.from({ length: 9 }, () => makeStakeholder(pick(["Business Analyst", "Project Coordinator", "Technical Lead", "QA Lead", "Change Manager"]))),
    ];

    const stakeholderIds = [];
    for (const s of stakeholderDefs) {
      const emailFirstName = s.firstName.replace(/\s+/g, ".");
      const email = `${emailFirstName}.${s.lastName}@${orgSlug}.test`.toLowerCase();
      const id = await insertOne(
        client,
        `INSERT INTO stakeholders (organization_id, full_name, email, phone, title)
         VALUES ($1, $2, $3, $4, $5)`,
        [orgId, `${s.firstName} ${s.lastName}`, email, faker.phone.number(), s.title]
      );
      stakeholderIds.push(id);
      await createLogin(id, email, `${s.firstName} ${s.lastName}`, "stakeholder");
    }

    // --- PMO officers -----------------------------------------------------------
    // Fixed (non-Faker) data so adding them doesn't shift the seeded random
    // sequence for everything below.
    const pmoDefs = [
      { fullName: "John Tan", username: "john.tan", phone: "+65 9123 4567" },
      { fullName: "Kevin Ng", username: "kevin.ng", phone: "+65 9234 5678" },
    ];
    for (const pmo of pmoDefs) {
      const email = `${pmo.username}@${orgSlug}.test`;
      const stakeholderId = await insertOne(
        client,
        `INSERT INTO stakeholders (organization_id, full_name, email, phone, title)
         VALUES ($1, $2, $3, $4, $5)`,
        [orgId, pmo.fullName, email, pmo.phone, "PMO Officer"]
      );
      await createLogin(stakeholderId, email, pmo.fullName, "pmo");
    }

    // --- Project Sponsor ---------------------------------------------------------
    // Organisation-wide (not tied to a sub-project), so it's recorded on the
    // organisation; steering committee meetings always include them.
    {
      const email = `tony.lim@${orgSlug}.test`;
      const sponsorId = await insertOne(
        client,
        `INSERT INTO stakeholders (organization_id, full_name, email, phone, title)
         VALUES ($1, $2, $3, $4, $5)`,
        [orgId, "Tony Lim", email, "+65 9345 6789", "Project Sponsor"]
      );
      await client.query(`UPDATE organizations SET sponsor_stakeholder_id = $1 WHERE id = $2`, [sponsorId, orgId]);
      await createLogin(sponsorId, email, "Tony Lim", "stakeholder");
    }

    const projectLeadId = stakeholderIds[0];
    const picIds = stakeholderIds.slice(1, 1 + SUB_PROJECT_DEFS.length);
    const processOwnerIds = stakeholderIds.slice(1 + SUB_PROJECT_DEFS.length, 1 + SUB_PROJECT_DEFS.length + 3);
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
          def.description,
          def.status,
          dateOnly(new Date(Date.now() - 120 * DAY_MS)),
          dateOnly(new Date(Date.now() + 180 * DAY_MS)),
        ]
      );
      subProjects.push({ ...def, id });
    }

    // --- sub_project_roles ---------------------------------------------------
    // One Project Lead across every sub-project, a distinct PIC per
    // sub-project, and Process Owners shared across a couple each (as one
    // process owner typically spans several in practice).
    for (const [index, sp] of subProjects.entries()) {
      const picId = picIds[index];
      const processOwnerId = processOwnerIds[index % processOwnerIds.length];

      await insertOne(
        client,
        `INSERT INTO sub_project_roles (organization_id, sub_project_id, role_type_id, stakeholder_id, is_mandatory, effective_from)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orgId, sp.id, roleTypeIdByCode.project_lead, projectLeadId, null, dateOnly(new Date(Date.now() - 120 * DAY_MS))]
      );
      await insertOne(
        client,
        `INSERT INTO sub_project_roles (organization_id, sub_project_id, role_type_id, stakeholder_id, is_mandatory, effective_from)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orgId, sp.id, roleTypeIdByCode.pic, picId, null, dateOnly(new Date(Date.now() - 120 * DAY_MS))]
      );
      // Demonstrates the per-assignment override: on IT the Process Owner is
      // mandatory, overriding the role type's default (optional).
      const processOwnerIsMandatory = sp.code === "IT-02" ? true : null;
      await insertOne(
        client,
        `INSERT INTO sub_project_roles (organization_id, sub_project_id, role_type_id, stakeholder_id, is_mandatory, effective_from)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orgId, sp.id, roleTypeIdByCode.process_owner, processOwnerId, processOwnerIsMandatory, dateOnly(new Date(Date.now() - 120 * DAY_MS))]
      );
    }

    // --- sub_project_members ----------------------------------------------------
    // Each general contributor sits on one sub-project team (round-robin, so
    // 9 contributors over 5 teams = 2/2/2/2/1).
    const membersBySubProject = {};
    async function addMember(sp, stakeholderId) {
      await client.query(
        `INSERT INTO sub_project_members (organization_id, sub_project_id, stakeholder_id) VALUES ($1, $2, $3)`,
        [orgId, sp.id, stakeholderId]
      );
      (membersBySubProject[sp.id] ??= []).push(stakeholderId);
    }
    for (const [index, contributorId] of contributorIds.entries()) {
      await addMember(subProjects[index % subProjects.length], contributorId);
    }

    // Two developers under each sub-project's PIC. Fixed names (not drawn
    // from SG_NAME_POOL) so adding them doesn't reshuffle everyone else's
    // seeded names/usernames.
    const DEVELOPER_NAMES = [
      ["Ethan Lim", "Chloe Tan"],
      ["Marcus Ong", "Rachel Goh"],
      ["Darren Teo", "Aisha Rahim"],
      ["Vikram Menon", "Bryan Chew"],
      ["Nicole Ho", "Farhan Aziz"],
    ];
    for (const [index, sp] of subProjects.entries()) {
      for (const [devIndex, fullName] of DEVELOPER_NAMES[index].entries()) {
        const email = `${fullName.toLowerCase().replace(/\s+/g, ".")}@${orgSlug}.test`;
        const stakeholderId = await insertOne(
          client,
          `INSERT INTO stakeholders (organization_id, full_name, email, phone, title)
           VALUES ($1, $2, $3, $4, $5)`,
          [orgId, fullName, email, `+65 8${index}${devIndex}0 ${1000 + index * 10 + devIndex}`, "Developer"]
        );
        await createLogin(stakeholderId, email, fullName, "stakeholder");
        await addMember(sp, stakeholderId);
      }
    }

    // --- milestones / action_items --------------------------------------------
    // None seeded: every sub-project is still in planning, so milestones are
    // TBC and there are no action items until work is planned in the app.

    // --- calendar_events --------------------------------------------------------
    // No meetings are seeded: the calendar starts empty, and every meeting is
    // booked through the app (booking chat, meeting requests, kick-offs).

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
    // A sub-project-specific freeze about three weeks out, so a
    // blackout-aware availability query has something to down-weight.
    await client.query(
      `INSERT INTO blackout_periods (organization_id, sub_project_id, name, start_date, end_date, recurrence_rule, weight)
       VALUES ($1, $2, $3, $4, $5, NULL, $6)`,
      [
        orgId,
        subProjects.find((sp) => sp.code === "IT-02").id,
        "IT-02 System Upgrade Change Freeze",
        dateOnly(new Date(Date.now() + 18 * DAY_MS)),
        dateOnly(new Date(Date.now() + 25 * DAY_MS)),
        0.6,
      ]
    );

    // --- meeting_requests -------------------------------------------------------
    // None seeded: no project has started, so notifications start empty and
    // fill up as people request, book and respond to meetings in the app.

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
    console.log(`Admin login: username="${adminUsername}" password="${adminPassword}"`);
    console.log(`User logins (password "${userPassword}" for all):`);
    console.table(seededLogins);
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
