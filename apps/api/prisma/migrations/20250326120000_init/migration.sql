-- CreateEnum
CREATE TYPE "PactType" AS ENUM ('TRADE', 'GOAL');

-- CreateEnum
CREATE TYPE "PactStatus" AS ENUM ('PENDING', 'ACTIVE', 'PROOF_SUBMITTED', 'COMPLETE', 'DISPUTED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Pact" (
    "id" TEXT NOT NULL,
    "type" "PactType" NOT NULL,
    "status" "PactStatus" NOT NULL DEFAULT 'PENDING',
    "creatorWallet" TEXT NOT NULL,
    "counterpartyWallet" TEXT NOT NULL,
    "itemName" VARCHAR(120),
    "itemDescription" VARCHAR(1000),
    "location" VARCHAR(200),
    "scheduledAt" TIMESTAMP(3),
    "assetSymbol" TEXT NOT NULL,
    "assetAmount" DOUBLE PRECISION NOT NULL,
    "goalDescription" VARCHAR(1000),
    "goalDeadline" TIMESTAMP(3),
    "proofUrl" TEXT,
    "proofSubmittedAt" TIMESTAMP(3),
    "txHash" TEXT,
    "contractAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "wallet" TEXT NOT NULL,
    "displayName" VARCHAR(80),
    "avatarUrl" TEXT,
    "email" TEXT,
    "totalPacts" INTEGER NOT NULL DEFAULT 0,
    "completedPacts" INTEGER NOT NULL DEFAULT 0,
    "disputedPacts" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trustScore" INTEGER,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("wallet")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "chainId" INTEGER NOT NULL,
    "chainName" TEXT NOT NULL,
    "deviceName" TEXT,
    "location" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QrNonce" (
    "id" TEXT NOT NULL,
    "pactId" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QrNonce_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pact_creatorWallet_idx" ON "Pact"("creatorWallet");

-- CreateIndex
CREATE INDEX "Pact_counterpartyWallet_idx" ON "Pact"("counterpartyWallet");

-- CreateIndex
CREATE INDEX "Pact_status_idx" ON "Pact"("status");

-- CreateIndex
CREATE INDEX "Pact_type_idx" ON "Pact"("type");

-- CreateIndex
CREATE INDEX "Session_wallet_idx" ON "Session"("wallet");

-- CreateIndex
CREATE INDEX "QrNonce_nonce_idx" ON "QrNonce"("nonce");

-- CreateIndex
CREATE INDEX "QrNonce_pactId_idx" ON "QrNonce"("pactId");

-- CreateIndex
CREATE UNIQUE INDEX "QrNonce_nonce_key" ON "QrNonce"("nonce");

-- AddForeignKey
ALTER TABLE "QrNonce" ADD CONSTRAINT "QrNonce_pactId_fkey" FOREIGN KEY ("pactId") REFERENCES "Pact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
