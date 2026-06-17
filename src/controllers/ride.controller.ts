// backend/src/controllers/ride.controller.ts
import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { prisma } from "../services/db";

// Helper to preseed default rides/trips if empty
async function ensureDefaultRides() {
  const count = await prisma.ride.count();
  if (count === 0) {
    const clients = await prisma.client.findMany();
    const chauffeurs = await prisma.user.findMany({ where: { role: "CHAUFFEUR" } });
    const vehicles = await prisma.vehicle.findMany();

    if (clients.length > 0 && chauffeurs.length > 0 && vehicles.length > 0) {
      await prisma.ride.createMany({
        data: [
          {
            rideNumber: "TR-1001",
            clientId: clients[0].id,
            date: "2026-06-15",
            time: "08:30",
            departureAddress: "12 Rue de la Paix, Paris",
            arrivalAddress: "Clinique de l'Alma, Paris",
            chauffeurId: chauffeurs[0].id,
            vehicleId: vehicles[0].id,
            isPmr: true,
            notes: "Patient en fauteuil roulant. Aide requise pour l'installation.",
            status: "IN_PROGRESS"
          },
          {
            rideNumber: "TR-1002",
            clientId: clients[0].id,
            date: "2026-06-15",
            time: "11:30",
            departureAddress: "Clinique de l'Alma, Paris",
            arrivalAddress: "12 Rue de la Paix, Paris",
            chauffeurId: chauffeurs[0].id,
            vehicleId: vehicles[0].id,
            isPmr: true,
            notes: "Aller-retour. Attendre consignes de sortie.",
            status: "PLANNED"
          },
          {
            rideNumber: "TR-1003",
            clientId: clients[0].id,
            date: "2026-06-14",
            time: "14:00",
            departureAddress: "12 Rue de la Paix, Paris",
            arrivalAddress: "Cabinet Dentaire, Neuilly-sur-Seine",
            chauffeurId: chauffeurs[1].id,
            vehicleId: vehicles[1].id,
            isPmr: false,
            notes: "Rendez-vous de routine.",
            status: "COMPLETED",
            realMileage: 18.5
          }
        ]
      });
      console.log("Database default rides seeded.");
    }
  }
}

// Function to generate rides from a recurring rule
export function generateRecurringRides(recurring: any) {
  const ridesToCreate = [];
  const start = new Date(recurring.startRideDate);
  const end = new Date(recurring.untilDate);
  const frequency = recurring.frequency; // DAILY, WEEKLY, MONTHLY

  let current = new Date(start);
  // Add first occurrence
  current.setDate(current.getDate() + 1); // increment past starting

  let seq = 1;
  while (current <= end) {
    const formattedDate = current.toISOString().split("T")[0];
    
    ridesToCreate.push({
      rideNumber: `TR-REC-${recurring.id.substring(0, 4).toUpperCase()}-${seq++}`,
      clientId: recurring.clientId,
      date: formattedDate,
      time: recurring.startTime,
      departureAddress: recurring.departureAddress,
      arrivalAddress: recurring.arrivalAddress,
      chauffeurId: recurring.chauffeurId,
      vehicleId: recurring.vehicleId,
      isPmr: recurring.isPmr,
      notes: `${recurring.notes || ""} (Récurrence ${recurring.frequency})`,
      status: "PLANNED",
      recurringReservationId: recurring.id
    });

    if (frequency === "DAILY") {
      current.setDate(current.getDate() + 1);
    } else if (frequency === "WEEKLY") {
      current.setDate(current.getDate() + 7);
    } else if (frequency === "MONTHLY") {
      current.setMonth(current.getMonth() + 1);
    } else {
      break;
    }
    
    // Safety break
    if (ridesToCreate.length > 100) break;
  }
  return ridesToCreate;
}

export const getRides = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const clientsCount = await prisma.client.count();
    if (clientsCount === 0) {
      // Seed a client so default seed runs nicely
      await prisma.client.create({
        data: {
          firstName: "Jean-Pierre",
          lastName: "Dubois",
          phone: "0612345678",
          address: "12 Rue de la Paix",
          city: "Paris",
          postalCode: "75002",
          isPmr: true,
          observations: "Nécessite assistance au bras gauche."
        }
      });
    }

    await ensureDefaultRides();

    const rides = await prisma.ride.findMany({
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true, phone: true, isPmr: true }
        },
        chauffeur: {
          select: { id: true, firstName: true, lastName: true, phone: true }
        },
        vehicle: {
          select: { id: true, brand: true, model: true, registrationNumber: true, type: true }
        }
      },
      orderBy: [
        { date: "desc" },
        { time: "desc" }
      ]
    });
    return res.json(rides);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur liste trajets", error: error.message });
  }
};

