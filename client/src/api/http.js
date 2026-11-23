const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Set by AuthContext on login/logout — kept as a plain module-level value
// (not React state) so this non-component module can read/attach it.
let authToken = null;
let onUnauthorized = null;

export function setAuthToken(token) {
  authToken = token;
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// The one place that talks to the network. Every endpoint answers with a
// JSON body carrying `status` ("ok" | "error" | "conflict"), even on 4xx, so
// this returns the body and leaves interpreting it to the resource modules
// (see unwrap). Only network failures, bodyless responses and a 401 (the
// session is gone → log out) are handled here.
async function request(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Could not reach the server. Is it running?");
  }

  // A 401 from the login endpoint itself just means wrong credentials — let
  // it fall through to the normal JSON handling below so the caller sees
  // the server's actual "invalid username or password" message. A 401 from
  // anywhere else means an existing session died (expired/invalid token).
  if (res.status === 401 && path !== "/api/auth/login") {
    onUnauthorized?.();
    throw new Error("Session expired — please log in again.");
  }

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response (e.g. an unhandled server error page)
  }

  if (data === null) {
    throw new Error(`Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  del: (path) => request(path, { method: "DELETE" }),
};

// For the resource modules: throws the server's message on
// { status: "error" }, so callers just get data. A "conflict" (409 with
// availability attribution) is returned for the caller to handle.
export function unwrap(data) {
  if (data?.status === "error") throw new Error(data.message ?? "Request failed");
  return data;
}

export function qs(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, value);
  }
  const str = search.toString();
  return str ? `?${str}` : "";
}
