import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { listDeclines, listMyInvitations } from "../api/invitations.js";
import { listMeetingRequests } from "../api/meetingRequests.js";
import { useAuth } from "./AuthContext.jsx";
import { useOrg } from "./OrgContext.jsx";

const NotificationsContext = createContext(null);
const POLL_MS = 30_000;

// Keeps the nav badge count fresh: invitations awaiting this user's
// response, plus (for PMO/admin) meeting requests and declined invitations
// still waiting to be handled. Pages call refresh() after acting on one so
// the badge updates immediately instead of on the next poll.
export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const { organization } = useOrg();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!organization || !user) return;
    try {
      const [invitations, pendingRequests, declines] = await Promise.all([
        listMyInvitations(),
        user.canBook ? listMeetingRequests(organization.id, "pending") : [],
        user.canBook ? listDeclines(organization.id) : [],
      ]);
      const pendingInvites = invitations.filter(
        (i) => i.response_status === "needs_action" && i.event_status !== "cancelled"
      ).length;
      setCount(pendingInvites + pendingRequests.length + declines.length);
    } catch {
      // Badge is best-effort; the Notifications page surfaces real errors.
    }
  }, [organization, user]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  return <NotificationsContext.Provider value={{ count, refresh }}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
