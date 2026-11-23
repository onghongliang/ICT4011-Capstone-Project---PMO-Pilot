import cors from "cors";
import express from "express";

import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import api from "./routes/index.js";

// Builds the Express app (no listening), so it can be started by index.js
// or exercised directly in tests.
export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api", api);
  app.use("/api", notFoundHandler);
  app.use(errorHandler);
  return app;
}
