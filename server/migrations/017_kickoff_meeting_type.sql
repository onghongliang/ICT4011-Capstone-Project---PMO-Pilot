-- A 'kickoff' meeting starts a sub-project: booking one for a sub-project
-- still in 'planning' moves it to 'active' (see bookMeeting).
ALTER TABLE calendar_events DROP CONSTRAINT calendar_events_meeting_type_check;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_meeting_type_check
  CHECK (meeting_type IN ('track_sync', 'steering_committee', 'milestone_review', 'ad_hoc', 'kickoff'));
