// backend/src/routes/vehicle.routes.ts
import { Router } from "express";
import { getVehicles, getVehicleById, createVehicle, updateVehicle, deleteVehicle, getVehicleHistory } from "../controllers/vehicle.controller";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

router.get("/", authenticate as any, getVehicles as any);
router.get("/:id", authenticate as any, getVehicleById as any);
router.post("/", authenticate as any, authorize(["SUPER_ADMIN", "ADMIN"]) as any, createVehicle as any);
router.put("/:id", authenticate as any, authorize(["SUPER_ADMIN", "ADMIN"]) as any, updateVehicle as any);
router.delete("/:id", authenticate as any, authorize(["SUPER_ADMIN"]) as any, deleteVehicle as any);
router.get("/:id/history", authenticate as any, getVehicleHistory as any);

export default router;
