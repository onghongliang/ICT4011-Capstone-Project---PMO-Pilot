-- Assigns a stakeholder to a role_type for a sub_project, with a validity
-- window so role handovers (e.g. a PIC replacement) don't lose history.
CREATE TABLE sub_project_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sub_project_id UUID NOT NULL REFERENCES sub_projects(id) ON DELETE CASCADE,
  role_type_id UUID NOT NULL REFERENCES role_types(id) ON DELETE RESTRICT,
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  is_mandatory BOOLEAN,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

-- Only one active (effective_to IS NULL) holder per role per sub-project at a time.
CREATE UNIQUE INDEX uq_sub_project_roles_active
  ON sub_project_roles(sub_project_id, role_type_id)
  WHERE effective_to IS NULL;

CREATE INDEX idx_sub_project_roles_organization_id ON sub_project_roles(organization_id);
CREATE INDEX idx_sub_project_roles_stakeholder_id ON sub_project_roles(stakeholder_id);
