// backend/src/routes/auth.routes.ts
import { Router } from "express";
import { login, logout, refreshToken, forgotPassword, resetPassword, getProfile, getUsers, createUser, updateUser } from "../controllers/auth.controller";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

router.post("/login", login as any);
router.post("/logout", authenticate as any, logout as any);
router.post("/refresh", refreshToken as any);
router.post("/forgot-password", forgotPassword as any);
router.post("/reset-password", resetPassword as any);
router.get("/profile", authenticate as any, getProfile as any);

// Admin-only user management routes
router.get("/users", authenticate as any, authorize(["SUPER_ADMIN", "BUREAU"]) as any, getUsers as any);
router.post("/users", authenticate as any, authorize(["SUPER_ADMIN"]) as any, createUser as any);
router.put("/users/:id", authenticate as any, authorize(["SUPER_ADMIN"]) as any, updateUser as any);

export default router;
