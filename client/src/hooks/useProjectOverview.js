import { getProjectOverview } from "../api/projects.js";
import { useResource } from "./useResource.js";

// One project's detail page data, with its meetings split into upcoming
// and past/cancelled.
export function useProjectOverview(id) {
  const { data, error, reload } = useResource(() => getProjectOverview(id), [id]);
  const now = new Date();
  const meetings = data?.meetings ?? [];
  const upcoming = meetings.filter((m) => m.status === "scheduled" && new Date(m.end_time) > now);
  return {
    loading: !data && !error,
    error,
    reload,
    project: data?.sub_project ?? null,
    leadership: data?.leadership ?? [],
    members: data?.members ?? [],
    milestones: data?.milestones ?? [],
    actionItems: data?.action_items ?? [],
    meetings,
    upcomingMeetings: upcoming,
    pastMeetings: meetings.filter((m) => !upcoming.includes(m)).reverse(),
  };
}
