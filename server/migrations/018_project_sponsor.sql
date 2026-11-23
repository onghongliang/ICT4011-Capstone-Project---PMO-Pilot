-- The organisation-wide Project Sponsor. Unlike the per-sub-project roles
-- (Project Lead, Process Owner, PIC) the sponsor sits above every
-- sub-project, so they're recorded on the organisation itself. Steering
-- committee meetings always include them.
ALTER TABLE organizations
  ADD COLUMN sponsor_stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE SET NULL;
