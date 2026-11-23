-- PMO/admin can cancel a meeting. The row is kept (status = 'cancelled')
-- with who cancelled it, when and why, so attendees can be told and the
-- history stays intact.
ALTER TABLE calendar_events
  ADD COLUMN cancelled_at TIMESTAMPTZ,
  ADD COLUMN cancel_reason TEXT,
  ADD COLUMN cancelled_by_stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE SET NULL;
