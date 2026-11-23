# PMO Pilot

An AI-powered scheduling and workflow coordination assistant for Project Management Offices (PMOs), built as an ICT4011 Capstone Project.

PMO Pilot maintains its own calendar/availability data (rather than depending on Microsoft Graph API access, which requires tenant-admin permissions not realistically available in a student/intern context) and layers a context-aware recommendation engine, an LLM-powered conversational assistant, and a rescheduling module on top. See the accompanying literature review and progress report for full background and architecture.

## Stack

- **Client:** React (Vite)
- **Server:** Node.js + Express
- **Database:** PostgreSQL

## Project Structure

```
├── client/src/              # React frontend (Vite) — MVVM
│   ├── pages/, components/  #   View: rendering only
│   ├── hooks/               #   ViewModel: each screen's state and actions (e.g. useBookingChat)
│   ├── api/                 #   Model: one module per API resource; http.js is the shared client
│   ├── context/             #   App-wide state: auth, organization, notification badge
│   └── utils/               #   Formatting, theme and summary helpers
├── server/                  # Express API — MVC with a service layer
│   ├── migrations/          #   Numbered SQL schema migrations (applied in order)
│   └── src/
│       ├── routes/          #   URL → middleware → controller wiring only (routes/index.js = whole API)
│       ├── controllers/     #   HTTP layer: validate the request, call a service/model, send JSON
│       ├── services/        #   Business logic: availability, recommendation, context/agenda,
│       │                    #   meetings, disruption handling, access rules, users
│       ├── models/          #   Data access: all SQL lives here, one module per table/aggregate
│       ├── integrations/    #   Email (SMTP/.ics), iCalendar builder, in-process event bus
│       ├── middleware/      #   Auth, role checks, central error handler
│       ├── config/          #   Environment settings
│       ├── utils/           #   Error types and validation helpers
│       ├── db/              #   Connection pool + transactions, migration runner, seed script
│       ├── app.js           #   Builds the Express app
│       └── index.js         #   Starts the server and background listeners
├── docker-compose.yml       # Local PostgreSQL for development
```

**Layering rules.** A request flows Route → Controller → Service → Model. Controllers never contain SQL; models never know about HTTP. Simple CRUD controllers may call a model directly; anything with business rules goes through a service. Errors are thrown as typed errors (`utils/errors.js`) and turned into the standard `{ status: "error", message }` response by one error handler. On the client, pages and components call hooks, hooks call `api/` modules, and only `api/http.js` talks to the network.

## Status

Infrastructure scaffolding, the core database schema (organizations, stakeholders, sub-projects, role assignments, milestones, action items, calendar events/attendees, blackout periods, a single admin login — see `server/migrations/`), a synthetic seed dataset (`server/src/db/seed.js`), CRUD endpoints for every core entity, the availability-query endpoint, a meeting-booking endpoint that enforces mandatory-attendee availability before writing anything, the `.ics`/email invite bridge (sent automatically on booking), and a login-gated React frontend (dashboard, stakeholder directory, and a calendar view with a chat-styled booking flow — simulated/deterministic for now, written so it can be swapped for a real LLM-driven agent later) are all in place. See the progress report for full status against the project roadmap, and `setup.md` for how to run it locally. Next: a real LLM-powered version of the booking chat, and the agenda-generation feature designed earlier.
