import { EventEmitter } from "node:events";

// In-process event bus: the app's Webhook & Event Listener. Calendar
// changes made in PMO Pilot (an attendee declining, for now) are published
// here, and listeners react to them asynchronously, after the HTTP response
// has gone back. A Microsoft Graph change-notification webhook would publish
// onto the same bus, so the listeners wouldn't need to change.
export const calendarEventBus = new EventEmitter();

export const EVENTS = {
  ATTENDEE_DECLINED: "attendee.declined",
};
