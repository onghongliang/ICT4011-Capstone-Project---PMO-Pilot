// Builds RFC 5545 iCalendar content. This is PMO Pilot's bridge to
// real-world calendars: since we don't integrate with any calendar
// provider's API, a standard .ics invite (openable by Outlook/Gmail/Apple
// Calendar, and recognized by mail clients as an actual meeting request
// when sent with METHOD:REQUEST) is how a meeting booked in our own
// database reaches an attendee's real calendar.

function escapeIcsText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatIcsDateUTC(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

// RFC 5545 requires content lines to be folded at 75 octets, with
// continuation lines starting with a single space.
function foldIcsLine(line) {
  if (line.length <= 75) return line;
  const chunks = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 0) {
    chunks.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return chunks.join("\r\n");
}

// method: "REQUEST" when booking or rescheduling, "CANCEL" when cancelling.
// SEQUENCE comes from the event, which is bumped on each reschedule so the
// re-sent invite updates the attendee's existing calendar entry.
export function buildIcsInvite({ event, organizer, attendees, method = "REQUEST" }) {
  const lines = [
    "BEGIN:VCALENDAR",
    "PRODID:-//PMO Pilot//EN",
    "VERSION:2.0",
    `METHOD:${method}`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.ics_uid}`,
    `DTSTAMP:${formatIcsDateUTC(new Date())}`,
    `DTSTART:${formatIcsDateUTC(new Date(event.start_time))}`,
    `DTEND:${formatIcsDateUTC(new Date(event.end_time))}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }
  if (organizer?.email) {
    lines.push(`ORGANIZER;CN=${escapeIcsText(organizer.name ?? organizer.email)}:MAILTO:${organizer.email}`);
  }
  for (const attendee of attendees) {
    const role = attendee.isMandatory ? "REQ-PARTICIPANT" : "OPT-PARTICIPANT";
    lines.push(
      `ATTENDEE;CN=${escapeIcsText(attendee.name)};ROLE=${role};PARTSTAT=NEEDS-ACTION;RSVP=TRUE:MAILTO:${attendee.email}`
    );
  }
  lines.push(
    `STATUS:${method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
    `SEQUENCE:${event.sequence ?? 0}`,
    "END:VEVENT",
    "END:VCALENDAR"
  );

  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
