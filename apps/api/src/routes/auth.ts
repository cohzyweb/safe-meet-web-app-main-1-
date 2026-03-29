// ============================================================
// apps/api/src/routes/auth.ts
//
// SIWE (Sign-In with Ethereum) authentication flow.
// Generates JWT tokens after verifying Ethereum signatures.
// ============================================================

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "crypto";
import { recoverMessageAddress } from "viem";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../plugins/auth.js";
import { redis } from "../lib/redis.js";
import { normalizeWalletAddress } from "../lib/wallet.js";

// ------------------------------------------------------------
// Schemas
// ------------------------------------------------------------

const GetNonceResponseSchema = z.object({
  nonce: z.string(),
  expiresAt: z.string().datetime(),
});

const VerifyBodySchema = z.object({
  message: z.string(), // SIWE message
  signature: z.string(), // Ethereum signature
});

const VerifyResponseSchema = z.object({
  token: z.string(),
  wallet: z.string(),
  expiresAt: z.string().datetime(),
});

const RefreshResponseSchema = VerifyResponseSchema;

const TOKEN_TTL_SECONDS = 24 * 60 * 60;
const NONCE_TTL_SECONDS = 5 * 60;

// ------------------------------------------------------------
// SIWE Message Parser (simplified)
// ------------------------------------------------------------

interface ParsedSiweMessage {
  address: string;
  nonce: string;
  chainId: number;
}

function parseSiweMessage(message: string): ParsedSiweMessage | null {
  // Simple parser for SIWE format:
  // "domain.com wants you to sign in with your Ethereum account:\n0x...\n\nSign in\n\nNonce: xxx\nChain ID: 1"
  const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
  const nonceMatch = message.match(/Nonce: ([a-zA-Z0-9]+)/);
  const chainIdMatch = message.match(/Chain ID: (\d+)/);

  if (!addressMatch || !nonceMatch) return null;

  const nonce = nonceMatch[1];
  if (!nonce) return null;

  return {
    address: addressMatch[0],
    nonce,
    chainId: chainIdMatch?.[1] ? parseInt(chainIdMatch[1], 10) : 1,
  };
}

// ------------------------------------------------------------
// Signature Verification (placeholder for real implementation)
// ------------------------------------------------------------

async function verifySignature(
  message: string,
  signature: string,
  address: string
): Promise<boolean> {
  try {
    const recovered = await recoverMessageAddress({
      message,
      signature: signature as `0x${string}`,
    });
    return recovered.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}

// ------------------------------------------------------------
// Plugin
// ------------------------------------------------------------

export default async function authRoutes(fastify: FastifyInstance) {
  // ----------------------------------------------------------
  // GET /api/auth/nonce
  // Generate a nonce for SIWE signing
  // ----------------------------------------------------------
  fastify.get(
    "/nonce",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
      schema: {
        response: { 200: GetNonceResponseSchema },
      },
    },
    async (request, reply) => {
      const nonce = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      await redis.set(`auth:nonce:${nonce}`, "1", "EX", NONCE_TTL_SECONDS);

      return reply.send({
        nonce,
        expiresAt: expiresAt.toISOString(),
      });
    }
  );

  // ----------------------------------------------------------
  // POST /api/auth/verify
  // Verify signature and issue JWT
  // ----------------------------------------------------------
  fastify.post<{ Body: { message: string; signature: string } }>(
    "/verify",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
      schema: {
        body: VerifyBodySchema,
        response: { 200: VerifyResponseSchema },
      },
    },
    async (request, reply) => {
      const { message, signature } = request.body;

      const parsed = parseSiweMessage(message);
      if (!parsed) {
        return reply.badRequest("Invalid SIWE message format.");
      }

      const normalizedAddress = normalizeWalletAddress(parsed.address);

      // Verify the nonce exists and hasn't expired
      const nonceExists = await redis.del(`auth:nonce:${parsed.nonce}`);
      if (nonceExists === 0) {
        return reply.badRequest("Invalid or expired nonce.");
      }

      // Verify signature
      const isValid = await verifySignature(message, signature, normalizedAddress);
      if (!isValid) {
        return reply.unauthorized("Invalid signature.");
      }

      // Create or update session
      const session = await prisma.session.create({
        data: {
          wallet: normalizedAddress,
          chainId: parsed.chainId,
          chainName: getChainName(parsed.chainId),
          deviceName: request.headers["user-agent"] || "Unknown",
        },
      });

      // Generate JWT
      const token = await reply.jwtSign({
        wallet: normalizedAddress,
        sessionId: session.id,
      }, { expiresIn: TOKEN_TTL_SECONDS });

      // Calculate expiration
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update session with expiration
      await prisma.session.update({
        where: { id: session.id },
        data: { expiresAt },
      });

      return reply.send({
        token,
        wallet: normalizedAddress,
        expiresAt: expiresAt.toISOString(),
      });
    }
  );

  // ----------------------------------------------------------
  // POST /api/auth/logout
  // Revoke current session
  // ----------------------------------------------------------
  fastify.post(
    "/logout",
    {
      preHandler: requireAuth,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const sessionId = request.sessionId;
      const tokenExp = request.jwtExp;

      if (!sessionId || !tokenExp) {
        return reply.badRequest("Invalid session context.");
      }

      const ttl = Math.max(1, tokenExp - Math.floor(Date.now() / 1000));
      await redis.set(`auth:revoked:${sessionId}`, "1", "EX", ttl);

      return reply.send({ success: true });
    }
  );

  fastify.post(
    "/refresh",
    {
      preHandler: requireAuth,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
      schema: {
        response: { 200: RefreshResponseSchema },
      },
    },
    async (request, reply) => {
      const wallet = request.walletAddress;
      const sessionId = request.sessionId;

      if (!wallet || !sessionId) {
        return reply.unauthorized("A valid JWT is required.");
      }

      const isRevoked = await redis.exists(`auth:revoked:${sessionId}`);
      if (isRevoked === 1) {
        return reply.unauthorized("Session has been revoked.");
      }

      const token = await reply.jwtSign(
        { wallet, sessionId },
        { expiresIn: TOKEN_TTL_SECONDS },
      );

      const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);

      await prisma.session.update({
        where: { id: sessionId },
        data: { expiresAt },
      });

      return reply.send({
        token,
        wallet,
        expiresAt: expiresAt.toISOString(),
      });
    },
  );
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function getChainName(chainId: number): string {
  const chains: Record<number, string> = {
    1: "Ethereum Mainnet",
    5: "Goerli Testnet",
    11155111: "Sepolia Testnet",
    137: "Polygon",
    8453: "Base Mainnet",
    84532: "Base Sepolia",
  };
  return chains[chainId] || `Chain ${chainId}`;
}
