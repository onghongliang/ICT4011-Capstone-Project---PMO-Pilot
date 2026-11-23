import { issueToken, verifyCredentials } from "../services/auth.service.js";
import { AuthenticationError, ValidationError } from "../utils/errors.js";

// POST /api/auth/login
export async function login(req, res) {
  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    throw new ValidationError("username and password are required");
  }
  const user = await verifyCredentials(username, password);
  if (!user) throw new AuthenticationError("invalid username or password");
  res.json({ status: "ok", token: issueToken(user), username: user.username, role: user.role });
}
