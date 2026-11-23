import { useMemo, useState } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { BookingChatModal } from "../components/BookingChatModal.jsx";
import { RequestMeetingModal } from "../components/RequestMeetingModal.jsx";
import { EventDetailModal } from "../components/EventDetailModal.jsx";
import { DayEventsModal } from "../components/DayEventsModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useCalendarEvents } from "../hooks/useCalendarEvents.js";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { "en-US": enUS },
});

export function Calendar() {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date());
  const { events, reload: loadEvents } = useCalendarEvents(date);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showBookingChat, setShowBookingChat] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const { defaultDate } = useMemo(() => ({ defaultDate: new Date() }), []);

  return (
    <div className="relative space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Calendar</h1>
        <button
          type="button"
          onClick={() => (user.canBook ? setShowBookingChat(true) : setShowRequestModal(true))}
          className="rounded bg-brand px-4 py-2 text-sm font-medium text-on-brand shadow hover:bg-brand-hover"
        >
          {user.canBook ? "+ Book a Meeting" : "+ Request a Meeting"}
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-surface p-3 shadow-sm" style={{ height: 650 }}>
        <BigCalendar
          localizer={localizer}
          events={events}
          date={date}
          defaultDate={defaultDate}
          onNavigate={setDate}
          views={["month"]}
          onSelectEvent={(e) => setSelectedEventId(e.id)}
          // All three open the full list for that day: the date number,
          // "+N more", and a click on the day cell's empty space.
          onDrillDown={(day) => setSelectedDay(day)}
          onShowMore={(_events, day) => setSelectedDay(day)}
          selectable
          onSelectSlot={(slot) => setSelectedDay(slot.start)}
          style={{ height: "100%" }}
        />
      </div>

      {selectedDay && (
        <DayEventsModal
          day={selectedDay}
          events={events}
          onSelectEvent={setSelectedEventId}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {selectedEventId && <EventDetailModal eventId={selectedEventId} onClose={() => setSelectedEventId(null)} onChanged={loadEvents} />}

      {showBookingChat && (
        <BookingChatModal onClose={() => setShowBookingChat(false)} onBooked={loadEvents} />
      )}

      {showRequestModal && <RequestMeetingModal onClose={() => setShowRequestModal(false)} />}
    </div>
  );
}
