// ============================================================
// apps/api/src/routes/sessions.ts
// ============================================================

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { SessionListSchema, SessionSchema } from "@safe-meet/shared";
import type { Session } from "@safe-meet/shared";
import type { Session as PrismaSession } from "@prisma/client";
import { requireAuth } from "../plugins/auth.js";

// ------------------------------------------------------------
// Local param schema
// ------------------------------------------------------------

const SessionIdParamSchema = z.object({ id: z.string().uuid() });
type SessionIdParam = z.infer<typeof SessionIdParamSchema>;

// ------------------------------------------------------------
// Mapper — explicit annotated return type, no type assertions
// ------------------------------------------------------------

function mapSession(row: PrismaSession): Session {
  return {
    id: row.id,
    wallet: row.wallet,
    connectedAt: row.connectedAt.toISOString(),
    // exactOptionalPropertyTypes: omit key when absent rather than writing
    // `expiresAt: undefined` which is forbidden under that flag.
    ...(row.expiresAt !== null
      ? { expiresAt: row.expiresAt.toISOString() }
      : {}),
    chainId: row.chainId,
    chainName: row.chainName,
    ...(row.deviceName !== null ? { deviceName: row.deviceName } : {}),
    ...(row.location !== null ? { location: row.location } : {}),
    isCurrent: row.isCurrent,
  };
}

// ------------------------------------------------------------
// Plugin
// ------------------------------------------------------------

export default async function sessionsRoutes(fastify: FastifyInstance) {
  // ----------------------------------------------------------
  // GET /api/sessions
  // Returns all sessions for the authenticated wallet.
  // ----------------------------------------------------------
  fastify.get(
    "/",
    {
      preHandler: requireAuth,
      schema: {
        response: { 200: SessionListSchema },
      },
    },
    async (request, reply) => {
      // requireAuth guarantees walletAddress is non-null, but we can't use !
      // (non-null assertion) under the strict rules. Guard explicitly instead.
      const wallet = request.walletAddress;
      if (wallet === null) {
        // requireAuth should have already rejected this; belt-and-suspenders.
        return reply.unauthorized("A valid JWT is required.");
      }

      const rows = await prisma.session.findMany({
        where: { wallet },
        orderBy: { connectedAt: "desc" },
      });

      return reply.send(rows.map(mapSession));
    },
  );

  // ----------------------------------------------------------
  // DELETE /api/sessions/:id
  // Revokes a specific session belonging to the authenticated wallet.
  // ----------------------------------------------------------
  fastify.delete<{ Params: SessionIdParam }>(
    "/:id",
    {
      preHandler: requireAuth,
      schema: {
        params: SessionIdParamSchema,
        response: {
          200: z.object({ success: z.literal(true) }),
        },
      },
    },
    async (request, reply) => {
      const wallet = request.walletAddress;
      if (wallet === null) {
        return reply.unauthorized("A valid JWT is required.");
      }

      const existing = await prisma.session.findUnique({
        where: { id: request.params.id },
      });

      if (!existing) {
        return reply.notFound(`Session ${request.params.id} not found.`);
      }

      if (existing.wallet !== wallet) {
        return reply.forbidden("You do not own this session.");
      }

      await prisma.session.delete({ where: { id: request.params.id } });

      return reply.send({ success: true as const });
    },
  );
}
