// backend/src/controllers/vehicle.controller.ts
import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { prisma } from "../services/db";

// Preseed default vehicles if empty
async function ensureDefaultVehicles() {
  const count = await prisma.vehicle.count();
  if (count === 0) {
    await prisma.vehicle.createMany({
      data: [
        {
          registrationNumber: "AA-123-BB",
          brand: "Ford",
          model: "Transit Custom (PMR)",
          type: "PMR",
          mileage: 12500.0,
          insuranceDate: "2027-02-15",
          technicalInspectionDate: "2027-06-01",
          status: "AVAILABLE"
        },
        {
          registrationNumber: "CC-456-DD",
          brand: "Peugeot",
          model: "Rifter PMR",
          type: "PMR",
          mileage: 48900.0,
          insuranceDate: "2026-11-20",
          technicalInspectionDate: "2026-12-10",
          status: "AVAILABLE"
        },
        {
          registrationNumber: "EE-789-FF",
          brand: "Toyota",
          model: "Proace Verso",
          type: "Standard",
          mileage: 82100.0,
          insuranceDate: "2027-03-30",
          technicalInspectionDate: "2027-04-12",
          status: "AVAILABLE"
        },
        {
          registrationNumber: "GG-101-HH",
          brand: "Renault",
          model: "Kangoo",
          type: "Standard",
          mileage: 110400.0,
          insuranceDate: "2026-10-05",
          technicalInspectionDate: "2027-01-20",
          status: "MAINTENANCE"
        }
      ]
    });
    console.log("Database default vehicles seeded.");
  }
}

export const getVehicles = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureDefaultVehicles();
    const vehicles = await prisma.vehicle.findMany({
      orderBy: { brand: "asc" }
    });
    return res.json(vehicles);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur liste véhicules", error: error.message });
  }
};

export const getVehicleById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        rides: {
          orderBy: { date: "desc" },
          take: 10,
          include: {
            client: { select: { firstName: true, lastName: true } },
            chauffeur: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    if (!vehicle) {
      return res.status(404).json({ message: "Véhicule introuvable" });
    }

    return res.json(vehicle);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur récupération véhicule", error: error.message });
  }
};

export const createVehicle = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { registrationNumber, brand, model, type, mileage, insuranceDate, technicalInspectionDate, status } = req.body;
    if (!registrationNumber || !brand || !model || !type || mileage === undefined || !insuranceDate || !technicalInspectionDate) {
      return res.status(400).json({ message: "Données requises manquantes" });
    }

    const existing = await prisma.vehicle.findUnique({ where: { registrationNumber } });
    if (existing) {
      return res.status(400).json({ message: "Un véhicule avec cette immatriculation existe déjà." });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        registrationNumber,
        brand,
        model,
        type,
        mileage: parseFloat(mileage),
        insuranceDate,
        technicalInspectionDate,
        status: status || "AVAILABLE"
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user?.userId,
        action: "CREATION_VEHICULE",
        details: `Création du véhicule: ${brand} ${model} (${registrationNumber})`
      }
    });

    return res.status(201).json(vehicle);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur création véhicule", error: error.message });
  }
};

export const updateVehicle = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { registrationNumber, brand, model, type, mileage, insuranceDate, technicalInspectionDate, status } = req.body;

    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Véhicule introuvable" });
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        registrationNumber,
        brand,
        model,
        type,
        mileage: parseFloat(mileage),
        insuranceDate,
        technicalInspectionDate,
        status
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user?.userId,
        action: "MODIFICATION_VEHICULE",
        details: `Modification du véhicule: ${brand} ${model} (${registrationNumber})`
      }
    });

    return res.json(vehicle);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur modification véhicule", error: error.message });
  }
};

export const deleteVehicle = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Véhicule introuvable" });
    }

    await prisma.vehicle.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: req.user?.userId,
        action: "SUPPRESSION_VEHICULE",
        details: `Suppression du véhicule: ${existing.brand} ${existing.model} (${existing.registrationNumber})`
      }
    });

    return res.json({ message: "Véhicule supprimé avec succès" });
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur suppression véhicule", error: error.message });
  }
};

export const getVehicleHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const rides = await prisma.ride.findMany({
      where: { vehicleId: id },
      include: {
        client: { select: { firstName: true, lastName: true } },
        chauffeur: { select: { firstName: true, lastName: true } }
      },
      orderBy: { date: "desc" }
    });
    return res.json(rides);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur historique véhicule", error: error.message });
  }
};
