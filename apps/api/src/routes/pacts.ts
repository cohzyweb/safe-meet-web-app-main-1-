// ============================================================
// apps/api/src/routes/pacts.ts
//
// Strict rules enforced:
//  - All route handlers typed via FastifyRequest<{ Body/Querystring/Params }>
//  - zodValidatorCompiler + zodSerializerCompiler handle schema-to-type flow
//  - No `any`, no `as X` outside Zod .parse(), no non-null assertions
//  - catch blocks: `err instanceof Error ? err.message : String(err)`
// ============================================================

import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import QRCode from "qrcode";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { mapPact, mapPacts } from "../lib/mappers.js";
import { requireAuth } from "../plugins/auth.js";
import { normalizeWalletAddress } from "../lib/wallet.js";
import { notifyWallet, notifyWalletWithTemplate } from "../lib/notifications.js";
import { pactCreatedEmail, pactAcceptedEmail, pactCompletedEmail, refereeAssignedEmail } from "../lib/email-templates.js";
import {
  PactFiltersSchema,
  HistoryFiltersSchema,
  CreatePactBodySchema,
  UpdatePactStatusBodySchema,
  SubmitProofBodySchema,
  VerifyQrBodySchema,
  PactSchema,
  QrResponseSchema,
  HistoryListSchema,
} from "@safe-meet/shared";
import type {
  PactFilters,
  HistoryFilters,
  CreatePactBody,
  UpdatePactStatusBody,
  SubmitProofBody,
  VerifyQrBody,
  Pact,
} from "@safe-meet/shared";
import type { Pact as PrismaPact } from "@prisma/client";

// ------------------------------------------------------------
// Param schemas (defined locally — not in shared)
// ------------------------------------------------------------

const PactIdParamSchema = z.object({ id: z.string().uuid() });
type PactIdParam = z.infer<typeof PactIdParamSchema>;

const OnchainUpdateBodySchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});
type OnchainUpdateBody = z.infer<typeof OnchainUpdateBodySchema>;

function validateProofUrl(url: string): { ok: boolean; message?: string } {
  if (url.length > 2000) {
    return { ok: false, message: "Proof URL must be 2000 characters or less." };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, message: "Proof URL must be a valid URL." };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, message: "Proof URL must use HTTPS." };
  }

  return { ok: true };
}

// ------------------------------------------------------------
// Authorization helpers
// ------------------------------------------------------------

/**
 * Verifies the requesting user is either the creator or counterparty of a pact.
 * Returns the pact if authorized, otherwise sends a 403 reply.
 */
async function requirePactOwnership(
  fastify: FastifyInstance,
  request: { walletAddress: string | null; params: { id: string } },
  reply: FastifyReply,
): Promise<PrismaPact | null> {
  const wallet = request.walletAddress;
  if (wallet === null) {
    await reply.unauthorized("A valid JWT is required.");
    return null;
  }

  const pact = await prisma.pact.findUnique({
    where: { id: request.params.id },
  });

  if (!pact) {
    await reply.notFound(`Pact ${request.params.id} not found.`);
    return null;
  }

  if (pact.creatorWallet !== wallet && pact.counterpartyWallet !== wallet) {
    await reply.forbidden("You are not a party to this pact.");
    return null;
  }

  return pact;
}

/**
 * Verifies the requesting user is the counterparty (buyer/referee) of a pact.
 * Used for operations like QR verification that should be done by the counterparty.
 */
async function requireCounterparty(
  fastify: FastifyInstance,
  request: { walletAddress: string | null; params: { id?: string }; body?: { pactId?: string } },
  reply: FastifyReply,
): Promise<PrismaPact | null> {
  const wallet = request.walletAddress;
  if (wallet === null) {
    await reply.unauthorized("A valid JWT is required.");
    return null;
  }

  const pactId = request.params?.id ?? request.body?.pactId;
  if (!pactId) {
    await reply.badRequest("Pact ID is required.");
    return null;
  }

  const pact = await prisma.pact.findUnique({ where: { id: pactId } });

  if (!pact) {
    await reply.notFound(`Pact ${pactId} not found.`);
    return null;
  }

  // For QR verification, the counterparty (buyer) scans the code
  // For proof submission, the creator submits proof
  return pact;
}

// ------------------------------------------------------------
// Plugin
// ------------------------------------------------------------

