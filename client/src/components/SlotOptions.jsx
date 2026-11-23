import { formatRange } from "../utils/format.js";

// The Recommendation Engine's ranked candidates, each with its rationale,
// for the coordinator to pick from (booking and rescheduling chats).
export function SlotOptions({ slots, onChoose, busy, label = "Choose" }) {
  return (
    <div className="space-y-2">
      {slots.map((slot, i) => (
        <div key={slot.start_time} className="rounded-lg border border-slate-200 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-slate-800">
                {i === 0 && <span className="mr-1.5 rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">Best</span>}
                {formatRange(slot.start_time, slot.end_time)}
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
                {slot.rationale.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => onChoose(slot)}
              className="shrink-0 rounded bg-brand px-3 py-1.5 text-xs font-medium text-on-brand hover:bg-brand-hover disabled:opacity-50"
            >
              {label}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
