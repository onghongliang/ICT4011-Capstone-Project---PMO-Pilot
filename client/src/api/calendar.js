import { api, qs, unwrap } from "./http.js";

export async function listCalendarEvents(organizationId, start, end) {
  return unwrap(await api.get(`/api/calendar-events${qs({ organization_id: organizationId, start, end })}`)).calendar_events;
}

// { calendar_event, attendees }
export async function getCalendarEvent(id) {
  return unwrap(await api.get(`/api/calendar-events/${id}`));
}

// Resolves to the body: status "ok" (booked) or "conflict" (with availability).
export async function bookMeeting(body) {
  return unwrap(await api.post("/api/calendar-events", body));
}

// Same "ok" / "conflict" contract as bookMeeting.
export async function rescheduleMeeting(id, body) {
  return unwrap(await api.post(`/api/calendar-events/${id}/reschedule`, body));
}

export async function cancelMeeting(id, reason) {
  return unwrap(await api.post(`/api/calendar-events/${id}/cancel`, { reason }));
}

export async function checkAvailability(body) {
  return unwrap(await api.post("/api/availability/query", body));
}
