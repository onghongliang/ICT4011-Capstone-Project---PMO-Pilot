import { Router } from "express";
import * as SubProjects from "../controllers/subProjects.controller.js";

const router = Router();
router.post("/", SubProjects.create);
router.get("/", SubProjects.list);
router.get("/:id/overview", SubProjects.overview);
router.get("/:id/roles", SubProjects.roles);
router.get("/:id/members", SubProjects.members);
router.get("/:id", SubProjects.get);
router.patch("/:id", SubProjects.update);
export default router;
