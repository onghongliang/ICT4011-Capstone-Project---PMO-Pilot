import { useState } from "react";
import { declineInvitation } from "../api/invitations.js";

// Declining asks why (sent to the PMO) and optionally for a better time,
// which the PMO's rescheduling assistant checks first.
export function useDeclineInvitation(invitation, { onDeclined, onClose }) {
  const [reason, setReason] = useState("");
  const [suggested, setSuggested] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  async function submit() {
    setSending(true);
    setError(null);
    try {
      await declineInvitation(invitation.calendar_event_id, {
        reason,
        // datetime-local gives local wall-clock time; Date() reads it as local.
        suggestedStartTime: suggested ? new Date(suggested).toISOString() : null,
      });
      onDeclined();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return { reason, setReason, suggested, setSuggested, sending, error, submit };
}
