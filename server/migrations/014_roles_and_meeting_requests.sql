-- Every stakeholder can now log in, so logins carry a role deciding what
-- they may do: 'admin' (app operator) and 'pmo' (PMO officers) book
-- meetings directly; 'stakeholder' accounts can only request one, which a
-- PMO officer then schedules or declines.
ALTER TABLE users
  ADD COLUMN role TEXT NOT NULL DEFAULT 'stakeholder'
    CHECK (role IN ('admin', 'pmo', 'stakeholder'));

UPDATE users SET role = 'admin' WHERE stakeholder_id IS NULL;
UPDATE users SET role = 'pmo' WHERE stakeholder_id IS NOT NULL;

-- A stakeholder's ask for a meeting, routed to the PMO. calendar_event_id
-- links the meeting a PMO officer eventually booked for it (if approved).
CREATE TABLE meeting_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by_stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  sub_project_id UUID REFERENCES sub_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined')),
  handled_by_stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE SET NULL,
  calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meeting_requests_organization_id ON meeting_requests(organization_id);
CREATE INDEX idx_meeting_requests_requested_by ON meeting_requests(requested_by_stakeholder_id);

CREATE TRIGGER trg_meeting_requests_updated_at
BEFORE UPDATE ON meeting_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
