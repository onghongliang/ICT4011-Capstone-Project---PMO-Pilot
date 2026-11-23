import * as ActionItems from "../models/actionItems.model.js";
import * as CalendarEvents from "../models/calendarEvents.model.js";
import * as Milestones from "../models/milestones.model.js";
import * as SubProjects from "../models/subProjects.model.js";
import * as Teams from "../models/teams.model.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";
import { hasOversight, visibleSubProjectIds } from "./access.service.js";

// The projects a user may see; oversight also unlocks the detail view.
export async function listProjects({ user, organizationId, status }) {
  const ids = await visibleSubProjectIds(user);
  const subProjects = await SubProjects.list({ organizationId, ids, status });
  return { subProjects, canViewDetails: ids === null };
}

// Everything about one project for its detail page (oversight only).
export async function getOverview({ user, subProjectId }) {
  if (!(await hasOversight(user))) throw new ForbiddenError();
  const [subProject, leadership, members, milestones, actionItems, meetings] = await Promise.all([
    SubProjects.findById(subProjectId),
    Teams.leadershipOf(subProjectId),
    Teams.membersOf(subProjectId, { orderByTitle: true }),
    Milestones.forSubProject(subProjectId),
    ActionItems.forSubProject(subProjectId),
    CalendarEvents.forSubProject(subProjectId),
  ]);
  if (!subProject) throw new NotFoundError("sub_project not found");
  return { subProject, leadership, members, milestones, actionItems, meetings };
}
