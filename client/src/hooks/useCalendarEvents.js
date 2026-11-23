import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { listCalendarEvents } from "../api/calendar.js";
import { useOrg } from "../context/OrgContext.jsx";
import { useResource } from "./useResource.js";

// Meetings for the month grid around `date` — including the leading and
// trailing days from neighbouring months, so their meetings show too —
// mapped to react-big-calendar's event shape.
export function useCalendarEvents(date) {
  const { organization } = useOrg();
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 }).toISOString();
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 }).toISOString();
  const { data, reload } = useResource(async () => {
    const events = await listCalendarEvents(organization.id, start, end);
    return events.map((e) => ({
      id: e.id,
      title: e.title,
      start: new Date(e.start_time),
      end: new Date(e.end_time),
      location: e.location,
    }));
  }, [organization, start, end]);
  return { events: data ?? [], reload };
}
