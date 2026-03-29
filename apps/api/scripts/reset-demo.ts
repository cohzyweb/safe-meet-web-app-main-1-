import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.pushSubscription.deleteMany(),
    prisma.qrNonce.deleteMany(),
    prisma.session.deleteMany(),
    prisma.pact.deleteMany(),
    prisma.profile.deleteMany(),
  ]);

  console.log("Demo data reset completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
