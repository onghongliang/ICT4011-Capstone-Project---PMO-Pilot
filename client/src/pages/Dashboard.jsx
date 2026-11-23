import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { BookingChatModal } from "../components/BookingChatModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useDashboard } from "../hooks/useDashboard.js";
import { milestoneSummary, openActionItemCount } from "../utils/projects.js";

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { loading, error, reload, subProjects, canViewDetails, milestonesFor, actionItemsFor } = useDashboard();
  // A sub-project in planning whose kick-off meeting is being scheduled.
  const [kickoffFor, setKickoffFor] = useState(null);

  if (error) return <p className="text-red-600">{error}</p>;
  if (loading) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">{canViewDetails ? "All Projects" : "My Projects"}</h1>
        <p className="text-sm text-slate-500">
          {canViewDetails ? "Click a project to see its full details." : "The projects you're part of."}
        </p>
      </div>

      {subProjects.length === 0 && (
        <p className="text-sm text-slate-500">You're not on any project yet. Contact the PMO to be added.</p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {subProjects.map((sp) => {
          const spMilestones = milestonesFor(sp.id);
          const spActionItems = actionItemsFor(sp.id);
          const open = () => navigate(`/projects/${sp.id}`);

          return (
            <div
              key={sp.id}
              {...(canViewDetails && {
                role: "button",
                tabIndex: 0,
                onClick: open,
                onKeyDown: (e) => e.key === "Enter" && open(),
              })}
              className={`rounded-lg border border-slate-200 bg-surface p-4 shadow-sm ${
                canViewDetails ? "cursor-pointer transition hover:border-brand hover:shadow-md" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-slate-800">{sp.name}</h2>
                  <p className="text-xs text-slate-500">{sp.code}</p>
                </div>
                <StatusBadge status={sp.status} />
              </div>
              {sp.description && <p className="mt-2 text-sm text-slate-600">{sp.description}</p>}
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded bg-slate-50 px-3 py-2">
                  <dt className="text-xs text-slate-500">Milestones</dt>
                  <dd className="font-medium text-slate-800">{milestoneSummary(spMilestones)}</dd>
                </div>
                <div className="rounded bg-slate-50 px-3 py-2">
                  <dt className="text-xs text-slate-500">Open action items</dt>
                  <dd className="font-medium text-slate-800">{openActionItemCount(spActionItems)}</dd>
                </div>
              </dl>
              {sp.status === "planning" && (
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-500">
                    {user.canBook ? "Schedule the kick-off to make this project active." : "Awaiting kick-off meeting."}
                  </span>
                  {user.canBook && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setKickoffFor(sp);
                      }}
                      className="shrink-0 rounded bg-brand px-3 py-1.5 text-xs font-medium text-on-brand hover:bg-brand-hover"
                    >
                      Schedule kick-off meeting
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {kickoffFor && <BookingChatModal kickoff={kickoffFor} onClose={() => setKickoffFor(null)} onBooked={reload} />}
    </div>
  );
}
