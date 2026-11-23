import { useState } from "react";
import { acceptInvitation, dismissDecline, listDeclines, listMyInvitations } from "../api/invitations.js";
import { approveMeetingRequest, declineMeetingRequest, listMeetingRequests } from "../api/meetingRequests.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useNotifications } from "../context/NotificationsContext.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import { useResource } from "./useResource.js";

// Everything on the Notifications page: the user's invitations, meeting
// requests (incoming for PMO, their own otherwise) and, for PMO, the decline
// queue — plus the actions on them. Every action reloads the page data and
// the nav badge.
export function useNotificationsPage() {
  const { user } = useAuth();
  const { organization } = useOrg();
  const { refresh: refreshBadge } = useNotifications();
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const { data, error, reload } = useResource(async () => {
    const [invitations, requests, declines] = await Promise.all([
      listMyInvitations(),
      listMeetingRequests(organization.id),
      user.canBook ? listDeclines(organization.id) : [],
    ]);
    refreshBadge();
    return { invitations, requests, declines };
  }, [organization, user]);

  // Runs one action against item `id`, tracking it as busy.
  async function run(id, action) {
    setBusyId(id);
    setActionError(null);
    try {
      await action();
      await reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const requests = data?.requests ?? [];
  return {
    loading: !data && !error,
    error: actionError ?? error,
    reload,
    busyId,
    invitations: data?.invitations ?? [],
    declines: data?.declines ?? [],
    requests,
    pendingRequests: requests.filter((r) => r.status === "pending"),
    handledRequests: requests.filter((r) => r.status !== "pending"),
    accept: (calendarEventId) => run(calendarEventId, () => acceptInvitation(calendarEventId)),
    dismissDecline: (attendeeId) => run(attendeeId, () => dismissDecline(attendeeId)),
    declineRequest: (requestId) => run(requestId, () => declineMeetingRequest(requestId)),
    approveRequest: (requestId, calendarEventId) => run(requestId, () => approveMeetingRequest(requestId, calendarEventId)),
  };
}
