import { isPmo } from "../middleware/requireRole.js";
import * as Organizations from "../models/organizations.model.js";
import * as Teams from "../models/teams.model.js";

// Who may see what. Oversight users — PMO/admin by access level, plus the
// Project Sponsor and Project Lead by position (they sit over every
// sub-project) — see all projects, teams and people and can open a
// project's detail view. Everyone else sees only their own teams.

export async function hasOversight(user) {
  if (isPmo(user)) return true;
  if (!user.stakeholder_id) return false;
  return (await Organizations.isSponsor(user.stakeholder_id)) || (await Teams.isProjectLead(user.stakeholder_id));
}

// null = all sub-projects; otherwise the ids of the user's own.
export async function visibleSubProjectIds(user) {
  if (await hasOversight(user)) return null;
  return Teams.subProjectIdsFor(user.stakeholder_id);
}

// null = everyone; otherwise a Set of stakeholder ids the user may see.
export async function visibleStakeholderIds(user) {
  if (await hasOversight(user)) return null;
  return Teams.visibleStakeholderIdsFor(user.stakeholder_id);
}
