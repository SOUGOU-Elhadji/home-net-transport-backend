import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {

  const existing = await prisma.user.findUnique({
    where: {
      email: "admin@homenet.com"
    }
  });

  if (!existing) {

    const hashedPassword = await bcrypt.hash("admin123", 10);

    await prisma.user.create({
      data: {
        firstName: "Elhadji",
        lastName: "Sougou",
        email: "admin@homenet.com",
        password: hashedPassword,
        role: "SUPER_ADMIN",
        status: "ACTIVE"
      }
    });

    console.log("SUPER_ADMIN créé");
  }

}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });