import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import actionItems from "./actionItems.routes.js";
import auth from "./auth.routes.js";
import availability from "./availability.routes.js";
import calendarEvents from "./calendarEvents.routes.js";
import health from "./health.routes.js";
import invitations from "./invitations.routes.js";
import meetingRequests from "./meetingRequests.routes.js";
import milestones from "./milestones.routes.js";
import organizations from "./organizations.routes.js";
import scheduling from "./scheduling.routes.js";
import stakeholders from "./stakeholders.routes.js";
import subProjects from "./subProjects.routes.js";
import teams from "./teams.routes.js";
import users from "./users.routes.js";

// The whole API surface in one place. Health and login are public;
// everything after requireAuth needs a valid token.
const api = Router();

api.use("/health", health);
api.use("/auth", auth);

api.use(requireAuth);
api.use("/organizations", organizations);
api.use("/stakeholders", stakeholders);
api.use("/sub-projects", subProjects);
api.use("/milestones", milestones);
api.use("/action-items", actionItems);
api.use("/calendar-events", calendarEvents);
api.use("/availability", availability);
api.use("/scheduling", scheduling);
api.use("/meeting-requests", meetingRequests);
api.use("/invitations", invitations);
api.use("/teams", teams);
api.use("/admin/users", users);

export default api;
