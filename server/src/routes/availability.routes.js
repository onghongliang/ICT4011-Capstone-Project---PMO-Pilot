import { Router } from "express";
import * as Scheduling from "../controllers/scheduling.controller.js";

const router = Router();
router.post("/query", Scheduling.availability);
export default router;
