// One message in the chat-styled booking/rescheduling flows.
export function Bubble({ from, children }) {
  const isBot = from === "bot";
  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isBot ? "bg-slate-100 text-slate-800" : "bg-brand text-on-brand"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
