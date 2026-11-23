import { ForbiddenError } from "../utils/errors.js";

// Roles that may book, reschedule and cancel meetings and see every team.
export const PMO_ROLES = ["admin", "pmo"];

export function isPmo(user) {
  return PMO_ROLES.includes(user?.role);
}

// Use after requireAuth. Restricts a route to the given user roles
// ('admin' | 'pmo' | 'stakeholder').
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) throw new ForbiddenError();
    next();
  };
}
