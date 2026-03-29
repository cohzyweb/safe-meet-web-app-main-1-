// ============================================================
// apps/api/src/routes/dashboard.ts
// ============================================================

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { DashboardStatsSchema } from "@safe-meet/shared";
import type { DashboardStats } from "@safe-meet/shared";
import { normalizeWalletAddress } from "../lib/wallet.js";

const DashboardQuerySchema = z.object({
  wallet: z.string().optional(),
});

type DashboardQuery = z.infer<typeof DashboardQuerySchema>;

export default async function dashboardRoutes(fastify: FastifyInstance) {
  // ----------------------------------------------------------
  // GET /api/dashboard/stats?wallet=
  // ----------------------------------------------------------
  fastify.get<{ Querystring: DashboardQuery }>(
    "/stats",
    {
      schema: {
        querystring: DashboardQuerySchema,
        response: { 200: DashboardStatsSchema },
      },
    },
    async (request, reply) => {
      const { wallet } = request.query;
      const normalizedWallet = wallet ? normalizeWalletAddress(wallet) : undefined;

      if (!normalizedWallet) {
        reply.header("Cache-Control", "public, max-age=20, stale-while-revalidate=60");
      } else {
        reply.header("Cache-Control", "private, no-store");
      }

      // Build a where clause scoped to the wallet when provided.
      const walletWhere = normalizedWallet
        ? {
            OR: [
              { creatorWallet: normalizedWallet },
              { counterpartyWallet: normalizedWallet },
            ],
          }
        : {};

      // Aggregate in a single round-trip.
      const [completedPacts, activePacts, proofSubmittedPacts, tvlResult] =
        await Promise.all([
          prisma.pact.count({
            where: { ...walletWhere, status: "COMPLETE" },
          }),
          prisma.pact.count({
            where: { ...walletWhere, status: "ACTIVE" },
          }),
          prisma.pact.count({
            where: { ...walletWhere, status: "PROOF_SUBMITTED" },
          }),
          // Sum of assetAmount for all ACTIVE pacts = TVL proxy.
          prisma.pact.aggregate({
            where: { ...walletWhere, status: "ACTIVE" },
            _sum: { assetAmount: true },
          }),
        ]);

      const tvl = tvlResult._sum.assetAmount ?? 0;

      const stats: DashboardStats = {
        totalValueLocked: tvl,
        totalValueLockedFormatted: `${tvl.toFixed(4)} ETH`,
        tvlChangePercent: 0,
        completedTrades: completedPacts,
        activeEscrows: activePacts,
        awaitingVerification: proofSubmittedPacts,
      };

      return reply.send(stats);
    },
  );
}
