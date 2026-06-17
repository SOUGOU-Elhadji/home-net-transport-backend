// backend/src/routes/chauffeur.routes.ts
import { Router } from "express";
import { getChauffeurs, createChauffeur, updateChauffeur, getChauffeurRides } from "../controllers/chauffeur.controller";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

router.get("/", authenticate as any, getChauffeurs as any);
router.post("/", authenticate as any, authorize(["SUPER_ADMIN", "BUREAU"]) as any, createChauffeur as any);
router.put("/:id", authenticate as any, authorize(["SUPER_ADMIN", "BUREAU"]) as any, updateChauffeur as any);
router.get("/:id/rides", authenticate as any, getChauffeurRides as any);

export default router;
