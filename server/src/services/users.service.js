import { withTransaction } from "../db/pool.js";
import * as Stakeholders from "../models/stakeholders.model.js";
import * as SubProjects from "../models/subProjects.model.js";
import * as Teams from "../models/teams.model.js";
import * as Users from "../models/users.model.js";
import { translateDbError, ValidationError } from "../utils/errors.js";
import { hashPassword } from "./auth.service.js";

export const DEFAULT_PASSWORD = "password";

// Every login with the person's project positions (roles and memberships).
export async function listUsers(organizationId) {
  const [users, assignments] = await Promise.all([
    Users.listForOrganization(organizationId),
    Teams.assignmentsForOrganization(organizationId),
  ]);
  return users.map((u) => ({
    ...u,
    projects: assignments
      .filter((a) => a.stakeholder_id === u.stakeholder_id)
      .map((a) => ({ code: a.code, position: a.position })),
  }));
}

// Creates the person, their login and their team memberships atomically.
export async function createUser({ organizationId, fullName, email, title, role, username, password, subProjectIds }) {
  const uniqueSubProjects = [...new Set(subProjectIds)];
  try {
    return await withTransaction(async (db) => {
      if (
        uniqueSubProjects.length > 0 &&
        (await SubProjects.countInOrganization(organizationId, uniqueSubProjects, db)) !== uniqueSubProjects.length
      ) {
        throw new ValidationError("one or more sub_project_ids were not found");
      }
      const stakeholder = await Stakeholders.create({ organizationId, fullName, email, title }, db);
      const user = await Users.create(
        { username, passwordHash: await hashPassword(password), stakeholderId: stakeholder.id, role },
        db
      );
      for (const subProjectId of uniqueSubProjects) {
        await Teams.addMember({ organizationId, subProjectId, stakeholderId: stakeholder.id }, db);
      }
      return { ...user, stakeholder };
    });
  } catch (err) {
    translateDbError(err, {
      23505: (e) =>
        e.constraint === "users_username_key" || e.constraint === "admin_users_username_key"
          ? `username "${username}" is already taken`
          : "a person with this email already exists",
    });
  }
}
