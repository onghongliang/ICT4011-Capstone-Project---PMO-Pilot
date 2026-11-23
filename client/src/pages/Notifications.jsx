import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNotificationsPage } from "../hooks/useNotificationsPage.js";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { BookingChatModal } from "../components/BookingChatModal.jsx";
import { RescheduleChatModal } from "../components/RescheduleChatModal.jsx";
import { DeclineInvitationModal } from "../components/DeclineInvitationModal.jsx";
import { formatRange, formatSlot } from "../utils/format.js";

function Section({ title, empty, children }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="space-y-2">
      <h2 className="font-semibold text-slate-800">{title}</h2>
      {hasItems ? children : <p className="text-sm text-slate-500">{empty}</p>}
    </section>
  );
}

function Card({ children }) {
  return <div className="rounded-lg border border-slate-200 bg-surface p-4 shadow-sm">{children}</div>;
}

const PRIMARY_BTN =
  "rounded bg-brand px-3 py-1.5 text-sm font-medium text-on-brand hover:bg-brand-hover disabled:opacity-50";
const SECONDARY_BTN =
  "rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export function Notifications() {
  const { user } = useAuth();
  const {
    loading,
    error,
    reload: load,
    busyId,
    invitations,
    declines,
    requests,
    pendingRequests,
    handledRequests,
    accept,
    dismissDecline,
    declineRequest,
    approveRequest,
  } = useNotificationsPage();
  const [schedulingRequest, setSchedulingRequest] = useState(null);
  const [decliningInvitation, setDecliningInvitation] = useState(null);
  const [reschedulingDecline, setReschedulingDecline] = useState(null);

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (error && !invitations.length && !requests.length) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">Notifications</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {user.canBook ? (
        <>
          <Section title={`Declined invitations (${declines.length})`} empty="No one has declined an upcoming meeting.">
            {declines.map((d) => (
              <Card key={d.attendee_id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-800">
                      {d.full_name} declined "{d.title}"
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatRange(d.start_time, d.end_time)}
                      {d.sub_project_name && ` · ${d.sub_project_name}`}
                    </p>
                  </div>
                  {d.is_critical_decline === null ? (
                    <StatusBadge status="pending" />
                  ) : (
                    <span
                      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                        d.is_critical_decline ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {d.is_critical_decline ? "critical" : "non-critical"}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {d.is_critical_decline === null
                    ? "Assessing impact…"
                    : d.is_critical_decline
                      ? "Mandatory attendee: the meeting needs to move."
                      : "Optional attendee: the meeting can go ahead without them."}
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  <span className="font-medium">Reason:</span> {d.decline_reason}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  <span className="font-medium">Suggested time:</span>{" "}
                  {d.suggested_start_time ? formatSlot(d.suggested_start_time) : "none given"}
                </p>
                {d.proposed_alternatives?.slots?.length > 0 && (
                  <div className="mt-2 rounded bg-slate-50 p-2 text-sm">
                    <p className="text-xs font-medium text-slate-500">Alternatives ready (all mandatory attendees free):</p>
                    <ul className="mt-1 space-y-0.5 text-slate-700">
                      {d.proposed_alternatives.slots.map((s) => (
                        <li key={s.start_time}>• {formatRange(s.start_time, s.end_time)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className={d.is_critical_decline === false ? SECONDARY_BTN : PRIMARY_BTN}
                    disabled={busyId === d.attendee_id}
                    onClick={() => setReschedulingDecline(d)}
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    className={d.is_critical_decline === false ? PRIMARY_BTN : SECONDARY_BTN}
                    disabled={busyId === d.attendee_id}
                    onClick={() => dismissDecline(d.attendee_id)}
                  >
                    {d.is_critical_decline === false ? "Acknowledge" : "Keep original time"}
                  </button>
                </div>
              </Card>
            ))}
          </Section>
          <Section title={`Incoming meeting requests (${pendingRequests.length})`} empty="No requests waiting.">
            {pendingRequests.map((r) => (
              <Card key={r.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-800">{r.title}</p>
                    <p className="text-xs text-slate-500">
                      From {r.requested_by_name}
                      {r.sub_project_name && ` · ${r.sub_project_name}`} · {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-2 text-sm text-slate-700">
                  <span className="font-medium">Reason:</span> {r.reason}
                </p>
                <div className="mt-3 flex gap-2">
                  <button type="button" className={PRIMARY_BTN} disabled={busyId === r.id} onClick={() => setSchedulingRequest(r)}>
                    Schedule meeting
                  </button>
                  <button
                    type="button"
                    className={SECONDARY_BTN}
                    disabled={busyId === r.id}
                    onClick={() => declineRequest(r.id)}
                  >
                    Decline
                  </button>
                </div>
              </Card>
            ))}
          </Section>
          {handledRequests.length > 0 && (
            <Section title="Handled requests">
              {handledRequests.map((r) => (
                <Card key={r.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-800">{r.title}</p>
                      <p className="text-xs text-slate-500">
                        From {r.requested_by_name}
                        {r.handled_by_name && ` · handled by ${r.handled_by_name}`}
                        {r.event_start_time && ` · ${formatRange(r.event_start_time, r.event_end_time)}`}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                </Card>
              ))}
            </Section>
          )}
        </>
      ) : (
        <Section title="My meeting requests" empty="You haven't requested any meetings yet. Use Request a Meeting on the Calendar.">
          {requests.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800">{r.title}</p>
                  <p className="text-xs text-slate-500">
                    Sent {new Date(r.created_at).toLocaleString()}
                    {r.sub_project_name && ` · ${r.sub_project_name}`}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <p className="mt-2 text-sm text-slate-700">
                <span className="font-medium">Reason:</span> {r.reason}
              </p>
              {r.status === "approved" && r.event_start_time && (
                <p className="mt-1 text-sm text-green-700">
                  Scheduled for {formatRange(r.event_start_time, r.event_end_time)}
                  {r.handled_by_name && ` by ${r.handled_by_name}`} — see your invitation below.
                </p>
              )}
              {r.status === "declined" && (
                <p className="mt-1 text-sm text-red-700">Declined{r.handled_by_name && ` by ${r.handled_by_name}`}.</p>
              )}
            </Card>
          ))}
        </Section>
      )}

      {user.stakeholderId && (
        <Section title="Meeting invitations" empty="No upcoming meeting invitations.">
          {invitations.map((inv) => (
            <Card key={inv.calendar_event_id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800">{inv.title}</p>
                  <p className="text-xs text-slate-500">
                    {formatRange(inv.start_time, inv.end_time)}
                    {inv.location && ` · ${inv.location}`}
                    {inv.sub_project_name && ` · ${inv.sub_project_name}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {inv.organizer_name ? `Organised by ${inv.organizer_name}` : "Organised by the PMO"}
                    {inv.is_mandatory && " · your attendance is required"}
                  </p>
                </div>
                <StatusBadge status={inv.event_status === "cancelled" ? "cancelled" : inv.response_status} />
              </div>
              {inv.event_status === "cancelled" && (
                <p className="mt-2 text-sm text-red-700">
                  This meeting was cancelled{inv.cancelled_by_name && ` by ${inv.cancelled_by_name}`}
                  {inv.cancel_reason ? `: "${inv.cancel_reason}"` : "."}
                </p>
              )}
              {inv.event_status !== "cancelled" && inv.reschedule_reason && (
                <p className="mt-2 text-sm text-amber-700">Rescheduled because {inv.reschedule_reason}.</p>
              )}
              {inv.event_status !== "cancelled" && inv.response_status === "declined" && inv.decline_reason && (
                <p className="mt-2 text-sm text-slate-600">
                  You declined: "{inv.decline_reason}"
                  {inv.suggested_start_time && ` · suggested ${formatSlot(inv.suggested_start_time)}`} — the PMO has been notified.
                </p>
              )}
              {inv.event_status !== "cancelled" && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className={PRIMARY_BTN}
                    disabled={busyId === inv.calendar_event_id || inv.response_status === "accepted"}
                    onClick={() => accept(inv.calendar_event_id)}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className={SECONDARY_BTN}
                    disabled={busyId === inv.calendar_event_id || inv.response_status === "declined"}
                    onClick={() => setDecliningInvitation(inv)}
                  >
                    Decline
                  </button>
                </div>
              )}
            </Card>
          ))}
        </Section>
      )}

      {decliningInvitation && (
        <DeclineInvitationModal
          invitation={decliningInvitation}
          onClose={() => setDecliningInvitation(null)}
          onDeclined={load}
        />
      )}

      {reschedulingDecline && (
        <RescheduleChatModal decline={reschedulingDecline} onClose={() => setReschedulingDecline(null)} onDone={load} />
      )}

      {schedulingRequest && (
        <BookingChatModal
          request={schedulingRequest}
          onClose={() => setSchedulingRequest(null)}
          onBooked={(event) => approveRequest(schedulingRequest.id, event.id)}
        />
      )}
    </div>
  );
}
