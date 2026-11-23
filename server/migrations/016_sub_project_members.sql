-- General team membership for a sub-project (analysts, leads, coordinators,
-- …). sub_project_roles only holds the one-per-role leadership positions
-- (Program Head, PIC, Sponsor), so this is what places everyone else on a
-- team — and what decides which colleagues a stakeholder can see.
CREATE TABLE sub_project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sub_project_id UUID NOT NULL REFERENCES sub_projects(id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sub_project_id, stakeholder_id)
);

CREATE INDEX idx_sub_project_members_stakeholder_id ON sub_project_members(stakeholder_id);
