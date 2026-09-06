-- Defines the vocabulary of mandatory-attendee roles per organization
-- (e.g. 'program_head', 'sub_project_pic', 'sponsor') so the hierarchy is
-- configurable data, not a hardcoded column/enum.
CREATE TABLE role_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  is_mandatory_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE INDEX idx_role_types_organization_id ON role_types(organization_id);
