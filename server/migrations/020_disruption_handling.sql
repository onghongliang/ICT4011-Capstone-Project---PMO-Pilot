-- Rescheduling flow (disruption handling): when an attendee declines, the
-- disruption handler records whether it's critical (a mandatory attendee)
-- and proactively computes alternative slots, so the PMO sees options
-- straight away instead of having to go looking.
ALTER TABLE calendar_event_attendees
  ADD COLUMN is_critical_decline BOOLEAN,
  ADD COLUMN proposed_alternatives JSONB;

-- Why a meeting was last moved (e.g. "Kai Xin Goh was unavailable: on
-- leave"), shown to attendees and included in the updated invite.
ALTER TABLE calendar_events
  ADD COLUMN reschedule_reason TEXT;
