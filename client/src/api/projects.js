import { api, qs, unwrap } from "./http.js";

// Sub-projects (with whether the user may open their detail page),
// milestones and action items — filtered server-side to what the user may see.
export async function listProjects(organizationId) {
  const data = unwrap(await api.get(`/api/sub-projects${qs({ organization_id: organizationId })}`));
  return { subProjects: data.sub_projects, canViewDetails: Boolean(data.can_view_details) };
}

export async function getProjectOverview(id) {
  return unwrap(await api.get(`/api/sub-projects/${id}/overview`));
}

export async function listProjectRoles(id) {
  return unwrap(await api.get(`/api/sub-projects/${id}/roles`)).roles;
}

export async function listProjectMembers(id) {
  return unwrap(await api.get(`/api/sub-projects/${id}/members`)).members;
}

export async function listMilestones(organizationId) {
  return unwrap(await api.get(`/api/milestones${qs({ organization_id: organizationId })}`)).milestones;
}

export async function listActionItems(organizationId) {
  return unwrap(await api.get(`/api/action-items${qs({ organization_id: organizationId })}`)).action_items;
}
