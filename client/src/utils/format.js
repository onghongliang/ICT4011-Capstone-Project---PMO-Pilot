// "Tue, Dec 2, 10:00 AM – 11:00 AM"
export function formatRange(start, end) {
  const s = new Date(start);
  return `${s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}, ${s.toLocaleTimeString(
    undefined,
    { hour: "numeric", minute: "2-digit" }
  )} – ${new Date(end).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

// "Tuesday, December 2 at 10:00 AM" — for the chat assistant's sentences.
export function formatSlot(start) {
  const s = new Date(start);
  return `${s.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} at ${s.toLocaleTimeString(
    undefined,
    { hour: "numeric", minute: "2-digit" }
  )}`;
}
