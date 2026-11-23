import * as ActionItems from "../models/actionItems.model.js";
import * as Milestones from "../models/milestones.model.js";
import * as SubProjects from "../models/subProjects.model.js";

// Context Engine: the project data that decides who must attend and why a
// slot matters — upcoming milestones (deadlines) and open action items
// (priorities) — plus the rule-based agenda drafted from it. The agenda
// drafting is deterministic today; it's isolated here so an LLM can take it
// over later without changing its callers.

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

export async function getProjectContext(subProjectId) {
  const [subProject, milestones, actionItems] = await Promise.all([
    SubProjects.findSummary(subProjectId),
    Milestones.upcomingFor(subProjectId),
    ActionItems.openFor(subProjectId),
  ]);
  const openActionItems = actionItems.sort(
    (a, b) =>
      (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9) ||
      String(a.due_date ?? "9999").localeCompare(String(b.due_date ?? "9999"))
  );
  return {
    sub_project: subProject,
    upcoming_milestones: milestones,
    open_action_items: openActionItems,
    // The scheduling deadline: a meeting should land before the next milestone.
    next_deadline: milestones[0]?.due_date ?? null,
  };
}

function dateLabel(d) {
  return new Date(d).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}

// Drafts an editable agenda for a meeting from its purpose and the project
// context. Steering committees get an all-project status round instead.
export async function draftAgenda({ organizationId, subProjectId = null, title, meetingType = null, requestReason = null }) {
  const lines = [`Agenda: ${title}`, ""];
  let n = 1;
  const item = (text) => lines.push(`${n++}. ${text}`);

  if (meetingType === "steering_committee") {
    const projects = await SubProjects.statusSummaries(organizationId);
    item(`Purpose: ${title}`);
    item("Programme status round:");
    for (const p of projects) {
      lines.push(
        `   - ${p.name} (${p.code}): ${p.status}; next milestone ${p.next_due ? dateLabel(p.next_due) : "TBC"}; ${p.open_items} open action item(s)`
      );
    }
    item("Key risks, issues and decisions required");
    item("AOB and next steering committee date");
    return { agenda: lines.join("\n"), context: { projects } };
  }

  const context = subProjectId ? await getProjectContext(subProjectId) : null;
  if (meetingType === "kickoff") {
    item("Introductions and roles (Project Lead, Process Owner, PIC, team)");
    item(`Project scope and objectives${context?.sub_project?.description ? `: ${context.sub_project.description}` : ""}`);
    item(
      context?.upcoming_milestones.length
        ? `Milestone plan: ${context.upcoming_milestones.map((m) => `${m.name} (${dateLabel(m.due_date)})`).join("; ")}`
        : "Milestone plan: milestones TBC, to be agreed in this meeting"
    );
    item("Working arrangements, reporting cadence and next steps");
    return { agenda: lines.join("\n"), context };
  }

  item(`Purpose: ${title}`);
  if (requestReason) lines.push(`   Raised because: ${requestReason}`);
  if (context) {
    const next = context.upcoming_milestones[0];
    item(next ? `Milestone check: "${next.name}" due ${dateLabel(next.due_date)}` : "Milestone check: milestones TBC");
    if (context.open_action_items.length > 0) {
      item(`Open action items (${context.open_action_items.length}):`);
      for (const a of context.open_action_items.slice(0, 5)) {
        lines.push(
          `   - [${a.priority}] ${a.title}${a.assignee_name ? ` (${a.assignee_name})` : ""}${a.due_date ? `, due ${dateLabel(a.due_date)}` : ""}`
        );
      }
    } else {
      item("Open action items: none outstanding");
    }
  }
  item("Decisions and next steps");
  return { agenda: lines.join("\n"), context };
}
