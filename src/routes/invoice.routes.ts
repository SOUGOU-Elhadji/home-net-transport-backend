// backend/src/routes/invoice.routes.ts
import { Router } from "express";
import { getInvoices, createInvoice, updateInvoiceStatus, deleteInvoice } from "../controllers/invoice.controller";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

router.get("/", authenticate as any, getInvoices as any);
router.post("/", authenticate as any, authorize(["SUPER_ADMIN", "BUREAU"]) as any, createInvoice as any);
router.put("/:id/status", authenticate as any, authorize(["SUPER_ADMIN", "BUREAU"]) as any, updateInvoiceStatus as any);
router.delete("/:id", authenticate as any, authorize(["SUPER_ADMIN"]) as any, deleteInvoice as any);

export default router;
