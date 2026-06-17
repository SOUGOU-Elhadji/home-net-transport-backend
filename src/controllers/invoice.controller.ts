// backend/src/controllers/invoice.controller.ts
import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { prisma } from "../services/db";

// Preseed default invoices if empty
async function ensureDefaultInvoices() {
  const count = await prisma.invoice.count();
  if (count === 0) {
    const clients = await prisma.client.findMany();
    if (clients.length > 0) {
      await prisma.invoice.createMany({
        data: [
          {
            invoiceNumber: "FA-2026-0001",
            clientId: clients[0].id,
            date: "2026-06-01",
            amount: 320.00,
            status: "PAID",
            month: "2026-05"
          },
          {
            invoiceNumber: "FA-2026-0002",
            clientId: clients[0].id,
            date: "2026-06-12",
            amount: 75.00,
            status: "UNPAID",
          }
        ]
      });
      console.log("Database default invoices seeded.");
    }
  }
}

export const getInvoices = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureDefaultInvoices();
    const invoices = await prisma.invoice.findMany({
      include: {
        client: { select: { firstName: true, lastName: true, email: true, phone: true } },
        ride: true
      },
      orderBy: { date: "desc" }
    });
    return res.json(invoices);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur liste factures", error: error.message });
  }
};

export const createInvoice = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clientId, amount, status, rideId, month, date } = req.body;
    if (!clientId || amount === undefined) {
      return res.status(400).json({ message: "Données requises manquantes" });
    }

    const count = await prisma.invoice.count() + 1001;
    const currentYear = new Date().getFullYear();
    const invoiceNumber = `FA-${currentYear}-${count}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId,
        amount: parseFloat(amount),
        status: status || "UNPAID",
        rideId: rideId || null,
        month: month || null,
        date: date || new Date().toISOString().split("T")[0]
      },
      include: { client: true }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user?.userId,
        action: "CREATION_FACTURE",
        details: `Création de la facture n°${invoiceNumber} d'un montant de ${amount} €`
      }
    });

    return res.status(201).json(invoice);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur création facture", error: error.message });
  }
};

export const updateInvoiceStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ message: "Statut requis" });

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Facture introuvable" });

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user?.userId,
        action: "MODIFICATION_STATUT_FACTURE",
        details: `Statut de la facture n°${existing.invoiceNumber} mis à jour: ${status}`
      }
    });

    return res.json(invoice);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur modification statut", error: error.message });
  }
};

export const deleteInvoice = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Facture introuvable" });

    await prisma.invoice.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: req.user?.userId,
        action: "SUPPRESSION_FACTURE",
        details: `Suppression de la facture n°${existing.invoiceNumber}`
      }
    });

    return res.json({ message: "Facture supprimée" });
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur suppression", error: error.message });
  }
};
