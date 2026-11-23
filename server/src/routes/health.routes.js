import { Router } from "express";
import * as Health from "../controllers/health.controller.js";

const router = Router();
router.get("/", Health.status);
router.get("/db", Health.database);
export default router;
