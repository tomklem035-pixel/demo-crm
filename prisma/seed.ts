import { PrismaClient } from "@prisma/client";
import { runSeed } from "../src/lib/seed";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");
  const counts = await runSeed(prisma);
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
