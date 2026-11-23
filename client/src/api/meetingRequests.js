import { api, qs, unwrap } from "./http.js";

export async function listMeetingRequests(organizationId, status) {
  return unwrap(await api.get(`/api/meeting-requests${qs({ organization_id: organizationId, status })}`)).meeting_requests;
}

export async function createMeetingRequest(body) {
  return unwrap(await api.post("/api/meeting-requests", body)).meeting_request;
}

export async function approveMeetingRequest(id, calendarEventId) {
  return unwrap(await api.patch(`/api/meeting-requests/${id}`, { status: "approved", calendar_event_id: calendarEventId }))
    .meeting_request;
}

export async function declineMeetingRequest(id) {
  return unwrap(await api.patch(`/api/meeting-requests/${id}`, { status: "declined" })).meeting_request;
}
