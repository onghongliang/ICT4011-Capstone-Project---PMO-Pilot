import express from "express";
import cors from "cors";
import "dotenv/config";

import healthRouter from "./routes/health.js";
import availabilityRouter from "./routes/availability.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/availability", availabilityRouter);

app.listen(PORT, () => {
  console.log(`PMO Pilot server running on http://localhost:${PORT}`);
});
