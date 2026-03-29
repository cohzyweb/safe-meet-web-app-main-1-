-- Normalize wallet addresses to lowercase across tables.

UPDATE "Pact"
SET
  "creatorWallet" = lower("creatorWallet"),
  "counterpartyWallet" = lower("counterpartyWallet");

UPDATE "Session"
SET "wallet" = lower("wallet");

INSERT INTO "Profile" (
  "wallet",
  "displayName",
  "avatarUrl",
  "email",
  "totalPacts",
  "completedPacts",
  "disputedPacts",
  "successRate",
  "trustScore",
  "joinedAt"
)
SELECT
  lower("wallet") AS "wallet",
  max("displayName") AS "displayName",
  max("avatarUrl") AS "avatarUrl",
  max("email") AS "email",
  sum("totalPacts") AS "totalPacts",
  sum("completedPacts") AS "completedPacts",
  sum("disputedPacts") AS "disputedPacts",
  max("successRate") AS "successRate",
  max("trustScore") AS "trustScore",
  min("joinedAt") AS "joinedAt"
FROM "Profile"
GROUP BY lower("wallet")
ON CONFLICT ("wallet") DO UPDATE SET
  "displayName" = EXCLUDED."displayName",
  "avatarUrl" = EXCLUDED."avatarUrl",
  "email" = EXCLUDED."email",
  "totalPacts" = EXCLUDED."totalPacts",
  "completedPacts" = EXCLUDED."completedPacts",
  "disputedPacts" = EXCLUDED."disputedPacts",
  "successRate" = EXCLUDED."successRate",
  "trustScore" = EXCLUDED."trustScore",
  "joinedAt" = EXCLUDED."joinedAt";

DELETE FROM "Profile"
WHERE "wallet" <> lower("wallet");
