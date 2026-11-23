import { listActionItems, listMilestones, listProjects } from "../api/projects.js";
import { useOrg } from "../context/OrgContext.jsx";
import { useResource } from "./useResource.js";

// The projects the user may see, with their milestones and action items.
// canViewDetails: PMO, admin, Project Lead and Project Sponsor may open a
// project's detail page.
export function useDashboard() {
  const { organization } = useOrg();
  const { data, error, reload } = useResource(async () => {
    const [projects, milestones, actionItems] = await Promise.all([
      listProjects(organization.id),
      listMilestones(organization.id),
      listActionItems(organization.id),
    ]);
    return { ...projects, milestones, actionItems };
  }, [organization]);

  return {
    loading: !data && !error,
    error,
    reload,
    subProjects: data?.subProjects ?? [],
    canViewDetails: data?.canViewDetails ?? false,
    milestonesFor: (id) => (data?.milestones ?? []).filter((m) => m.sub_project_id === id),
    actionItemsFor: (id) => (data?.actionItems ?? []).filter((a) => a.sub_project_id === id),
  };
}
