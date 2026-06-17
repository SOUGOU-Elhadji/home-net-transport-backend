// backend/src/controllers/report.controller.ts
import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { prisma } from "../services/db";

export const getDashboardStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const currentMonthStr = todayStr.substring(0, 7); // e.g., "2026-06"

    const totalClients = await prisma.client.count();
    const totalChauffeurs = await prisma.user.count({ where: { role: "CHAUFFEUR" } });
    const totalVehicles = await prisma.vehicle.count();

    const ridesToday = await prisma.ride.count({
      where: { date: todayStr }
    });

    const ridesMonth = await prisma.ride.count({
      where: {
        date: {
          startsWith: currentMonthStr
        }
      }
    });

    const pendingRides = await prisma.ride.count({
      where: { status: "PLANNED" }
    });

    const activeRides = await prisma.ride.count({
      where: { status: "IN_PROGRESS" }
    });

    const completedRides = await prisma.ride.count({
      where: { status: "COMPLETED" }
    });

    const cancelledRides = await prisma.ride.count({
      where: { status: "CANCELLED" }
    });

    // Chiffre d'affaires mensuel - Sum of PAID/UNPAID invoices generated this month
    const currentMonthInvoices = await prisma.invoice.findMany({
      where: {
        date: { startsWith: currentMonthStr }
      }
    });
    const monthlyRevenue = currentMonthInvoices.reduce((acc, current) => acc + current.amount, 0);

    // Evolution mensuelle des trajets (grouped by month for the last 6 months)
    const allRides = await prisma.ride.findMany({
      select: { date: true, status: true }
    });

    const monthsMap: { [key: string]: { total: number; completed: number; cancelled: number } } = {};
    allRides.forEach(r => {
      const m = r.date.substring(0, 7); // "YYYY-MM"
      if (!monthsMap[m]) {
        monthsMap[m] = { total: 0, completed: 0, cancelled: 0 };
      }
      monthsMap[m].total++;
      if (r.status === "COMPLETED") monthsMap[m].completed++;
      if (r.status === "CANCELLED") monthsMap[m].cancelled++;
    });

    const evolutionTrajetsData = Object.keys(monthsMap).sort().map(m => ({
      month: m,
      total: monthsMap[m].total,
      completed: monthsMap[m].completed,
      cancelled: monthsMap[m].cancelled
    })).slice(-6); // last 6 months

    // Evolution du chiffre d'affaires
    const allInvoices = await prisma.invoice.findMany({
      select: { date: true, amount: true }
    });

    const revMonthsMap: { [key: string]: number } = {};
    allInvoices.forEach(i => {
      const m = i.date.substring(0, 7);
      revMonthsMap[m] = (revMonthsMap[m] || 0) + i.amount;
    });

    const evolutionRevenueData = Object.keys(revMonthsMap).sort().map(m => ({
      month: m,
      revenue: revMonthsMap[m]
    })).slice(-6);

    // Utilisation des véhicules
    const vehicles = await prisma.vehicle.findMany({
      include: {
        _count: {
          select: { rides: true }
        }
      }
    });

    const utilisationVehiculesData = vehicles.map(v => ({
      name: `${v.brand} ${v.model}`,
      immatriculation: v.registrationNumber,
      ridesCount: v._count.rides,
      mileage: v.mileage
    }));

    // Chauffeurs les plus actifs
    const chauffeurs = await prisma.user.findMany({
      where: { role: "CHAUFFEUR" },
      include: {
        _count: {
          select: { assignedRides: true }
        }
      }
    });

    const topChauffeursData = chauffeurs.map(c => ({
      name: `${c.firstName} ${c.lastName}`,
      ridesCount: c._count.assignedRides
    })).sort((a, b) => b.ridesCount - a.ridesCount);

    return res.json({
      totalClients,
      totalChauffeurs,
      totalVehicles,
      ridesToday,
      ridesMonth,
      pendingRides,
      activeRides,
      completedRides,
      cancelledRides,
      monthlyRevenue,
      evolutionTrajets: evolutionTrajetsData.length > 0 ? evolutionTrajetsData : [{ month: currentMonthStr, total: ridesMonth, completed: completedRides, cancelled: cancelledRides }],
      evolutionRevenue: evolutionRevenueData.length > 0 ? evolutionRevenueData : [{ month: currentMonthStr, revenue: monthlyRevenue }],
      utilisationVehicules: utilisationVehiculesData,
      topChauffeurs: topChauffeursData
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur statistiques de bord", error: error.message });
  }
};

export const getSystemLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await prisma.activityLog.findMany({
      include: {
        user: { select: { firstName: true, lastName: true, role: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return res.json(logs);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur de chargement des journaux", error: error.message });
  }
};
