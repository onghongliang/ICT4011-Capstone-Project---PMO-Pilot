# PMO Pilot

An AI-powered scheduling and workflow coordination assistant for Project Management Offices (PMOs), built as an ICT4011 Capstone Project.

PMO Pilot maintains its own calendar/availability data (rather than depending on Microsoft Graph API access, which requires tenant-admin permissions not realistically available in a student/intern context) and layers a context-aware recommendation engine, an LLM-powered conversational assistant, and a rescheduling module on top. See the accompanying literature review and progress report for full background and architecture.

## Stack

- **Client:** React (Vite)
- **Server:** Node.js + Express
- **Database:** PostgreSQL

## Project Structure

```
├── client/           # React frontend (Vite)
├── server/           # Express API
│   ├── migrations/    # Numbered SQL schema migrations (applied in order)
│   └── src/
│       ├── db/        # Database connection (pool), migration runner, seed script
│       └── routes/    # API routes
├── docker-compose.yml # Local PostgreSQL for development
```
