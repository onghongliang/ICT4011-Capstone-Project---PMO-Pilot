import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { registerDisruptionHandlers } from "./services/disruption.service.js";
import { warmAllowedValuesCache } from "./utils/schemaEnums.js";

// Background listeners (the event-driven rescheduling flow) start with the server.
registerDisruptionHandlers();

warmAllowedValuesCache()
  .then(() => console.log("Enum validation cache warmed from schema constraints"))
  .catch((err) => console.error("Failed to warm enum validation cache:", err.message));

createApp().listen(config.port, () => {
  console.log(`PMO Pilot server running on http://localhost:${config.port}`);
});
