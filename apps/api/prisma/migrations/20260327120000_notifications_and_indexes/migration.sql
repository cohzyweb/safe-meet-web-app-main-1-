CREATE TABLE "Notification" (
  "id" TEXT PRIMARY KEY,
  "wallet" TEXT NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "body" VARCHAR(500) NOT NULL,
  "link" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Notification_wallet_createdAt_idx" ON "Notification"("wallet", "createdAt");

CREATE TABLE "PushSubscription" (
  "id" TEXT PRIMARY KEY,
  "wallet" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL UNIQUE,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "PushSubscription_wallet_idx" ON "PushSubscription"("wallet");

CREATE INDEX "Pact_creatorWallet_createdAt_id_idx" ON "Pact"("creatorWallet", "createdAt", "id");
CREATE INDEX "Pact_counterpartyWallet_createdAt_id_idx" ON "Pact"("counterpartyWallet", "createdAt", "id");
