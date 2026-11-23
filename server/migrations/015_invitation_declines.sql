-- When an attendee declines they give a reason and may suggest a better
-- time; the PMO sees it as a notification until they either reschedule the
-- meeting or dismiss it (decline_resolved_at).
ALTER TABLE calendar_event_attendees
  ADD COLUMN decline_reason TEXT,
  ADD COLUMN suggested_start_time TIMESTAMPTZ,
  ADD COLUMN suggested_end_time TIMESTAMPTZ,
  ADD COLUMN responded_at TIMESTAMPTZ,
  ADD COLUMN decline_resolved_at TIMESTAMPTZ,
  ADD CHECK (suggested_end_time IS NULL OR suggested_end_time > suggested_start_time);

-- iCalendar SEQUENCE: bumped on every reschedule so mail clients treat the
-- re-sent invite as an update to the same meeting rather than a new one.
ALTER TABLE calendar_events
  ADD COLUMN sequence INTEGER NOT NULL DEFAULT 0;
