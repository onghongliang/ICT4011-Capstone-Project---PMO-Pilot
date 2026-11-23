// Shared summaries for the dashboard cards and the project detail page.

// "TBC" until a sub-project has milestones planned; otherwise the count and
// how many are at risk.
export function milestoneSummary(milestones) {
  if (milestones.length === 0) return "TBC";
  const atRisk = milestones.filter((m) => ["at_risk", "delayed"].includes(m.status)).length;
  return `${milestones.length}${atRisk > 0 ? ` (${atRisk} at risk)` : ""}`;
}

export function openActionItemCount(actionItems) {
  return actionItems.filter((a) => !["done", "cancelled"].includes(a.status)).length;
}
