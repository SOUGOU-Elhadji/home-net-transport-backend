// backend/src/routes/report.routes.ts
import { Router } from "express";
import { getDashboardStats, getSystemLogs } from "../controllers/report.controller";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

router.get("/dashboard-stats", authenticate as any, getDashboardStats as any);
router.get("/logs", authenticate as any, authorize(["SUPER_ADMIN"]) as any, getSystemLogs as any);

export default router;
