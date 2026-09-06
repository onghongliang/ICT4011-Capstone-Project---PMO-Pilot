-- Join table between events and stakeholders. role_type_id records *which
-- hat* made an attendee mandatory (e.g. invited as Program Head), so a
-- scheduling conflict can be attributed to a specific person/role rather
-- than reported as a generic clash.
CREATE TABLE calendar_event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  role_type_id UUID REFERENCES role_types(id) ON DELETE SET NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  response_status TEXT NOT NULL DEFAULT 'needs_action'
    CHECK (response_status IN ('needs_action', 'accepted', 'declined', 'tentative')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (calendar_event_id, stakeholder_id)
);

CREATE INDEX idx_cea_calendar_event_id ON calendar_event_attendees(calendar_event_id);
CREATE INDEX idx_cea_stakeholder_id ON calendar_event_attendees(stakeholder_id);
