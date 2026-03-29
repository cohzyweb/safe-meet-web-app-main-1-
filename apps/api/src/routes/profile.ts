// ============================================================
// apps/api/src/routes/profile.ts
// ============================================================

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../plugins/auth.js";
import { normalizeWalletAddress } from "../lib/wallet.js";
import {
  ProfileSchema,
  UpdateProfileBodySchema,
} from "@safe-meet/shared";
import type { Profile, UpdateProfileBody } from "@safe-meet/shared";
import type { Profile as PrismaProfile } from "@prisma/client";

// ------------------------------------------------------------
// Local param schema
// ------------------------------------------------------------

const WalletParamSchema = z.object({ wallet: z.string() });
type WalletParam = z.infer<typeof WalletParamSchema>;

// ------------------------------------------------------------
// Mapper
// ------------------------------------------------------------

function mapProfile(row: PrismaProfile): Profile {
  return {
    wallet: row.wallet,
    displayName: row.displayName ?? undefined,
    avatarUrl: row.avatarUrl ?? undefined,
    email: row.email ?? undefined,
    totalPacts: row.totalPacts,
    completedPacts: row.completedPacts,
    disputedPacts: row.disputedPacts,
    successRate: row.successRate,
    trustScore: row.trustScore ?? undefined,
    joinedAt: row.joinedAt.toISOString(),
    totpEnabled: row.totpEnabled,
  };
}

// ------------------------------------------------------------
// Plugin
// ------------------------------------------------------------

export default async function profileRoutes(fastify: FastifyInstance) {
  // ----------------------------------------------------------
  // GET /api/profile/:wallet
  // Creates profile on-the-fly if not found (upsert pattern).
  // ----------------------------------------------------------
  fastify.get<{ Params: WalletParam }>(
    "/:wallet",
    {
      schema: {
        params: WalletParamSchema,
        response: { 200: ProfileSchema },
      },
    },
    async (request, reply) => {
      const { wallet } = request.params;
      const normalizedWallet = normalizeWalletAddress(wallet);

      // Aggregate pact stats for this wallet.
      const [totalPacts, completedPacts, disputedPacts] = await Promise.all([
        prisma.pact.count({
          where: {
            OR: [{ creatorWallet: normalizedWallet }, { counterpartyWallet: normalizedWallet }],
          },
        }),
        prisma.pact.count({
          where: {
            OR: [{ creatorWallet: normalizedWallet }, { counterpartyWallet: normalizedWallet }],
            status: "COMPLETE",
          },
        }),
        prisma.pact.count({
          where: {
            OR: [{ creatorWallet: normalizedWallet }, { counterpartyWallet: normalizedWallet }],
            status: "DISPUTED",
          },
        }),
      ]);

      const successRate =
        totalPacts > 0
          ? parseFloat(((completedPacts / totalPacts) * 100).toFixed(2))
          : 0;

      // Upsert: create profile if it doesn't exist yet, then update stats.
      const row = await prisma.profile.upsert({
        where: { wallet: normalizedWallet },
        create: {
          wallet: normalizedWallet,
          totalPacts,
          completedPacts,
          disputedPacts,
          successRate,
        },
        update: {
          totalPacts,
          completedPacts,
          disputedPacts,
          successRate,
        },
      });

      return reply.send(mapProfile(row));
    },
  );

  // ----------------------------------------------------------
  // PATCH /api/profile/:wallet
  // Requires authentication - can only update own profile
  // ----------------------------------------------------------
  fastify.patch<{ Params: WalletParam; Body: UpdateProfileBody }>(
    "/:wallet",
    {
      preHandler: requireAuth,
      schema: {
        params: WalletParamSchema,
        body: UpdateProfileBodySchema,
        response: { 200: ProfileSchema },
      },
    },
    async (request, reply) => {
      const { wallet } = request.params;
      const normalizedWallet = normalizeWalletAddress(wallet);
      const authenticatedWallet = request.walletAddress;

      if (authenticatedWallet === null) {
        return reply.unauthorized("A valid JWT is required.");
      }

      // Users can only update their own profile
      if (normalizedWallet !== authenticatedWallet) {
        return reply.forbidden("You can only update your own profile.");
      }

      // Ensure profile exists before updating.
      const existing = await prisma.profile.findUnique({ where: { wallet: normalizedWallet } });
      if (!existing) {
        return reply.notFound(`Profile for wallet ${normalizedWallet} not found.`);
      }

      const { displayName, email, avatarUrl } = request.body;

      const row = await prisma.profile.update({
        where: { wallet: normalizedWallet },
        data: {
          ...(displayName !== undefined ? { displayName } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        },
      });

      return reply.send(mapProfile(row));
    },
  );
}
