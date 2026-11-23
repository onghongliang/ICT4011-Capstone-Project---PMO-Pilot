import { useRescheduleChat } from "../hooks/useRescheduleChat.js";
import { Bubble } from "./ChatBubble.jsx";
import { SlotOptions } from "./SlotOptions.jsx";

const SECONDARY_BTN =
  "rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

// The reschedule chat's view; the conversation logic is in useRescheduleChat.
export function RescheduleChatModal({ decline, onClose, onDone }) {
  const chat = useRescheduleChat({ decline, onDone, onClose });

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4">
      <div className="flex h-[36rem] w-full max-w-lg flex-col rounded-lg bg-surface shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-800">Reschedule Meeting</h2>
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

          {chat.step === "choose" && (
            <div className="space-y-2">
              <SlotOptions slots={chat.options} onChoose={chat.moveTo} busy={chat.busy} label="Move here" />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={chat.showLaterTimes} disabled={chat.busy} className={SECONDARY_BTN}>
                  Show later times
                </button>
                <button type="button" onClick={chat.keepOriginal} disabled={chat.busy} className={SECONDARY_BTN}>
                  Keep original time
                </button>
              </div>
            </div>
          )}

          {chat.step === "no-slot" && (
            <div className="flex gap-2">
              <button type="button" onClick={chat.keepOriginal} disabled={chat.busy} className={SECONDARY_BTN}>
                Keep original time
              </button>
              <button type="button" onClick={onClose} className={SECONDARY_BTN}>
                Close
              </button>
            </div>
          )}

          {chat.step === "done" && (
            <button type="button" onClick={onClose} className={SECONDARY_BTN}>
              Close
            </button>
          )}

          {chat.error && <p className="text-sm text-red-600">{chat.error}</p>}
        </div>
      </div>
    </div>
  );
}
