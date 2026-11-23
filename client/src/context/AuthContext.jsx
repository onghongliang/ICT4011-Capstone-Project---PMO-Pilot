import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { login as loginRequest } from "../api/auth.js";
import { setAuthToken, setUnauthorizedHandler } from "../api/http.js";

const STORAGE_KEY = "pmo_pilot_token";
const AuthContext = createContext(null);

// Reads the (server-signed) JWT payload for display/UI decisions only — the
// server re-verifies the token and enforces roles on every request.
function decodeUser(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    // Tokens issued before roles existed can't drive the role-based UI.
    if (!payload.role) return null;
    return {
      username: payload.username,
      role: payload.role,
      stakeholderId: payload.stakeholder_id,
      fullName: payload.full_name ?? payload.username,
      canBook: payload.role === "admin" || payload.role === "pmo",
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  // The token is handed to api/http.js synchronously (here and in setToken),
  // not in a useEffect: child providers' effects run first, so OrgProvider's
  // first fetch would otherwise go out without it and 401 straight back to
  // the login screen.
  const [token, setTokenState] = useState(() => {
    let stored = localStorage.getItem(STORAGE_KEY);
    if (stored && !decodeUser(stored)) {
      localStorage.removeItem(STORAGE_KEY);
      stored = null;
    }
    setAuthToken(stored);
    return stored;
  });
  const user = useMemo(() => decodeUser(token), [token]);
  const [error, setError] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const setToken = useCallback((newToken) => {
    setAuthToken(newToken);
    if (newToken) localStorage.setItem(STORAGE_KEY, newToken);
    else localStorage.removeItem(STORAGE_KEY);
    setTokenState(newToken);
  }, []);

  const logout = useCallback(() => setToken(null), [setToken]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  async function login(username, password) {
    setError(null);
    setLoggingIn(true);
    try {
      const data = await loginRequest(username, password);
      if (data.status !== "ok") {
        setError(data.message ?? "Login failed");
        return false;
      }
      setToken(data.token);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoggingIn(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated: Boolean(token), user, login, logout, error, loggingIn }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
