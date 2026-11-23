import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { config } from "../config/env.js";
import * as Users from "../models/users.model.js";

// Returns the user (without the hash) if the password matches, else null.
export async function verifyCredentials(username, password) {
  const user = await Users.findByUsername(username);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) return null;
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    stakeholderId: user.stakeholder_id,
    fullName: user.full_name ?? user.username,
  };
}

export function issueToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
      stakeholder_id: user.stakeholderId ?? null,
      full_name: user.fullName,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}
