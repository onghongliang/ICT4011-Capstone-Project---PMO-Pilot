-- App-level login (there is exactly one operator account), deliberately
-- separate from the PMO domain model (not organization-scoped) since this
-- gates the whole app rather than belonging to any one organization.
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
