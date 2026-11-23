import { createUser, DEFAULT_PASSWORD, listUsers } from "../services/users.service.js";
import { ValidationError } from "../utils/errors.js";
import { isNonEmptyString, requireString, requireUuid, requireUuidArray } from "../utils/validation.js";

const USERNAME_RE = /^[a-z0-9._-]+$/;

// GET /api/admin/users?organization_id=... (admin) — every login with the
// person's project positions.
export async function list(req, res) {
  requireUuid(req.query.organization_id, "organization_id query parameter is required");
  res.json({ status: "ok", users: await listUsers(req.query.organization_id) });
}

// POST /api/admin/users (admin) — creates the person, their login and their
// team memberships. Body: { organization_id, full_name, email, title?,
// role: "stakeholder" | "pmo", username? (defaults to the email's local
// part), password? (defaults to "password"), sub_project_ids?: [...] }
export async function create(req, res) {
  const {
    organization_id: organizationId,
    full_name: fullName,
    email,
    title = null,
    role = "stakeholder",
    username: usernameRaw,
    password: passwordRaw,
    sub_project_ids: subProjectIds = [],
  } = req.body ?? {};
  requireUuid(organizationId, "organization_id is required");
  requireString(fullName, "full_name is required");
  if (!isNonEmptyString(email) || !email.includes("@")) throw new ValidationError("a valid email is required");
  if (!["stakeholder", "pmo"].includes(role)) throw new ValidationError("role must be stakeholder or pmo");
  const username = (isNonEmptyString(usernameRaw) ? usernameRaw : email.split("@")[0]).trim().toLowerCase();
  if (!USERNAME_RE.test(username)) {
    throw new ValidationError("username may only contain letters, numbers, dots, dashes and underscores");
  }
  const password = isNonEmptyString(passwordRaw) ? passwordRaw : DEFAULT_PASSWORD;
  requireUuidArray(subProjectIds, "sub_project_ids must be an array of ids");

  const user = await createUser({
    organizationId,
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    title: isNonEmptyString(title) ? title.trim() : null,
    role,
    username,
    password,
    subProjectIds,
  });
  // The password is echoed back once so the admin can pass it on; it is
  // only ever stored hashed.
  res.status(201).json({ status: "ok", user, initial_password: password });
}
