import { api } from "./http.js";

// Returns the raw body: the caller shows "invalid username or password".
export function login(username, password) {
  return api.post("/api/auth/login", { username, password });
}
