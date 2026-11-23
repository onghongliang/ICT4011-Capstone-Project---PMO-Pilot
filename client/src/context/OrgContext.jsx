import { createContext, useContext, useEffect, useState } from "react";
import { listOrganizations } from "../api/organizations.js";
import { useAuth } from "./AuthContext.jsx";

const OrgContext = createContext(null);

// The current organization. The schema supports several, but only one is
// seeded, so this takes the first rather than hardcoding an id.
export function OrgProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setOrganization(null);
      setLoading(false);
      return;
    }
    // Clear any error from a previous session (e.g. the expired-token 401
    // that logged the user out), or it would stick around after re-login.
    setError(null);
    setLoading(true);
    listOrganizations()
      .then((organizations) => setOrganization(organizations[0] ?? null))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  return (
    <OrgContext.Provider value={{ organization, loading, error }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}
