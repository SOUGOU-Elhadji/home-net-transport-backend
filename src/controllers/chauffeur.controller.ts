// backend/src/controllers/chauffeur.controller.ts
import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { prisma } from "../services/db";
import bcryptjs from "bcryptjs";

export const getChauffeurs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const chauffeurs = await prisma.user.findMany({
      where: { role: "CHAUFFEUR" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        licenseNumber: true,
        licenseExpiry: true,
        status: true,
        createdAt: true
      },
      orderBy: { lastName: "asc" }
    });
    return res.json(chauffeurs);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur liste chauffeurs", error: error.message });
  }
};

export const createChauffeur = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone, licenseNumber, licenseExpiry } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: "Données requises manquantes" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "Cet email est déjà pris" });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const chauffeur = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        licenseNumber,
        licenseExpiry,
        role: "CHAUFFEUR",
        status: "ACTIVE"
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user?.userId,
        action: "CREATION_CHAUFFEUR",
        details: `Création du chauffeur: ${lastName} ${firstName}`
      }
    });

    return res.status(201).json({
      id: chauffeur.id,
      email: chauffeur.email,
      firstName: chauffeur.firstName,
      lastName: chauffeur.lastName,
      phone: chauffeur.phone,
      licenseNumber: chauffeur.licenseNumber,
      licenseExpiry: chauffeur.licenseExpiry,
      status: chauffeur.status
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur création chauffeur", error: error.message });
  }
};

export const updateChauffeur = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, phone, licenseNumber, licenseExpiry, status, password } = req.body;

    const existing = await prisma.user.findFirst({
      where: { id, role: "CHAUFFEUR" }
    });

    if (!existing) {
      return res.status(404).json({ message: "Chauffeur introuvable" });
    }

    const updateData: any = {
      email,
      firstName,
      lastName,
      phone,
      licenseNumber,
      licenseExpiry,
      status
    };

    if (password && password.trim() !== "") {
      updateData.password = await bcryptjs.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user?.userId,
        action: "MODIFICATION_CHAUFFEUR",
        details: `Modification du chauffeur: ${lastName} ${firstName}`
      }
    });

    return res.json({
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
      licenseNumber: updated.licenseNumber,
      licenseExpiry: updated.licenseExpiry,
      status: updated.status
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur modification chauffeur", error: error.message });
  }
};

export const getChauffeurRides = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const rides = await prisma.ride.findMany({
      where: { chauffeurId: id },
      include: {
        client: {
          select: { firstName: true, lastName: true, phone: true }
        },
        vehicle: {
          select: { brand: true, model: true, registrationNumber: true }
        }
      },
      orderBy: { date: "desc" }
    });
    return res.json(rides);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur trajets chauffeur", error: error.message });
  }
};
