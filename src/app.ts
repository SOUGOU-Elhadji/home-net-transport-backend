// backend/src/app.ts
import express from "express";
import cors from "cors";

// Router imports
import authRoutes from "./routes/auth.routes";
import clientRoutes from "./routes/client.routes";
import chauffeurRoutes from "./routes/chauffeur.routes";
import vehicleRoutes from "./routes/vehicle.routes";
import rideRoutes from "./routes/ride.routes";
import invoiceRoutes from "./routes/invoice.routes";
import reportRoutes from "./routes/report.routes";
import notificationRoutes from "./routes/notification.routes";

const app = express();

// Middlewares
app.use(cors({
  origin: "*",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// REST API Routes
app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/chauffeurs", chauffeurRoutes);
app.use("/api/vehicules", vehicleRoutes);
app.use("/api/trajets", rideRoutes);
app.use("/api/factures", invoiceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);

// Healthcheck/Welcome
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    service: "HOME NET Transport API Server", 
    time: new Date().toISOString() 
  });
});

export default app;
