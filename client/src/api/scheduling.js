import { api, unwrap } from "./http.js";

// The Recommendation Engine's ranked slots: { found, slots, deadline, after_deadline }.
export async function recommendSlots(body) {
  return unwrap(await api.post("/api/scheduling/recommend", body));
}

// The Context Engine's draft agenda text.
export async function draftAgenda(body) {
  return unwrap(await api.post("/api/scheduling/agenda", body)).agenda;
}
