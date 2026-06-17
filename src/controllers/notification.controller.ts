// backend/src/controllers/notification.controller.ts
import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { prisma } from "../services/db";

export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Inconnu" });
    const notifications = await prisma.notification.findMany({
      where: { recipientId: req.user.userId },
      orderBy: { createdAt: "desc" },
      take: 20
    });
    return res.json(notifications);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur notifications", error: error.message });
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    return res.json(notification);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur marquage notification", error: error.message });
  }
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Inconnu" });
    await prisma.notification.updateMany({
      where: { recipientId: req.user.userId, isRead: false },
      data: { isRead: true }
    });
    return res.json({ message: "Toutes les notifications marquées lues." });
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur global marquage", error: error.message });
  }
};
