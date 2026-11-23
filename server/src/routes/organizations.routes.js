import { Router } from "express";
import * as Organizations from "../controllers/organizations.controller.js";

const router = Router();
router.post("/", Organizations.create);
router.get("/", Organizations.list);
router.get("/:id", Organizations.get);
export default router;
