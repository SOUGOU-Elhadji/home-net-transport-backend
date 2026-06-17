// backend/src/routes/notification.routes.ts
import { Router } from "express";
import { getNotifications, markAsRead, markAllAsRead } from "../controllers/notification.controller";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.get("/", authenticate as any, getNotifications as any);
router.put("/:id/read", authenticate as any, markAsRead as any);
router.post("/read-all", authenticate as any, markAllAsRead as any);

export default router;
