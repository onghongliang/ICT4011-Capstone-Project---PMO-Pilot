import { Router } from "express";
import * as Users from "../controllers/users.controller.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
router.use(requireRole("admin"));
router.get("/", Users.list);
router.post("/", Users.create);
export default router;
