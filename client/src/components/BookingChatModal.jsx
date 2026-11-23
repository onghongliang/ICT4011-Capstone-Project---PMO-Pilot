import { useState } from "react";
import { useBookingChat } from "../hooks/useBookingChat.js";
import { formatSlot } from "../utils/format.js";
import { Bubble } from "./ChatBubble.jsx";
import { SlotOptions } from "./SlotOptions.jsx";

const SECONDARY_BTN = "rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50";

// The booking chat's view; the conversation logic is in useBookingChat.
export function BookingChatModal({ onClose, onBooked, request = null, kickoff = null }) {
  const chat = useBookingChat({ request, kickoff, onBooked });
  const [titleInput, setTitleInput] = useState("");

  function submitTitle(e) {
    e.preventDefault();
    chat.submitTitle(titleInput);
    setTitleInput("");
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4">
      <div className="flex h-[36rem] w-full max-w-lg flex-col rounded-lg bg-surface shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-800">
            {kickoff ? "Schedule Kick-off Meeting" : request ? "Schedule Requested Meeting" : "Book a Meeting"}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {chat.messages.map((m, i) => (
            <Bubble key={i} from={m.from}>
              {m.content}
            </Bubble>
          ))}

          {chat.showProjectChoice && (
            <div className="flex flex-wrap gap-2">
              {chat.subProjects.map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => chat.pickSubProject(sp)}
                  className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                >
                  {sp.name}
                </button>
              ))}
              {chat.canPickSteerco && (
                <button
                  type="button"
                  onClick={chat.pickSteerco}
                  className="rounded-full border border-brand px-3 py-1 text-sm font-medium text-brand hover:bg-brand-soft"
                >
                  Steering Committee (SteerCo)
                </button>
              )}
            </div>
          )}

          {chat.step === "choose-slot" && chat.recommendation && (
            <div className="space-y-2">
              <SlotOptions slots={chat.recommendation.slots} onChoose={chat.chooseSlot} />
              <button type="button" onClick={chat.showLaterTimes} className={SECONDARY_BTN}>
                Show later times
              </button>
            </div>
          )}

          {chat.step === "agenda" && (
            <div className="space-y-2">
              <textarea
                className="w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-xs"
                rows={9}
                value={chat.agendaText}
                onChange={(e) => chat.setAgendaText(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={chat.confirmBooking}
                  disabled={chat.booking}
                  className="rounded bg-brand px-3 py-1.5 text-sm font-medium text-on-brand hover:bg-brand-hover disabled:opacity-50"
                >
                  {chat.booking ? "Booking…" : `Confirm & book ${formatSlot(chat.chosen.start_time)}`}
                </button>
                <button type="button" onClick={() => chat.setStep("choose-slot")} disabled={chat.booking} className={SECONDARY_BTN}>
                  Pick a different time
                </button>
              </div>
            </div>
          )}

          {(chat.step === "booked" || chat.step === "no-slot") && (
            <button type="button" onClick={onClose} className={SECONDARY_BTN}>
              Close
            </button>
          )}

          {chat.error && <p className="text-sm text-red-600">{chat.error}</p>}
        </div>

        {chat.step === "ask-title" && (
          <form onSubmit={submitTitle} className="flex gap-2 border-t border-slate-200 p-3">
            <input
              className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="e.g. UAT scope review"
              autoFocus
            />
            <button type="submit" className="rounded bg-brand px-3 py-1.5 text-sm font-medium text-on-brand hover:bg-brand-hover">
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
