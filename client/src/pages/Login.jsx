import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export function Login() {
  const { login, error, loggingIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    login(username, password);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-base font-bold text-on-brand">P</span>
          <div>
            <h1 className="text-lg font-bold text-slate-800">PMO Pilot</h1>
            <p className="text-sm text-slate-500">Sign in to continue</p>
          </div>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Username
          <input
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            type="password"
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loggingIn}
          className="w-full rounded bg-brand px-3 py-2 text-sm font-medium text-on-brand hover:bg-brand-hover disabled:opacity-50"
        >
          {loggingIn ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
