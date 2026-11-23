import { useState } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { useOrg } from "./context/OrgContext.jsx";
import { applyTheme } from "./utils/theme.js";
import { Login } from "./pages/Login.jsx";
import { Dashboard } from "./pages/Dashboard.jsx";
import { TeamStructure } from "./pages/TeamStructure.jsx";
import { Calendar } from "./pages/Calendar.jsx";
import { Notifications } from "./pages/Notifications.jsx";
import { ManageUsers } from "./pages/ManageUsers.jsx";
import { ProjectDetail } from "./pages/ProjectDetail.jsx";
import { NotificationsProvider, useNotifications } from "./context/NotificationsContext.jsx";
import { Icon } from "./components/Icon.jsx";

const NAV_LINKS = [
  { to: "/", label: "Dashboard", icon: "grid", end: true },
  { to: "/team-structure", label: "Team Structure", icon: "people" },
  { to: "/calendar", label: "Calendar", icon: "calendar" },
  { to: "/notifications", label: "Notifications", icon: "bell", badge: true },
  { to: "/admin/users", label: "Manage Users", icon: "userPlus", adminOnly: true },
];

const ROLE_LABELS = { admin: "Admin", pmo: "PMO", stakeholder: "Stakeholder" };

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function NotificationBadge() {
  const { count } = useNotifications();
  if (count === 0) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-alert px-1.5 text-[11px] font-semibold text-white">
      {count}
    </span>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  function toggle() {
    const next = !dark;
    applyTheme(next ? "dark" : "light", { persist: true });
    setDark(next);
  }
  return (
    <button
      type="button"
      onClick={toggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
    >
      <Icon name={dark ? "sun" : "moon"} />
    </button>
  );
}

function App() {
  const { isAuthenticated, user, logout } = useAuth();
  const { organization, loading, error } = useOrg();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <NotificationsProvider>
      <div className="flex h-screen bg-app">
        {/* Sidebar: icons only on narrow screens, icon + label from md up. */}
        <aside className="flex w-16 shrink-0 flex-col border-r border-slate-200 bg-rail md:w-60">
          <div className="flex items-center gap-2.5 px-3 py-4 md:px-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-bold text-on-brand">
              P
            </span>
            <div className="hidden min-w-0 md:block">
              <p className="text-sm leading-tight font-semibold text-slate-800">PMO Pilot</p>
              <p className="truncate text-xs text-slate-500">{organization?.name ?? " "}</p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-0.5 px-2 md:px-3">
            {NAV_LINKS.filter((link) => !link.adminOnly || user.role === "admin").map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                title={link.label}
                className={({ isActive }) =>
                  `flex items-center justify-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium md:justify-start ${
                    isActive
                      ? "bg-brand-soft text-brand"
                      : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-800"
                  }`
                }
              >
                <Icon name={link.icon} size={19} />
                <span className="hidden md:inline">{link.label}</span>
                {link.badge && (
                  <span className="hidden md:contents">
                    <NotificationBadge />
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-slate-200 p-2 md:p-3">
            <div className="flex flex-col items-center gap-2 md:flex-row">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700"
                title={user.fullName}
              >
                {initials(user.fullName)}
              </span>
              <div className="hidden min-w-0 flex-1 md:block">
                <p className="truncate text-sm leading-tight font-medium text-slate-800">{user.fullName}</p>
                <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
              </div>
              <ThemeToggle />
              <button
                type="button"
                onClick={logout}
                title="Log out"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
              >
                <Icon name="logout" />
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 py-8">
            {error && <p className="text-red-600">Could not load organization: {error}</p>}
            {!error && !loading && !organization && (
              <p className="text-slate-500">No organization found — run the server's seed script first.</p>
            )}
            {organization && (
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/team-structure" element={<TeamStructure />} />
                <Route path="/stakeholders" element={<Navigate to="/team-structure" replace />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/notifications" element={<Notifications />} />
                {user.role === "admin" && <Route path="/admin/users" element={<ManageUsers />} />}
              </Routes>
            )}
          </div>
        </main>
      </div>
    </NotificationsProvider>
  );
}

export default App;
