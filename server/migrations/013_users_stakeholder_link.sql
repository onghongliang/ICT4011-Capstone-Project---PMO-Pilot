-- Logins are no longer admin-only: PMO officers get their own accounts too,
-- each tied to their stakeholder record so meetings they book are attributed
-- to them. The admin account keeps a NULL stakeholder_id (app operator, not a
-- PMO domain person). ON DELETE CASCADE means a reseed (which truncates
-- organizations → stakeholders) clears PMO logins along with their
-- stakeholders, and the seed recreates them.
ALTER TABLE admin_users RENAME TO users;

ALTER TABLE users
  ADD COLUMN stakeholder_id UUID UNIQUE REFERENCES stakeholders(id) ON DELETE CASCADE;
