import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useProjectOverview } from "../hooks/useProjectOverview.js";
import { formatRange } from "../utils/format.js";
import { milestoneSummary, openActionItemCount } from "../utils/projects.js";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { BookingChatModal } from "../components/BookingChatModal.jsx";

function Section({ title, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-surface p-4 shadow-sm">
      <h2 className="mb-3 font-semibold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-surface px-4 py-3 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function Empty({ children }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

// Full detail for one sub-project — reachable from the dashboard by PMO,
// admin, the Project Lead and the Project Sponsor (the server enforces it).
export function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const {
    loading,
    error,
    reload,
    project: sp,
    leadership,
    members,
    milestones,
    actionItems,
    meetings,
    upcomingMeetings: upcoming,
    pastMeetings: others,
  } = useProjectOverview(id);
  const [kickoff, setKickoff] = useState(false);

  const back = (
    <Link to="/" className="text-sm text-brand hover:underline">
      ← Back to dashboard
    </Link>
  );

  if (error) {
    return (
      <div className="space-y-3">
        {back}
        <p className="text-red-600">{error}</p>
      </div>
    );
  }
  if (loading) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-5">
      {back}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-800">{sp.name}</h1>
            <StatusBadge status={sp.status} />
          </div>
          <p className="text-sm text-slate-500">
            {sp.code}
            {sp.start_date && ` · ${new Date(sp.start_date).toLocaleDateString()} – ${new Date(sp.end_date).toLocaleDateString()}`}
          </p>
          {sp.description && <p className="mt-2 max-w-2xl text-sm text-slate-600">{sp.description}</p>}
        </div>
        {sp.status === "planning" && user.canBook && (
          <button
            type="button"
            onClick={() => setKickoff(true)}
            className="rounded bg-brand px-4 py-2 text-sm font-medium text-on-brand hover:bg-brand-hover"
          >
            Schedule kick-off meeting
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Milestones" value={milestoneSummary(milestones)} />
        <Stat label="Open action items" value={openActionItemCount(actionItems)} />
        <Stat label="Upcoming meetings" value={upcoming.length} />
        <Stat label="Team size" value={leadership.length + members.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Team">
          <ul className="divide-y divide-slate-100 text-sm">
            {[...leadership.map((l) => ({ ...l, label: l.role_label })), ...members.map((m) => ({ ...m, label: m.title }))].map(
              (p, i) => (
                <li key={`${p.stakeholder_id}-${i}`} className="flex items-center justify-between py-1.5">
                  <span className="text-slate-800">{p.full_name}</span>
                  <span className="text-xs text-slate-500">{p.label}</span>
                </li>
              )
            )}
          </ul>
        </Section>

        <Section title="Meetings">
          {meetings.length === 0 && <Empty>No meetings yet{sp.status === "planning" ? " — schedule the kick-off to start." : "."}</Empty>}
          {upcoming.length > 0 && (
            <ul className="space-y-2 text-sm">
              {upcoming.map((m) => (
                <li key={m.id} className="rounded border border-slate-200 px-3 py-2">
                  <p className="font-medium text-slate-800">{m.title}</p>
                  <p className="text-xs text-slate-500">
                    {formatRange(m.start_time, m.end_time)} · {m.attendee_count} invited
                  </p>
                </li>
              ))}
            </ul>
          )}
          {others.length > 0 && (
            <>
              <p className="mt-3 mb-1 text-xs font-medium text-slate-500 uppercase">Past & cancelled</p>
              <ul className="space-y-1 text-sm">
                {others.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">
                      {m.title} <span className="text-xs text-slate-400">· {formatRange(m.start_time, m.end_time)}</span>
                    </span>
                    {m.status === "cancelled" && <StatusBadge status="cancelled" />}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>

        <Section title="Milestones">
          {milestones.length === 0 ? (
            <Empty>TBC — milestones will be set once the project is planned.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {milestones.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="text-slate-800">{m.name}</span>
                  <span className="flex items-center gap-2 text-xs text-slate-500">
                    {m.due_date && new Date(m.due_date).toLocaleDateString()}
                    <StatusBadge status={m.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Action items">
          {actionItems.length === 0 ? (
            <Empty>0 action items.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {actionItems.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span>
                    <span className="text-slate-800">{a.title}</span>
                    {a.assignee_name && <span className="block text-xs text-slate-500">{a.assignee_name}</span>}
                  </span>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {kickoff && <BookingChatModal kickoff={sp} onClose={() => setKickoff(false)} onBooked={reload} />}
    </div>
  );
}
