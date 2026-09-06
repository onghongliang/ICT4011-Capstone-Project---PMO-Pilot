CREATE TABLE sub_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- Code is optional but must be unique within an org when present.
CREATE UNIQUE INDEX uq_sub_projects_org_code ON sub_projects(organization_id, code) WHERE code IS NOT NULL;
CREATE INDEX idx_sub_projects_organization_id ON sub_projects(organization_id);

CREATE TRIGGER trg_sub_projects_updated_at
BEFORE UPDATE ON sub_projects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
