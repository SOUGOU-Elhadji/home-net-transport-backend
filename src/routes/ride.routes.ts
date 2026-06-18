// backend/src/routes/ride.routes.ts
import { Router } from "express";
import { 
  getRides, 
  createRide, 
  updateRide, 
  duplicateRide, 
  deleteRide, 
  getRecurringReservations, 
  createRecurringReservation, 
  deleteRecurringReservation 
} from "../controllers/ride.controller";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

// Retrieve rides for admins/chauffeurs
router.get("/", authenticate as any, getRides as any);
router.post("/", authenticate as any, authorize(["SUPER_ADMIN", "ADMIN"]) as any, createRide as any);
router.put("/:id", authenticate as any, updateRide as any); // Chauffeurs can also update status & real mileage
router.post("/:id/duplicate", authenticate as any, authorize(["SUPER_ADMIN", "ADMIN"]) as any, duplicateRide as any);
router.delete("/:id", authenticate as any, authorize(["SUPER_ADMIN"]) as any, deleteRide as any);

// Recurring Reservations
router.get("/recurring/list", authenticate as any, getRecurringReservations as any);
router.post("/recurring/list", authenticate as any, authorize(["SUPER_ADMIN", "ADMIN"]) as any, createRecurringReservation as any);
router.delete("/recurring/list/:id", authenticate as any, authorize(["SUPER_ADMIN", "ADMIN"]) as any, deleteRecurringReservation as any);

export default router;
