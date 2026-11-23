import { useRequestMeeting } from "../hooks/useRequestMeeting.js";

// Stakeholder accounts can't book directly — they send the PMO a request
// with a reason, which shows up in the PMO's Notifications queue. The
// form's state and sending are in useRequestMeeting.
export function RequestMeetingModal({ onClose }) {
  const {
    subProjects,
    subProjectId,
    setSubProjectId,
    title,
    setTitle,
    reason,
    setReason,
    sending,
    sent,
    error,
    submit: send,
  } = useRequestMeeting();

  function submit(e) {
    e.preventDefault();
    send();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-surface shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-800">Request a Meeting</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        {sent ? (
          <div className="space-y-3 p-4">
            <p className="text-sm text-slate-700">
              Your request has been sent to the PMO. You'll see their response under Notifications, and the meeting
              invitation once it's scheduled.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 p-4">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Sub-project</span>
              <select
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                value={subProjectId}
                onChange={(e) => setSubProjectId(e.target.value)}
              >
                <option value="">General / not project-specific</option>
                {subProjects.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">What's the meeting about?</span>
              <input
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. UAT scope review"
                required
                autoFocus
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Reason for the meeting</span>
              <textarea
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this meeting needed, and who should be there?"
                required
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={sending}
              className="w-full rounded bg-brand px-3 py-1.5 text-sm font-medium text-on-brand hover:bg-brand-hover disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send to PMO"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
