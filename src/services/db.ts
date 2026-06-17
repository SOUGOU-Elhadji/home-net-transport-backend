// backend/src/services/db.ts
import { PrismaClient } from "@prisma/client";

// Guard client initialization to avoid multiple instances in dev hot-reload
let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  // Save prisma client on global object in development
  const anyGlobal = global as any;
  if (!anyGlobal.prisma) {
    anyGlobal.prisma = new PrismaClient();
  }
  prisma = anyGlobal.prisma;
}

export { prisma };
