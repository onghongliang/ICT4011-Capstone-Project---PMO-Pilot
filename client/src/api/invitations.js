import { api, qs, unwrap } from "./http.js";

export async function listMyInvitations() {
  return unwrap(await api.get("/api/invitations")).invitations;
}

export async function acceptInvitation(calendarEventId) {
  return unwrap(await api.patch(`/api/invitations/${calendarEventId}`, { response_status: "accepted" })).invitation;
}

export async function declineInvitation(calendarEventId, { reason, suggestedStartTime }) {
  return unwrap(
    await api.patch(`/api/invitations/${calendarEventId}`, {
      response_status: "declined",
      decline_reason: reason,
      suggested_start_time: suggestedStartTime,
    })
  ).invitation;
}

// The PMO's queue of open declines.
export async function listDeclines(organizationId) {
  return unwrap(await api.get(`/api/invitations/declines${qs({ organization_id: organizationId })}`)).declines;
}

export async function dismissDecline(attendeeId) {
  unwrap(await api.post(`/api/invitations/declines/${attendeeId}/dismiss`));
}
