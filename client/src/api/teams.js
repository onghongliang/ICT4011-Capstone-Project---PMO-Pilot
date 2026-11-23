import { api, qs, unwrap } from "./http.js";

export async function getTeamStructure(organizationId) {
  return unwrap(await api.get(`/api/teams${qs({ organization_id: organizationId })}`));
}

// Who a steering committee involves (Sponsor, Project Lead, Process Owners).
export async function getSteercoAttendees(organizationId) {
  return unwrap(await api.get(`/api/teams/steerco${qs({ organization_id: organizationId })}`)).attendees;
}
