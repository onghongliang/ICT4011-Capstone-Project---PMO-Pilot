import { useState } from "react";
import { cancelMeeting, getCalendarEvent } from "../api/calendar.js";
import { acceptInvitation } from "../api/invitations.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useNotifications } from "../context/NotificationsContext.jsx";
import { useResource } from "./useResource.js";

// One meeting's detail popup: its data, the viewer's own attendance
// (accept/decline) and, for PMO/admin, cancelling it.
export function useEventDetail(eventId, { onChanged, onClose }) {
  const { user } = useAuth();
  const { refresh: refreshBadge } = useNotifications();
  const { data: detail, reload } = useResource(() => getCalendarEvent(eventId), [eventId]);
  const [responding, setResponding] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const event = detail?.calendar_event ?? null;
  const attendees = detail?.attendees ?? [];
  const isUpcoming = Boolean(event && event.status === "scheduled" && new Date(event.end_time) > new Date());

  async function accept() {
    setResponding(true);
    try {
      await acceptInvitation(eventId);
      await reload();
      refreshBadge();
    } finally {
      setResponding(false);
    }
  }

  // After a decline (made in DeclineInvitationModal).
  function afterDecline() {
    reload();
    refreshBadge();
  }

  async function cancel(reason) {
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelMeeting(eventId, reason);
      onChanged?.();
      refreshBadge();
      onClose();
    } catch (err) {
      setCancelError(err.message);
      setCancelling(false);
    }
  }

  return {
    event,
    attendees,
    declines: attendees.filter((a) => a.response_status === "declined" && a.decline_reason),
    myAttendance: attendees.find((a) => a.stakeholder_id === user.stakeholderId) ?? null,
    isUpcoming,
    canCancel: user.canBook && isUpcoming,
    responding,
    accept,
    afterDecline,
    cancelling,
    cancelError,
    cancel,
  };
}
