import { isPmo } from "../middleware/requireRole.js";
import * as Organizations from "../models/organizations.model.js";
import * as Stakeholders from "../models/stakeholders.model.js";
import * as SubProjects from "../models/subProjects.model.js";
import * as Teams from "../models/teams.model.js";
import * as Users from "../models/users.model.js";
import { hasOversight } from "./access.service.js";

// PMO officers are invited to every meeting the PMO books (optional), and
// the Project Lead — in charge of everything — to every meeting (required).
export const pmoOfficerIds = Users.pmoStakeholderIds;
export const projectLeadIds = Teams.projectLeadIds;

// Who a steering committee involves: the Project Sponsor, the Project
// Lead(s) and every Process Owner — all required, nobody else from the
// project teams.
export async function steercoAttendees(organizationId) {
  const [sponsor, holders] = await Promise.all([
    Organizations.findSponsor(organizationId),
    Teams.steercoRoleHolders(organizationId),
  ]);
  const attendees = [];
  if (sponsor) {
    attendees.push({ stakeholder_id: sponsor.id, full_name: sponsor.full_name, label: "Project Sponsor", is_mandatory: true });
  }
  // Project Lead first, then Process Owners, each alphabetical.
  holders.sort((a, b) =>
    a.code === b.code ? a.full_name.localeCompare(b.full_name) : a.code === "project_lead" ? -1 : 1
  );
  for (const h of holders) {
    if (h.stakeholder_id === sponsor?.id) continue;
    attendees.push({ stakeholder_id: h.stakeholder_id, full_name: h.full_name, label: h.label, is_mandatory: true });
  }
  return attendees;
}

// The team structure page: sponsor, PMO office and, per sub-project, its
// leadership and members. Without oversight, only the user's own teams;
// only PMO/admin also get the people not on any team.
export async function getTeamStructure({ organizationId, user }) {
  const ids = (await hasOversight(user)) ? null : await Teams.subProjectIdsFor(user.stakeholder_id);
  const [subProjects, leadership, members, pmoOffice, sponsor, unassigned] = await Promise.all([
    SubProjects.listByCode({ organizationId, ids }),
    Teams.allLeadership(organizationId),
    Teams.allMembers(organizationId),
    Users.pmoOffice(organizationId),
    Organizations.findSponsor(organizationId),
    isPmo(user) ? Stakeholders.findUnassigned(organizationId) : [],
  ]);
  const teams = subProjects.map((sp) => ({
    sub_project: sp,
    leadership: leadership.filter((r) => r.sub_project_id === sp.id),
    members: members.filter((m) => m.sub_project_id === sp.id),
  }));
  return { sponsor, pmo_office: pmoOffice, teams, unassigned };
}
