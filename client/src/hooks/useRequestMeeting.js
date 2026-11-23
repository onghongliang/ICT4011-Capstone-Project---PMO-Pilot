import { useState } from "react";
import { createMeetingRequest } from "../api/meetingRequests.js";
import { listProjects } from "../api/projects.js";
import { useOrg } from "../context/OrgContext.jsx";
import { useResource } from "./useResource.js";

// A stakeholder's request to the PMO: their projects to pick from, the
// form fields and sending it.
export function useRequestMeeting() {
  const { organization } = useOrg();
  const { data } = useResource(() => listProjects(organization.id), [organization]);
  const [subProjectId, setSubProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  async function submit() {
    setSending(true);
    setError(null);
    try {
      await createMeetingRequest({ organization_id: organization.id, sub_project_id: subProjectId || null, title, reason });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return {
    subProjects: data?.subProjects ?? [],
    subProjectId,
    setSubProjectId,
    title,
    setTitle,
    reason,
    setReason,
    sending,
    sent,
    error,
    submit,
  };
}
