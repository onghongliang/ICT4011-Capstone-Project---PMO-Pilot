-- Our own free/busy source of truth. Real-world calendars are bridged via
-- outbound .ics/email invites (ics_uid), not via any calendar provider API.
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sub_project_id UUID REFERENCES sub_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  meeting_type TEXT
    CHECK (meeting_type IN ('track_sync', 'steering_committee', 'milestone_review', 'ad_hoc')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  ics_uid TEXT UNIQUE,
  created_by_stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX idx_calendar_events_organization_id ON calendar_events(organization_id);
CREATE INDEX idx_calendar_events_sub_project_id ON calendar_events(sub_project_id);
CREATE INDEX idx_calendar_events_time_range ON calendar_events(start_time, end_time);

CREATE TRIGGER trg_calendar_events_updated_at
BEFORE UPDATE ON calendar_events
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
