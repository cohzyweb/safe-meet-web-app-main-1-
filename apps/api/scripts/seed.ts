import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const WALLET_A = "0x1111111111111111111111111111111111111111";
const WALLET_B = "0x2222222222222222222222222222222222222222";
const WALLET_C = "0x3333333333333333333333333333333333333333";

async function main() {
  await prisma.pact.createMany({
    data: [
      {
        type: "TRADE",
        status: "COMPLETE",
        creatorWallet: WALLET_A,
        counterpartyWallet: WALLET_B,
        itemName: "MacBook Pro 14",
        itemDescription: "Excellent condition",
        location: "Lagos, Ikeja",
        assetSymbol: "ETH",
        assetAmount: 0.2,
        txHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
      {
        type: "GOAL",
        status: "ACTIVE",
        creatorWallet: WALLET_B,
        counterpartyWallet: WALLET_C,
        goalDescription: "Complete project MVP and submit pitch deck",
        goalDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        assetSymbol: "ETH",
        assetAmount: 0.12,
        txHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        contractAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      },
      {
        type: "TRADE",
        status: "DISPUTED",
        creatorWallet: WALLET_C,
        counterpartyWallet: WALLET_A,
        itemName: "iPhone 15 Pro",
        itemDescription: "Buyer claims mismatch",
        location: "Abuja",
        assetSymbol: "ETH",
        assetAmount: 0.15,
        txHash: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        contractAddress: "0xcccccccccccccccccccccccccccccccccccccccc",
      },
    ],
  });

  await prisma.profile.upsert({ where: { wallet: WALLET_A }, create: { wallet: WALLET_A }, update: {} });
  await prisma.profile.upsert({ where: { wallet: WALLET_B }, create: { wallet: WALLET_B }, update: {} });
  await prisma.profile.upsert({ where: { wallet: WALLET_C }, create: { wallet: WALLET_C }, update: {} });

  console.log("Seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
