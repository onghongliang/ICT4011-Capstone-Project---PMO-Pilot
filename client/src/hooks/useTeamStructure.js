import { getTeamStructure } from "../api/teams.js";
import { useOrg } from "../context/OrgContext.jsx";
import { useResource } from "./useResource.js";

// Sponsor, PMO office and the teams the user may see.
export function useTeamStructure() {
  const { organization } = useOrg();
  const { data, error } = useResource(() => getTeamStructure(organization.id), [organization]);
  return { structure: data, error, loading: !data && !error };
}
