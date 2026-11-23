import { useManageUsers } from "../hooks/useManageUsers.js";

const ROLE_LABELS = { admin: "Admin", pmo: "PMO", stakeholder: "Stakeholder" };
const INPUT = "mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm";

// Admin-only: create a person + their login + project team memberships, and
// see every existing account with what it's assigned to.
export function ManageUsers() {
  const {
    users,
    subProjects,
    form,
    setField: set,
    toggleProject,
    submit: submitForm,
    saving,
    created,
    error,
    usernamePlaceholder,
  } = useManageUsers();

  function submit(e) {
    e.preventDefault();
    submitForm();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Manage Users</h1>
        <p className="text-sm text-slate-500">Create accounts and assign people to project teams.</p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-lg border border-slate-200 bg-surface p-5 shadow-sm">
        <h2 className="font-semibold text-slate-800">New user</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Full name</span>
            <input className={INPUT} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Email</span>
            <input type="email" className={INPUT} value={form.email} onChange={(e) => set("email", e.target.value)} required />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Job title</span>
            <input className={INPUT} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Developer" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Access</span>
            <select className={INPUT} value={form.role} onChange={(e) => set("role", e.target.value)}>
              <option value="stakeholder">Stakeholder — can request meetings</option>
              <option value="pmo">PMO — can book meetings and see all teams</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Username</span>
            <input className={INPUT} value={form.username} onChange={(e) => set("username", e.target.value)} placeholder={usernamePlaceholder} />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Password</span>
            <input className={INPUT} value={form.password} onChange={(e) => set("password", e.target.value)} placeholder='defaults to "password"' />
          </label>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Projects (joins as a team member)</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {subProjects.map((sp) => {
              const on = form.sub_project_ids.includes(sp.id);
              return (
                <label
                  key={sp.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm ${
                    on ? "border-brand bg-brand-soft text-brand" : "border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleProject(sp.id)} />
                  {sp.name} <span className="text-xs opacity-70">{sp.code}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {created && (
          <p className="rounded border border-green-300 bg-green-50 p-2 text-sm text-green-800">
            Created {created.stakeholder.full_name} — username <strong>{created.username}</strong>, password{" "}
            <strong>{created.password}</strong>.
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-brand px-4 py-2 text-sm font-medium text-on-brand hover:bg-brand-hover disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create user"}
        </button>
      </form>

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Username</th>
              <th className="px-4 py-2">Access</th>
              <th className="px-4 py-2">Projects</th>
            </tr>
          </thead>
          <tbody>
            {!users && (
              <tr>
                <td colSpan={4} className="px-4 py-3 text-slate-500">
                  Loading…
                </td>
              </tr>
            )}
            {users?.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <p className="font-medium text-slate-800">{u.full_name ?? "Administrator"}</p>
                  <p className="text-xs text-slate-500">{u.title ?? "—"}</p>
                </td>
                <td className="px-4 py-2 text-slate-600">{u.username}</td>
                <td className="px-4 py-2 text-slate-600">{ROLE_LABELS[u.role]}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {u.projects.length === 0 && <span className="text-xs text-slate-400">—</span>}
                    {u.projects.map((p, i) => (
                      <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        {p.code} · {p.position}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
