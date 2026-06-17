// backend/src/routes/client.routes.ts
import { Router } from "express";
import { getClients, getClientById, createClient, updateClient, deleteClient, getClientHistory } from "../controllers/client.controller";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

// Office and admin can manage clients, chauffeurs can view list but not alter
router.get("/", authenticate as any, getClients as any);
router.get("/:id", authenticate as any, getClientById as any);
router.post("/", authenticate as any, authorize(["SUPER_ADMIN", "BUREAU"]) as any, createClient as any);
router.put("/:id", authenticate as any, authorize(["SUPER_ADMIN", "BUREAU"]) as any, updateClient as any);
router.delete("/:id", authenticate as any, authorize(["SUPER_ADMIN"]) as any, deleteClient as any);
router.get("/:id/history", authenticate as any, getClientHistory as any);

export default router;
