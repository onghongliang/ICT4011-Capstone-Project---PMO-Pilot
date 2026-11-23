import { api, unwrap } from "./http.js";

export async function listOrganizations() {
  return unwrap(await api.get("/api/organizations")).organizations;
}
