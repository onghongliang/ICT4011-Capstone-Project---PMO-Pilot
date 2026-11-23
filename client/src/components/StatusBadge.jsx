const COLORS = {
  planning: "bg-slate-100 text-slate-700",
  active: "bg-green-100 text-green-700",
  on_hold: "bg-amber-100 text-amber-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
  pending: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  at_risk: "bg-amber-100 text-amber-700",
  delayed: "bg-red-100 text-red-700",
  open: "bg-slate-100 text-slate-700",
  blocked: "bg-red-100 text-red-700",
  done: "bg-green-100 text-green-700",
  approved: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  accepted: "bg-green-100 text-green-700",
  tentative: "bg-amber-100 text-amber-700",
  needs_action: "bg-amber-100 text-amber-700",
};

const PRIORITY_COLORS = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

export function StatusBadge({ status, variant = "status" }) {
  const classes = (variant === "priority" ? PRIORITY_COLORS : COLORS)[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
