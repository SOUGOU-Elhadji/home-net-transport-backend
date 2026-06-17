// backend/src/controllers/client.controller.ts
import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { prisma } from "../services/db";

export const getClients = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { lastName: "asc" }
    });
    return res.json(clients);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur liste clients", error: error.message });
  }
};

export const getClientById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        rides: {
          orderBy: { date: "desc" },
          take: 10
        }
      }
    });

    if (!client) {
      return res.status(404).json({ message: "Client introuvable" });
    }

    return res.json(client);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur récupération client", error: error.message });
  }
};

export const createClient = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { firstName, lastName, phone, address, city, postalCode, isPmr, observations } = req.body;
    if (!firstName || !lastName || !phone || !address || !city || !postalCode) {
      return res.status(400).json({ message: "Données requises manquantes" });
    }

    const client = await prisma.client.create({
      data: {
        firstName,
        lastName,
        phone,
        address,
        city,
        postalCode,
        isPmr: !!isPmr,
        observations
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user?.userId,
        action: "CREATION_CLIENT",
        details: `Création du client: ${lastName} ${firstName} (${isPmr ? "PMR" : "Standard"})`
      }
    });

    return res.status(201).json(client);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur création client", error: error.message });
  }
};

export const updateClient = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, address, city, postalCode, isPmr, observations } = req.body;

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Client introuvable" });
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        firstName,
        lastName,
        phone,
        address,
        city,
        postalCode,
        isPmr: !!isPmr,
        observations
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user?.userId,
        action: "MODIFICATION_CLIENT",
        details: `Modification du client: ${lastName} ${firstName}`
      }
    });

    return res.json(client);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur modification client", error: error.message });
  }
};

export const deleteClient = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Client introuvable" });
    }

    await prisma.client.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: req.user?.userId,
        action: "SUPPRESSION_CLIENT",
        details: `Suppression du client: ${existing.lastName} ${existing.firstName}`
      }
    });

    return res.json({ message: "Client supprimé avec succès" });
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur suppression client (Peut être lié à de l'historique actif)", error: error.message });
  }
};

export const getClientHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const rides = await prisma.ride.findMany({
      where: { clientId: id },
      include: {
        chauffeur: {
          select: { firstName: true, lastName: true }
        },
        vehicle: {
          select: { brand: true, model: true, registrationNumber: true }
        }
      },
      orderBy: { date: "desc" }
    });
    return res.json(rides);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur historique client", error: error.message });
  }
};
