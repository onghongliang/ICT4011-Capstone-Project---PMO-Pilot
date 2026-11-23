import { useAuth } from "../context/AuthContext.jsx";
import { useTeamStructure } from "../hooks/useTeamStructure.js";
import { StatusBadge } from "../components/StatusBadge.jsx";

// Each team is drawn in tiers: Project Lead and Process Owner on top, then
// the PIC, then the team members. Any other role type joins the top tier.
const LOWER_LEADERSHIP_ROLES = ["pic"];

function PersonCard({ person, label, isMe }) {
  return (
    <div
      className={`w-48 rounded-lg border bg-surface px-3 py-2 text-left shadow-sm ${
        isMe ? "border-brand ring-1 ring-brand" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-sm font-medium text-slate-800">{person.full_name}</p>
        {isMe && <span className="rounded bg-brand px-1.5 text-[10px] font-semibold text-on-brand">You</span>}
      </div>
      <p className="text-xs text-slate-500">{label ?? person.title ?? "—"}</p>
      <a href={`mailto:${person.email}`} className="block truncate text-xs text-blue-600 hover:underline">
        {person.email}
      </a>
    </div>
  );
}

function Tier({ children }) {
  return <div className="flex flex-wrap justify-center gap-3">{children}</div>;
}

function Connector() {
  return <div className="mx-auto h-5 w-px bg-slate-300" />;
}

function TeamChart({ team, myId }) {
  const upper = team.leadership.filter((l) => !LOWER_LEADERSHIP_ROLES.includes(l.role_code));
  const lower = team.leadership.filter((l) => LOWER_LEADERSHIP_ROLES.includes(l.role_code));
  const tiers = [
    upper.map((l) => <PersonCard key={`${l.id}-${l.role_code}`} person={l} label={l.role_label} isMe={l.id === myId} />),
    lower.map((l) => <PersonCard key={`${l.id}-${l.role_code}`} person={l} label={l.role_label} isMe={l.id === myId} />),
    team.members.map((m) => <PersonCard key={m.id} person={m} isMe={m.id === myId} />),
  ].filter((tier) => tier.length > 0);

  return (
    <section className="rounded-lg border border-slate-200 bg-surface p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-slate-800">{team.sub_project.name}</h2>
          <p className="text-xs text-slate-500">
            {team.sub_project.code} · {team.leadership.length + team.members.length} people
          </p>
        </div>
        <StatusBadge status={team.sub_project.status} />
      </div>
      <div className="rounded-lg bg-slate-50 p-4">
        {tiers.map((tier, i) => (
          <div key={i}>
            {i > 0 && <Connector />}
            <Tier>{tier}</Tier>
          </div>
        ))}
        {team.members.length === 0 && <p className="mt-3 text-center text-xs text-slate-500">No team members yet.</p>}
      </div>
    </section>
  );
}

export function TeamStructure() {
  const { user } = useAuth();
  const { structure, error, loading } = useTeamStructure();

  if (error) return <p className="text-red-600">{error}</p>;
  if (loading) return <p className="text-slate-500">Loading…</p>;

  const myId = user.stakeholderId;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Team Structure</h1>
        <p className="text-sm text-slate-500">
          {user.canBook
            ? "All sub-project teams in the organization."
            : "The teams you belong to, and the PMO office that handles meeting requests."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        {structure.sponsor && (
          <section className="rounded-lg border border-slate-200 bg-surface p-4 shadow-sm">
            <h2 className="mb-3 font-semibold text-slate-800">Project Sponsor</h2>
            <Tier>
              <PersonCard person={structure.sponsor} isMe={structure.sponsor.id === myId} />
            </Tier>
          </section>
        )}
        {structure.pmo_office.length > 0 && (
          <section className="rounded-lg border border-slate-200 bg-surface p-4 shadow-sm">
            <h2 className="mb-3 font-semibold text-slate-800">PMO Office</h2>
            <Tier>
              {structure.pmo_office.map((p) => (
                <PersonCard key={p.id} person={p} isMe={p.id === myId} />
              ))}
            </Tier>
          </section>
        )}
      </div>

      {structure.teams.length === 0 && (
        <p className="text-sm text-slate-500">You're not on any sub-project team yet. Contact the PMO to be added.</p>
      )}
      {structure.teams.map((team) => (
        <TeamChart key={team.sub_project.id} team={team} myId={myId} />
      ))}

      {structure.unassigned.length > 0 && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-semibold text-amber-900">Not on any team</h2>
          <p className="mb-3 text-xs text-amber-800">Only visible to PMO and admin.</p>
          <Tier>
            {structure.unassigned.map((p) => (
              <PersonCard key={p.id} person={p} />
            ))}
          </Tier>
        </section>
      )}
    </div>
  );
}
