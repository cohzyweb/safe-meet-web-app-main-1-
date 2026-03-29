// ============================================================
// apps/api/src/routes/totp.ts
//
// TOTP-based 2FA routes.
// POST /setup   — generate a new secret and return the otpauth:// URL
// POST /confirm — verify a code and enable 2FA
// POST /disable — verify a code and disable 2FA
// ============================================================

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticator } from "otplib";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../plugins/auth.js";

const TokenBodySchema = z.object({
  token: z.string().min(6).max(6),
});

export default async function totpRoutes(fastify: FastifyInstance) {
  // ----------------------------------------------------------
  // POST /api/auth/2fa/setup
  // Generates a new TOTP secret, stores it (unenabled), returns
  // the otpauth:// URL for QR rendering on the frontend.
  // ----------------------------------------------------------
  fastify.post(
    "/setup",
    { preHandler: requireAuth },
    async (request, reply) => {
      const wallet = request.walletAddress;
      if (!wallet) return reply.unauthorized("A valid JWT is required.");

      const secret = authenticator.generateSecret();
      const otpauthUrl = authenticator.keyuri(wallet, "SafeMeet", secret);

      await prisma.profile.upsert({
        where: { wallet },
        update: { totpSecret: secret, totpEnabled: false },
        create: { wallet, totpSecret: secret, totpEnabled: false },
      });

      return reply.send({ otpauthUrl });
    },
  );

  // ----------------------------------------------------------
  // POST /api/auth/2fa/confirm
  // Verify TOTP code and enable 2FA on the profile.
  // ----------------------------------------------------------
  fastify.post<{ Body: { token: string } }>(
    "/confirm",
    {
      preHandler: requireAuth,
      schema: { body: TokenBodySchema },
    },
    async (request, reply) => {
      const wallet = request.walletAddress;
      if (!wallet) return reply.unauthorized("A valid JWT is required.");

      const profile = await prisma.profile.findUnique({ where: { wallet } });
      if (!profile?.totpSecret) {
        return reply.badRequest("2FA setup not started. Call /setup first.");
      }
      if (profile.totpEnabled) {
        return reply.badRequest("2FA is already enabled.");
      }

      const isValid = authenticator.verify({
        token: request.body.token,
        secret: profile.totpSecret,
      });
      if (!isValid) {
        return reply.unauthorized("Invalid authenticator code.");
      }

      await prisma.profile.update({
        where: { wallet },
        data: { totpEnabled: true },
      });

      return reply.send({ success: true });
    },
  );

  // ----------------------------------------------------------
  // POST /api/auth/2fa/disable
  // Verify TOTP code and disable 2FA, clearing the secret.
  // ----------------------------------------------------------
  fastify.post<{ Body: { token: string } }>(
    "/disable",
    {
      preHandler: requireAuth,
      schema: { body: TokenBodySchema },
    },
    async (request, reply) => {
      const wallet = request.walletAddress;
      if (!wallet) return reply.unauthorized("A valid JWT is required.");

      const profile = await prisma.profile.findUnique({ where: { wallet } });
      if (!profile?.totpEnabled || !profile.totpSecret) {
        return reply.badRequest("2FA is not enabled.");
      }

      const isValid = authenticator.verify({
        token: request.body.token,
        secret: profile.totpSecret,
      });
      if (!isValid) {
        return reply.unauthorized("Invalid authenticator code.");
      }

      await prisma.profile.update({
        where: { wallet },
        data: { totpEnabled: false, totpSecret: null },
      });

      return reply.send({ success: true });
    },
  );
}
