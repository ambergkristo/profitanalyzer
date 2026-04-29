import { PrismaClient } from "@prisma/client";

import { getAppMode, getAppVersion } from "../src/config.js";
import { seedDatabaseDatasetsIfEmpty } from "../src/store/databasePersistence.js";

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required for db:seed.");
  }

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    await seedDatabaseDatasetsIfEmpty(prisma, {
      appMode: getAppMode(process.env),
      exportedFromAppVersion: getAppVersion(process.env)
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
