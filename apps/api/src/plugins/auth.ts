// ============================================================
// apps/api/src/plugins/auth.ts
//
// JWT-based wallet auth plugin.
// Decorates request with `walletAddress` extracted from the JWT.
// Exports `requireAuth` preHandler hook.
// ============================================================

import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  FastifyPluginAsync,
  preHandlerHookHandler,
} from "fastify";
import fp from "fastify-plugin";
import { redis } from "../lib/redis.js";
import { normalizeWalletAddress } from "../lib/wallet.js";

// Augment the Fastify request interface so TypeScript knows about the decoration.
declare module "fastify" {
  interface FastifyRequest {
    walletAddress: string | null;
    sessionId: string | null;
    jwtExp: number | null;
  }
}

export interface JwtPayload {
  wallet: string;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

// The plugin is registered with `fastify-plugin` semantics via the
// `{ skip-override: true }` symbol so decorations leak to the parent scope.
// In Fastify v5 we achieve this by registering at the root scope in index.ts
// (before route sub-scopes) and using decorateRequest here.
const authPlugin: FastifyPluginAsync = fp(async (fastify: FastifyInstance) => {
  // Decorate every request with a nullable walletAddress.
  fastify.decorateRequest("walletAddress", null);
  fastify.decorateRequest("sessionId", null);
  fastify.decorateRequest("jwtExp", null);

  // Before each request, try to extract + verify the bearer JWT.
  fastify.addHook("onRequest", async (request: FastifyRequest) => {
    const auth = request.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return;

    try {
      const payload = await request.jwtVerify<JwtPayload>();
      if (!payload.wallet || !payload.sessionId || !payload.exp) {
        return;
      }

      const revoked = await redis.exists(`auth:revoked:${payload.sessionId}`);
      if (revoked === 1) {
        return;
      }

      request.walletAddress = normalizeWalletAddress(payload.wallet);
      request.sessionId = payload.sessionId;
      request.jwtExp = payload.exp;
    } catch {
      // Token invalid / expired — leave walletAddress null.
      // Routes that require auth will reject via requireAuth.
    }
  });
});

export default authPlugin;

// ------------------------------------------------------------
// requireAuth — attach as a preHandler on protected routes
// ------------------------------------------------------------

export const requireAuth: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  if (!request.walletAddress) {
    return reply.unauthorized("A valid JWT is required.");
  }
};
