import { Router } from "express";
import * as ActionItems from "../controllers/actionItems.controller.js";

const router = Router();
router.post("/", ActionItems.create);
router.get("/", ActionItems.list);
router.get("/:id", ActionItems.get);
router.patch("/:id", ActionItems.update);
router.delete("/:id", ActionItems.remove);
export default router;