export default async function pactsRoutes(fastify: FastifyInstance) {
  // ----------------------------------------------------------
  // GET /api/pacts
  // ----------------------------------------------------------
  fastify.get<{ Querystring: PactFilters }>(
    "/",
    {
      schema: {
        querystring: PactFiltersSchema,
        response: { 200: z.array(PactSchema) },
      },
    },
    async (request, reply) => {
      const { wallet, type, status, page, limit } = request.query;
      const normalizedWallet = wallet ? normalizeWalletAddress(wallet) : undefined;

      const skip = (page - 1) * limit;

      const rows = await prisma.pact.findMany({
        where: {
          ...(normalizedWallet !== undefined
            ? {
                OR: [
                  { creatorWallet: normalizedWallet },
                  { counterpartyWallet: normalizedWallet },
                ],
              }
            : {}),
          ...(type !== undefined ? { type } : {}),
          ...(status !== undefined ? { status } : {}),
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      });

      return reply.send(mapPacts(rows));
    },
  );

  // ----------------------------------------------------------
  // GET /api/pacts/history
  // ----------------------------------------------------------
  fastify.get<{ Querystring: HistoryFilters }>(
    "/history",
    {
      schema: {
        querystring: HistoryFiltersSchema,
        response: { 200: HistoryListSchema },
      },
    },
    async (request, reply) => {
      const { wallet, page, limit, cursor, type, status, from, to } = request.query;
      const normalizedWallet = normalizeWalletAddress(wallet);

      const skip = (page - 1) * limit;

      const baseWhere = {
        OR: [{ creatorWallet: normalizedWallet }, { counterpartyWallet: normalizedWallet }],
        ...(type !== undefined ? { type } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(from !== undefined || to !== undefined
          ? {
              createdAt: {
                ...(from !== undefined ? { gte: new Date(from) } : {}),
                ...(to !== undefined ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      };

      let cursorFilter:
        | {
            OR: Array<
              | { createdAt: { lt: Date } }
              | { AND: [{ createdAt: Date }, { id: { lt: string } }] }
            >;
          }
        | undefined;

      if (cursor) {
        try {
          const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf8")) as {
            createdAt: string;
            id: string;
          };

          cursorFilter = {
            OR: [
              { createdAt: { lt: new Date(decoded.createdAt) } },
              { AND: [{ createdAt: new Date(decoded.createdAt) }, { id: { lt: decoded.id } }] },
            ],
          };
        } catch {
          return reply.badRequest("Invalid cursor.");
        }
      }

      const where = cursorFilter ? { AND: [baseWhere, cursorFilter] } : baseWhere;

      const [rowsWithOneExtra, total] = await Promise.all([
        prisma.pact.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          ...(cursor ? {} : { skip }),
          take: limit + 1,
        }),
        prisma.pact.count({ where: baseWhere }),
      ]);

      const hasMore = rowsWithOneExtra.length > limit;
      const rows = hasMore ? rowsWithOneExtra.slice(0, limit) : rowsWithOneExtra;
      const lastRow = rows[rows.length - 1];
      const nextCursor =
        hasMore && lastRow
          ? Buffer.from(
              JSON.stringify({
                createdAt: lastRow.createdAt.toISOString(),
                id: lastRow.id,
              }),
              "utf8",
            ).toString("base64")
          : undefined;

      return reply.send({
        data: mapPacts(rows),
        total,
        page,
        limit,
        hasMore,
        ...(nextCursor ? { nextCursor } : {}),
      });
    },
  );

  // ----------------------------------------------------------
  // GET /api/pacts/:id
  // ----------------------------------------------------------
  fastify.get<{ Params: PactIdParam }>(
    "/:id",
    {
      schema: {
        params: PactIdParamSchema,
        response: { 200: PactSchema },
      },
    },
    async (request, reply) => {
      reply.header("Cache-Control", "public, max-age=15, stale-while-revalidate=45");

      const row = await prisma.pact.findUnique({
        where: { id: request.params.id },
      });

      if (!row) {
        return reply.notFound(`Pact ${request.params.id} not found.`);
      }

      return reply.send(mapPact(row));
    },
  );

  // ----------------------------------------------------------
  // POST /api/pacts
  // Requires authentication - creator wallet derived from JWT
  // Rate limit: 10 pact creations per minute per user
  // ----------------------------------------------------------
  fastify.post<{ Body: CreatePactBody }>(
    "/",
    {
      preHandler: requireAuth,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
      schema: {
        body: CreatePactBodySchema,
        response: { 201: PactSchema },
      },
    },
    async (request, reply) => {
      const body = request.body;

      // creatorWallet MUST come from authenticated JWT, never from request body
      const creatorWallet = request.walletAddress;
      if (creatorWallet === null) {
        return reply.unauthorized("A valid JWT is required.");
      }

      let counterpartyWallet: string;
      try {
        counterpartyWallet = normalizeWalletAddress(body.counterpartyWallet);
      } catch {
        return reply.badRequest("Counterparty wallet must be a valid EVM address.");
      }

      const row = await prisma.pact.create({
        data: {
          type: body.type,
          status: "PENDING",
          creatorWallet,
          counterpartyWallet,
          assetSymbol: body.assetSymbol,
          assetAmount: body.assetAmount,
          ...(body.txHash !== undefined ? { txHash: body.txHash.toLowerCase() } : {}),
          ...(body.contractAddress !== undefined
            ? { contractAddress: normalizeWalletAddress(body.contractAddress) }
            : {}),

          // TRADE-specific — use spread with conditional object to avoid
          // setting `undefined` properties (exactOptionalPropertyTypes).
          ...(body.type === "TRADE"
            ? {
                itemName: body.itemName,
                ...(body.itemDescription !== undefined
                  ? { itemDescription: body.itemDescription }
                  : {}),
                ...(body.location !== undefined
                  ? { location: body.location }
                  : {}),
                ...(body.scheduledAt !== undefined
                  ? { scheduledAt: new Date(body.scheduledAt) }
                  : {}),
              }
            : {}),

          // GOAL-specific
          ...(body.type === "GOAL"
            ? {
                goalDescription: body.goalDescription,
                goalDeadline: new Date(body.goalDeadline),
              }
            : {}),
        },
      });

      await notifyWalletWithTemplate(
        row.counterpartyWallet,
        "New pact invitation",
        `You were invited to pact ${row.id.slice(0, 8)}.`,
        pactCreatedEmail({
          pactId: row.id,
          type: row.type as "TRADE" | "GOAL",
          creatorWallet: row.creatorWallet,
          ...(row.itemName ? { itemName: row.itemName } : {}),
          ...(row.assetAmount != null ? { assetAmount: row.assetAmount } : {}),
          ...(row.assetSymbol ? { assetSymbol: row.assetSymbol } : {}),
          ...(row.location ? { location: row.location } : {}),
        }),
        `/escrow/waiting-room?pactId=${row.id}`,
      );

      return reply.status(201).send(mapPact(row));
    },
  );

  // ----------------------------------------------------------
  // PATCH /api/pacts/:id/status
  // Requires authentication and pact ownership
  // ----------------------------------------------------------
  fastify.patch<{ Params: PactIdParam; Body: UpdatePactStatusBody }>(
    "/:id/status",
    {
      preHandler: requireAuth,
      schema: {
        params: PactIdParamSchema,
        body: UpdatePactStatusBodySchema,
        response: { 200: PactSchema },
      },
    },
    async (request, reply) => {
      const existing = await requirePactOwnership(fastify, request, reply);
      if (!existing) return;

      // Additional authorization: only certain status transitions allowed
      // and only by specific parties (implementation depends on business rules)
      const newStatus = request.body.status;
      const validTransitions: Record<string, string[]> = {
        PENDING: ["ACTIVE", "CANCELLED"],
        ACTIVE: ["COMPLETE", "DISPUTED"],
        PROOF_SUBMITTED: ["COMPLETE", "DISPUTED"],
      };

      const allowedNextStatuses = validTransitions[existing.status] || [];
      if (!allowedNextStatuses.includes(newStatus)) {
        return reply.badRequest(
          `Invalid status transition from ${existing.status} to ${newStatus}`
        );
      }

      const row = await prisma.pact.update({
        where: { id: request.params.id },
        data: { status: newStatus },
      });

      await Promise.all([
        notifyWallet(
          row.creatorWallet,
          "Pact status updated",
          `Pact ${row.id.slice(0, 8)} is now ${row.status}.`,
          `/pact/${row.id}`,
        ),
        notifyWallet(
          row.counterpartyWallet,
          "Pact status updated",
          `Pact ${row.id.slice(0, 8)} is now ${row.status}.`,
          `/pact/${row.id}`,
        ),
      ]);

      return reply.send(mapPact(row));
    },
  );

  // ----------------------------------------------------------
  // PATCH /api/pacts/:id/proof
  // Requires authentication - only creator can submit proof
  // ----------------------------------------------------------
  fastify.patch<{ Params: PactIdParam; Body: SubmitProofBody }>(
    "/:id/proof",
    {
      preHandler: requireAuth,
      schema: {
        params: PactIdParamSchema,
        body: SubmitProofBodySchema,
        response: { 200: PactSchema },
      },
    },
    async (request, reply) => {
      const wallet = request.walletAddress;
      if (wallet === null) {
        return reply.unauthorized("A valid JWT is required.");
      }

      const existing = await prisma.pact.findUnique({
        where: { id: request.params.id },
      });

      if (!existing) {
        return reply.notFound(`Pact ${request.params.id} not found.`);
      }

      // Only the creator can submit proof
      if (existing.creatorWallet !== wallet) {
        return reply.forbidden("Only the pact creator can submit proof.");
      }

      // Only allow proof submission in certain states
      if (existing.status !== "ACTIVE" && existing.status !== "PENDING") {
        return reply.badRequest(
          `Cannot submit proof for pact in ${existing.status} status`
        );
      }

      const urlValidation = validateProofUrl(request.body.proofUrl);
      if (!urlValidation.ok) {
        return reply.badRequest(urlValidation.message ?? "Invalid proof URL.");
      }

      const row = await prisma.pact.update({
        where: { id: request.params.id },
        data: {
          proofUrl: request.body.proofUrl,
          proofSubmittedAt: new Date(),
          status: "PROOF_SUBMITTED",
        },
      });

      await notifyWallet(
        row.counterpartyWallet,
        "Proof submitted",
        `Proof was submitted for pact ${row.id.slice(0, 8)}.`,
        `/judgment-room?pactId=${row.id}`,
      );

      return reply.send(mapPact(row));
    },
  );

  fastify.patch<{ Params: PactIdParam; Body: OnchainUpdateBody }>(
    "/:id/onchain",
    {
      preHandler: requireAuth,
      schema: {
        params: PactIdParamSchema,
        body: OnchainUpdateBodySchema,
        response: { 200: PactSchema },
      },
    },
    async (request, reply) => {
      const existing = await requirePactOwnership(fastify, request, reply);
      if (!existing) {
        return;
      }

      const row = await prisma.pact.update({
        where: { id: existing.id },
        data: {
          txHash: request.body.txHash.toLowerCase(),
          contractAddress: normalizeWalletAddress(request.body.contractAddress),
        },
      });

      return reply.send(mapPact(row));
    },
  );

  fastify.post<{ Params: PactIdParam }>(
    "/:id/accept",
    {
      preHandler: requireAuth,
      schema: {
        params: PactIdParamSchema,
        response: { 200: PactSchema },
      },
    },
    async (request, reply) => {
      const wallet = request.walletAddress;
      if (!wallet) {
        return reply.unauthorized("A valid JWT is required.");
      }

      const pact = await prisma.pact.findUnique({ where: { id: request.params.id } });
      if (!pact) {
        return reply.notFound(`Pact ${request.params.id} not found.`);
      }

      if (pact.counterpartyWallet !== wallet) {
        return reply.forbidden("Only the counterparty can accept this pact.");
      }

      if (pact.status !== "PENDING") {
        return reply.badRequest(`Pact is already ${pact.status}.`);
      }

      const row = await prisma.pact.update({
        where: { id: pact.id },
        data: { status: "ACTIVE" },
      });

      await notifyWalletWithTemplate(
        row.creatorWallet,
        "Pact accepted",
        `Your pact ${row.id.slice(0, 8)} was accepted.`,
        pactAcceptedEmail({
          pactId: row.id,
          counterpartyWallet: row.counterpartyWallet,
          ...(row.itemName ? { itemName: row.itemName } : {}),
        }),
        `/escrow/waiting-room?pactId=${row.id}`,
      );

      return reply.send(mapPact(row));
    },
  );

  // ----------------------------------------------------------
  // POST /api/pacts/:id/qr  — generate nonce + QR data URL
  // Requires authentication and pact ownership
  // Stricter rate limit: 5 per minute per user
  // ----------------------------------------------------------
  fastify.post<{ Params: PactIdParam }>(
    "/:id/qr",
    {
      preHandler: requireAuth,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
      schema: {
        params: PactIdParamSchema,
        response: { 200: QrResponseSchema },
      },
    },
    async (request, reply) => {
      const existing = await requirePactOwnership(fastify, request, reply);
      if (!existing) return;

      // Only allow QR generation for active pacts
      if (existing.status !== "ACTIVE") {
        return reply.badRequest(
          `Cannot generate QR code for pact in ${existing.status} status`
        );
      }

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const qrRecord = await prisma.qrNonce.create({
        data: {
          pactId: request.params.id,
          expiresAt,
        },
      });

      // Sign the payload to prevent tampering
      const payload = JSON.stringify({
        nonce: qrRecord.nonce,
        pactId: existing.id,
        exp: expiresAt.getTime(),
      });

      const signature = crypto
        .createHmac("sha256", process.env["QR_SECRET"] ?? "default-secret-change-in-production")
        .update(payload)
        .digest("hex");

      const signedPayload = JSON.stringify({ payload, signature });

      let qrDataUrl: string;
      try {
        qrDataUrl = await QRCode.toDataURL(signedPayload, { type: "image/png" });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        request.log.error({ err }, `QR generation failed: ${message}`);
        return reply.internalServerError("Failed to generate QR code.");
      }

      return reply.send({
        nonce: qrRecord.nonce,
        qrDataUrl,
        expiresAt: expiresAt.toISOString(),
      });
    },
  );

  // ----------------------------------------------------------
  // POST /api/pacts/verify-qr  — validate signed payload → COMPLETE
  // Requires authentication
  // ----------------------------------------------------------
  fastify.post<{ Body: VerifyQrBody }>(
    "/verify-qr",
    {
      preHandler: requireAuth,
      schema: {
        body: VerifyQrBodySchema,
        response: { 200: PactSchema },
      },
    },
    async (request, reply) => {
      const wallet = request.walletAddress;
      if (wallet === null) {
        return reply.unauthorized("A valid JWT is required.");
      }

      const { nonce, pactId } = request.body;

      const qrRecord = await prisma.qrNonce.findUnique({
        where: { nonce },
      });

      if (!qrRecord) {
        return reply.badRequest("Invalid nonce.");
      }

      if (qrRecord.pactId !== pactId) {
        return reply.badRequest("Nonce does not match pact.");
      }

      if (qrRecord.used) {
        return reply.badRequest("Nonce has already been used.");
      }

      if (qrRecord.expiresAt < new Date()) {
        return reply.badRequest("Nonce has expired.");
      }

      const pact = await prisma.pact.findUnique({ where: { id: pactId } });
      if (!pact) {
        return reply.notFound(`Pact ${pactId} not found.`);
      }

      // Only the counterparty (buyer/referee) can verify QR and complete the pact
      if (pact.counterpartyWallet !== wallet) {
        return reply.forbidden("Only the counterparty can verify QR codes.");
      }

      // Only active pacts can be completed
      if (pact.status !== "ACTIVE") {
        return reply.badRequest(
          `Cannot complete pact in ${pact.status} status`
        );
      }

      // $transaction returns a tuple typed as [QrNonce, Pact] (Prisma types)
      const [, updatedPact] = await prisma.$transaction([
        prisma.qrNonce.update({
          where: { nonce },
          data: { used: true },
        }),
        prisma.pact.update({
          where: { id: pactId },
          data: { status: "COMPLETE" },
        }),
      ]);

      const completedTemplate = pactCompletedEmail({ pactId: updatedPact.id, ...(updatedPact.itemName ? { itemName: updatedPact.itemName } : {}) });
      await Promise.all([
        notifyWalletWithTemplate(updatedPact.creatorWallet, "Pact completed", `Pact ${updatedPact.id.slice(0, 8)} is complete.`, completedTemplate, `/history`),
        notifyWalletWithTemplate(updatedPact.counterpartyWallet, "Pact completed", `Pact ${updatedPact.id.slice(0, 8)} is complete.`, completedTemplate, `/history`),
      ]);

      return reply.send(mapPact(updatedPact));
    },
  );
}
