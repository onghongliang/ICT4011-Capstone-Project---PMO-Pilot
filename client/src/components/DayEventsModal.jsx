import { format, isSameDay } from "date-fns";

// Every meeting on one date, in time order — opened by clicking a day
// (its number, empty space, or the "+N more" link) since month cells only
// fit a couple of meetings.
export function DayEventsModal({ day, events, onSelectEvent, onClose }) {
  const dayEvents = events.filter((e) => isSameDay(e.start, day)).sort((a, b) => a.start - b.start);
  const time = (d) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-lg bg-surface shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="font-semibold text-slate-800">{format(day, "EEEE, d MMMM yyyy")}</h2>
            <p className="text-xs text-slate-500">
              {dayEvents.length} meeting{dayEvents.length === 1 ? "" : "s"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {dayEvents.length === 0 && <p className="text-sm text-slate-500">No meetings scheduled on this day.</p>}
          {dayEvents.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onSelectEvent(e.id)}
              className="flex w-full items-start gap-3 rounded border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
            >
              <span className="w-32 shrink-0 text-sm font-medium text-slate-700">
                {time(e.start)} – {time(e.end)}
              </span>
              <span className="text-sm">
                <span className="block text-slate-800">{e.title}</span>
                {e.location && <span className="block text-xs text-slate-500">{e.location}</span>}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