export const createRide = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      clientId, 
      date, 
      time, 
      departureAddress, 
      arrivalAddress, 
      chauffeurId, 
      vehicleId, 
      isPmr, 
      notes, 
      status,
      isRoundTrip // client request Aller-Retour
    } = req.body;

    if (!clientId || !date || !time || !departureAddress || !arrivalAddress) {
      return res.status(400).json({ message: "Données requises manquantes" });
    }

    const rideNumber = "TR-" + Math.floor(100000 + Math.random() * 900000).toString();

    // Create primary ride
    const ride = await prisma.ride.create({
      data: {
        rideNumber,
        clientId,
        date,
        time,
        departureAddress,
        arrivalAddress,
        chauffeurId: chauffeurId || null,
        vehicleId: vehicleId || null,
        isPmr: !!isPmr,
        notes,
        status: status || "PLANNED"
      },
      include: {
        client: true,
        chauffeur: true,
        vehicle: true
      }
    });

    let returnRide = null;
    if (isRoundTrip) {
      // Create inverted coordinates ride for return
      const returnRideNumber = rideNumber + "-R";
      // Return is usually 3 hours later or standard placeholder
      const [h, m] = time.split(":").map(Number);
      const returnHour = String((h + 3) % 24).padStart(2, "0");
      const returnTime = `${returnHour}:${String(m).padStart(2, "0")}`;

      returnRide = await prisma.ride.create({
        data: {
          rideNumber: returnRideNumber,
          clientId,
          date,
          time: returnTime,
          departureAddress: arrivalAddress, // Inverted
          arrivalAddress: departureAddress, // Inverted
          chauffeurId: chauffeurId || null,
          vehicleId: vehicleId || null,
          isPmr: !!isPmr,
          notes: "Retour de: " + rideNumber,
          status: "PLANNED"
        }
      });
    }

    // Push notification to Chauffeur if assigned
    if (chauffeurId) {
      await prisma.notification.create({
        data: {
          recipientId: chauffeurId,
          title: "Nouveau trajet affecté ! 🚗",
          message: `Vous avez été affecté au trajet n°${rideNumber} le ${date} à ${time} pour ${ride.client.lastName}.`,
          type: "RIDE_ASSIGNED"
        }
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user?.userId,
        action: "CREATION_TRAJET",
        details: `Création du trajet n°${rideNumber} (${isRoundTrip ? "Aller-Retour" : "Aller Simple"})`
      }
    });

    return res.status(201).json({ ride, returnRide });
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur création trajet", error: error.message });
  }
};

export const updateRide = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      clientId, 
      date, 
      time, 
      departureAddress, 
      arrivalAddress, 
      chauffeurId, 
      vehicleId, 
      isPmr, 
      notes, 
      status,
      realMileage 
    } = req.body;

    const existing = await prisma.ride.findUnique({
      where: { id },
      include: { client: true }
    });

    if (!existing) {
      return res.status(404).json({ message: "Trajet inexistant" });
    }

    // Save previous state for historic audit
    const originalChauffeurId = existing.chauffeurId;
    const originalStatus = existing.status;

    const ride = await prisma.ride.update({
      where: { id },
      data: {
        clientId,
        date,
        time,
        departureAddress,
        arrivalAddress,
        chauffeurId: chauffeurId || null,
        vehicleId: vehicleId || null,
        isPmr: !!isPmr,
        notes,
        status,
        realMileage: realMileage !== undefined ? parseFloat(realMileage) : existing.realMileage
      },
      include: { client: true, chauffeur: true, vehicle: true }
    });

    // Notify Chauffeur if assigned / reassigned / changed
    if (chauffeurId && chauffeurId !== originalChauffeurId) {
      await prisma.notification.create({
        data: {
          recipientId: chauffeurId,
          title: "Nouveau trajet affecté ! 🚗",
          message: `Vous avez été affecté au trajet n°${existing.rideNumber} le ${date} à ${time}.`,
          type: "RIDE_ASSIGNED"
        }
      });
    }

    if (status !== originalStatus) {
      // If cancelled, log/notify
      if (status === "CANCELLED" && originalChauffeurId) {
        await prisma.notification.create({
          data: {
            recipientId: originalChauffeurId,
            title: "Trajet annulé ❌",
            message: `Le trajet n°${existing.rideNumber} du ${existing.date} a été annulé par le bureau.`,
            type: "RIDE_CANCELLED"
          }
        });
      }
    }

    // If completed and chauffeur recorded mileage, update vehicle overall mileage
    if (status === "COMPLETED" && realMileage && vehicleId) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          mileage: {
            increment: parseFloat(realMileage)
          }
        }
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user?.userId,
        action: "MODIFICATION_TRAJET",
        details: `Modification du trajet n°${existing.rideNumber} (Changement de statut: ${originalStatus} -> ${status})`
      }
    });

    return res.json(ride);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur modification trajet", error: error.message });
  }
};

