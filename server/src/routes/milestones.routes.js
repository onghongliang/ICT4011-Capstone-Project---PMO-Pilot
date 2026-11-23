import { Router } from "express";
import * as Milestones from "../controllers/milestones.controller.js";

const router = Router();
router.post("/", Milestones.create);
router.get("/", Milestones.list);
router.get("/:id", Milestones.get);
router.patch("/:id", Milestones.update);
router.delete("/:id", Milestones.remove);
export default router;
