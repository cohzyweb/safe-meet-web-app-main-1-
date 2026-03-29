-- AlterTable: add TOTP fields to Profile
ALTER TABLE "Profile" ADD COLUMN "totpSecret" TEXT;
ALTER TABLE "Profile" ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false;
