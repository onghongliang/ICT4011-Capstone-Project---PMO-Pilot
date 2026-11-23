import { useState } from "react";
import { listProjects } from "../api/projects.js";
import { createUser, listUsers } from "../api/users.js";
import { useOrg } from "../context/OrgContext.jsx";
import { useResource } from "./useResource.js";

const EMPTY_FORM = { full_name: "", email: "", title: "", role: "stakeholder", username: "", password: "", sub_project_ids: [] };

// Admin user management: the account list plus the new-user form.
export function useManageUsers() {
  const { organization } = useOrg();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const { data, error, reload } = useResource(async () => {
    const [users, projects] = await Promise.all([listUsers(organization.id), listProjects(organization.id)]);
    return { users, subProjects: projects.subProjects };
  }, [organization]);

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleProject(id) {
    setForm((f) => ({
      ...f,
      sub_project_ids: f.sub_project_ids.includes(id) ? f.sub_project_ids.filter((x) => x !== id) : [...f.sub_project_ids, id],
    }));
  }

  async function submit() {
    setSaving(true);
    setSubmitError(null);
    setCreated(null);
    try {
      const result = await createUser({ ...form, organization_id: organization.id });
      setCreated({ ...result.user, password: result.initial_password });
      setForm(EMPTY_FORM);
      reload();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return {
    users: data?.users ?? null,
    subProjects: data?.subProjects ?? [],
    form,
    setField,
    toggleProject,
    submit,
    saving,
    created,
    error: submitError ?? error,
    // What the username will default to while the field is left empty.
    usernamePlaceholder: form.email.includes("@") ? form.email.split("@")[0].toLowerCase() : "defaults to the email name",
  };
}
