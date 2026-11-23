import { useState } from "react";
import { useEventDetail } from "../hooks/useEventDetail.js";
import { formatSlot } from "../utils/format.js";
import { DeclineInvitationModal } from "./DeclineInvitationModal.jsx";

// One meeting's details: agenda, attendees and their responses, plus
// accept/decline for the viewer and cancel for PMO/admin.
export function EventDetailModal({ eventId, onClose, onChanged }) {
  const {
    event,
    attendees,
    declines,
    myAttendance,
    isUpcoming,
    canCancel,
    responding,
    accept,
    afterDecline,
    cancelling,
    cancelError,
    cancel,
  } = useEventDetail(eventId, { onChanged, onClose });
  const [declining, setDeclining] = useState(false);
  // PMO/admin cancellation: confirm step with an optional reason.
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-surface p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        {!event ? (
          <p className="text-slate-500">Loading…</p>
        ) : (
          <>
            <h2 className="font-semibold text-slate-800">{event.title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {new Date(event.start_time).toLocaleString()} –{" "}
              {new Date(event.end_time).toLocaleTimeString()}
            </p>
            {event.location && (
              <p className="mt-1 text-sm text-slate-500">{event.location}</p>
            )}
            {event.reschedule_reason && (
              <p className="mt-1 text-xs text-amber-700">Rescheduled because {event.reschedule_reason}.</p>
            )}
            {event.description && (
              <pre className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-slate-50 p-2 font-sans text-xs text-slate-700">
                {event.description}
              </pre>
            )}
            <div className="mt-3 space-y-1">
              {attendees.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span>
                    {a.full_name}
                    {a.role_label && <span className="ml-1 text-xs text-slate-400">({a.role_label})</span>}
                  </span>
                  <span className="text-xs text-slate-400">{a.response_status.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
            {declines.length > 0 && (
              <div className="mt-3 space-y-1 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                {declines.map((a) => (
                    <p key={a.id}>
                      <span className="font-medium">{a.full_name}</span> declined: "{a.decline_reason}"
                      {a.suggested_start_time && ` · suggests ${formatSlot(a.suggested_start_time)}`}
                    </p>
                ))}
              </div>
            )}
            {myAttendance && isUpcoming && (
              <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-3">
                <span className="mr-auto text-sm text-slate-600">You're invited</span>
                <button
                  type="button"
                  disabled={responding || myAttendance.response_status === "accepted"}
                  onClick={accept}
                  className="rounded bg-brand px-3 py-1.5 text-sm font-medium text-on-brand hover:bg-brand-hover disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={responding || myAttendance.response_status === "declined"}
                  onClick={() => setDeclining(true)}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            )}
            {canCancel && (
              <div className="mt-4 border-t border-slate-200 pt-3">
                {!confirmingCancel ? (
                  <button
                    type="button"
                    onClick={() => setConfirmingCancel(true)}
                    className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Cancel meeting
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-700">
                      Cancel this meeting for all {attendees.length} attendees? They'll be notified and the invite removed
                      from their calendars.
                    </p>
                    <textarea
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                      rows={2}
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Reason (optional, shared with attendees)"
                      autoFocus
                    />
                    {cancelError && <p className="text-sm text-red-600">{cancelError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => cancel(cancelReason)}
                        disabled={cancelling}
                        className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {cancelling ? "Cancelling…" : "Confirm cancellation"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingCancel(false)}
                        disabled={cancelling}
                        className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Keep meeting
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        {declining && (
          <DeclineInvitationModal
            invitation={{ calendar_event_id: eventId, ...event }}
            onClose={() => setDeclining(false)}
            onDeclined={afterDecline}
          />
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Close
        </button>
      </div>
    </div>
  );
}
