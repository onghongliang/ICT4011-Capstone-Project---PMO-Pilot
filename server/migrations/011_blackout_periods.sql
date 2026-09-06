-- Soft constraints, not hard failures: `weight` down-weights a slot instead
-- of rejecting it outright. `recurrence_rule` is a standard iCal RRULE
-- string (e.g. "FREQ=YEARLY;BYMONTH=1,4,7,10;BYMONTHDAY=1-14" for "first
-- two weeks of every quarter"), reusing the RRULE vocabulary the .ics
-- invite feature already needs instead of inventing a second format.
CREATE TABLE blackout_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sub_project_id UUID REFERENCES sub_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  recurrence_rule TEXT,
  weight NUMERIC(3, 2) NOT NULL DEFAULT 0.50 CHECK (weight BETWEEN 0 AND 1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX idx_blackout_periods_organization_id ON blackout_periods(organization_id);
CREATE INDEX idx_blackout_periods_sub_project_id ON blackout_periods(sub_project_id);

CREATE TRIGGER trg_blackout_periods_updated_at
BEFORE UPDATE ON blackout_periods
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
