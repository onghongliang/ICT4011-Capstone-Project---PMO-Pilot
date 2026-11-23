import { verifyToken } from "../services/auth.service.js";
import { AuthenticationError } from "../utils/errors.js";

// Every route after this needs a valid login token; the decoded payload
// (id, username, role, stakeholder_id, full_name) becomes req.user.
export function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new AuthenticationError("authentication required");
  }
  try {
    req.user = verifyToken(token);
  } catch {
    throw new AuthenticationError("invalid or expired token");
  }
  next();
}
