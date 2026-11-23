import { api, qs, unwrap } from "./http.js";

export async function listUsers(organizationId) {
  return unwrap(await api.get(`/api/admin/users${qs({ organization_id: organizationId })}`)).users;
}

// { user, initial_password }
export async function createUser(body) {
  return unwrap(await api.post("/api/admin/users", body));
}