export const duplicateRide = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.ride.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ message: "Trajet inexistant" });
    }

    const rideNumber = "TR-" + Math.floor(100000 + Math.random() * 900000).toString();
    const duplicated = await prisma.ride.create({
      data: {
        rideNumber,
        clientId: existing.clientId,
        date: existing.date, // Same date, user can edit
        time: existing.time,
        departureAddress: existing.departureAddress,
        arrivalAddress: existing.arrivalAddress,
        chauffeurId: existing.chauffeurId,
        vehicleId: existing.vehicleId,
        isPmr: existing.isPmr,
        notes: `Copié de ${existing.rideNumber}. ${existing.notes || ""}`,
        status: "PLANNED"
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user?.userId,
        action: "DUPLICATION_TRAJET",
        details: `Duplication du trajet n°${existing.rideNumber} vers n°${rideNumber}`
      }
    });

    return res.status(201).json(duplicated);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur duplication", error: error.message });
  }
};

export const deleteRide = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.ride.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Trajet inexistant" });

    await prisma.ride.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: req.user?.userId,
        action: "SUPPRESSION_TRAJET",
        details: `Suppression définitive du trajet n°${existing.rideNumber}`
      }
    });

    return res.json({ message: "Trajet supprimé avec succès" });
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur suppression", error: error.message });
  }
};

// =================== RECURRING RESERVATIONS ===================

export const getRecurringReservations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const recurring = await prisma.recurringReservation.findMany({
      include: {
        client: { select: { firstName: true, lastName: true, phone: true } },
        chauffeur: { select: { firstName: true, lastName: true } },
        vehicle: { select: { brand: true, model: true, registrationNumber: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    return res.json(recurring);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur réservations régulières", error: error.message });
  }
};

export const createRecurringReservation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      clientId, 
      startRideDate, 
      startTime, 
      departureAddress, 
      arrivalAddress, 
      chauffeurId, 
      vehicleId, 
      isPmr, 
      notes, 
      frequency, 
      untilDate 
    } = req.body;

    if (!clientId || !startRideDate || !startTime || !departureAddress || !arrivalAddress || !frequency || !untilDate) {
      return res.status(400).json({ message: "Données de récurrence manquantes" });
    }

    const recurring = await prisma.recurringReservation.create({
      data: {
        clientId,
        startRideDate,
        startTime,
        departureAddress,
        arrivalAddress,
        chauffeurId: chauffeurId || null,
        vehicleId: vehicleId || null,
        isPmr: !!isPmr,
        notes,
        frequency,
        untilDate,
        isActive: true
      }
    });

    // Auto-generate matching rides
    const ridesToCreate = generateRecurringRides(recurring);
    if (ridesToCreate.length > 0) {
      await prisma.ride.createMany({
        data: ridesToCreate
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user?.userId,
        action: "CREATION_RECURRENCE_PLANIFIEE",
        details: `Création récurrence ${frequency} pour client ${clientId} générant ${ridesToCreate.length} trajet(s) futur(s).`
      }
    });

    return res.status(201).json({ recurring, generatedCount: ridesToCreate.length });
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur création récurrence", error: error.message });
  }
};

export const deleteRecurringReservation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.recurringReservation.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Récurrence introuvable" });

    // Delete future planned rides generated by this recurrence
    const deletedRides = await prisma.ride.deleteMany({
      where: {
        recurringReservationId: id,
        status: "PLANNED" // Only delete future uncompleted/unstarted rides
      }
    });

    await prisma.recurringReservation.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: req.user?.userId,
        action: "SUPPRESSION_RECURRENCE",
        details: `Suppression récurrence ID: ${id}. ${deletedRides.count} trajets futurs supprimés.`
      }
    });

    return res.json({ message: "Récurrence supprimée ainsi que ses futurs trajets planifiés." });
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur suppression", error: error.message });
  }
};
