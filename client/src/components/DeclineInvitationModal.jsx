import { useDeclineInvitation } from "../hooks/useDeclineInvitation.js";
import { formatRange } from "../utils/format.js";

// The decline form's view; sending it is in useDeclineInvitation.
export function DeclineInvitationModal({ invitation, onClose, onDeclined }) {
  const { reason, setReason, suggested, setSuggested, sending, error, submit: send } = useDeclineInvitation(invitation, {
    onDeclined,
    onClose,
  });

  function submit(e) {
    e.preventDefault();
    send();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-surface shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-800">Decline Invitation</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3 p-4">
          <div className="text-sm">
            <p className="font-medium text-slate-800">{invitation.title}</p>
            <p className="text-xs text-slate-500">{formatRange(invitation.start_time, invitation.end_time)}</p>
          </div>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Reason for declining</span>
            <textarea
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. I'm on leave that day"
              required
              autoFocus
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Suggest a better time (optional)</span>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              value={suggested}
              onChange={(e) => setSuggested(e.target.value)}
            />
            <span className="mt-1 block text-xs text-slate-500">
              The meeting keeps its current length. The PMO's assistant will check whether everyone can make it.
            </span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={sending}
            className="w-full rounded bg-brand px-3 py-1.5 text-sm font-medium text-on-brand hover:bg-brand-hover disabled:opacity-50"
          >
            {sending ? "Sending…" : "Decline & notify PMO"}
          </button>
        </form>
      </div>
    </div>
  );
}
