// ============================================================
// packages/shared/src/schemas.ts
//
// SINGLE SOURCE OF TRUTH for all Zod schemas.
// Backend (Fastify) and frontend (Next.js) both import from here.
// Types are derived via z.infer<> — never written by hand.
// ============================================================
import { z } from "zod";
// ------------------------------------------------------------
// Primitives & helpers
// ------------------------------------------------------------
/** Wallet address: 0x… EVM address or ENS .eth name */
export const WalletSchema = z
    .string()
    .regex(/^(0x[a-fA-F0-9]{40}|.+\.eth)$/, "Must be a valid 0x address or ENS name");
/** ISO-8601 datetime string */
export const ISODateSchema = z.string().datetime({ offset: true });
// ------------------------------------------------------------
// Asset
// ------------------------------------------------------------
export const AssetSymbolSchema = z.enum(["ETH", "USDC", "DAI", "WBTC", "USDT"]);
export const AssetSchema = z.object({
    symbol: AssetSymbolSchema,
    amount: z.number().nonnegative(),
    amountFormatted: z.string(), // e.g. "1.45 ETH"
    usdValue: z.number().nonnegative().optional(),
});
// ------------------------------------------------------------
// Pact — enums
// ------------------------------------------------------------
export const PactTypeSchema = z.enum(["TRADE", "GOAL"]);
export const PactStatusSchema = z.enum([
    "PENDING", // Created, waiting for counterparty to accept
    "ACTIVE", // Both parties confirmed, escrow funded on-chain
    "PROOF_SUBMITTED", // One party submitted proof of completion
    "COMPLETE", // Both confirmed — escrow released
    "DISPUTED", // One party raised a dispute
    "CANCELLED", // Cancelled before activation
    "EXPIRED", // Timed out without resolution
]);
// ------------------------------------------------------------
// Pact — full domain object
// ------------------------------------------------------------
export const PactSchema = z.object({
    id: z.string().uuid(),
    type: PactTypeSchema,
    status: PactStatusSchema,
    // Parties
    creatorWallet: z.string(),
    counterpartyWallet: z.string(),
    // TRADE fields
    itemName: z.string().max(120).optional(),
    itemDescription: z.string().max(1000).optional(),
    location: z.string().max(200).optional(),
    scheduledAt: ISODateSchema.optional(),
    // Value
    asset: AssetSchema,
    // GOAL fields
    goalDescription: z.string().max(1000).optional(),
    goalDeadline: ISODateSchema.optional(),
    // Proof
    proofUrl: z.string().url().optional(),
    proofSubmittedAt: ISODateSchema.optional(),
    // On-chain
    txHash: z.string().optional(),
    contractAddress: z.string().optional(),
    // Timestamps
    createdAt: ISODateSchema,
    updatedAt: ISODateSchema,
});
export const PactListSchema = z.array(PactSchema);
// ------------------------------------------------------------
// API: request body schemas (used by Fastify for validation)
// ------------------------------------------------------------
export const CreateTradePactBodySchema = z.object({
    type: z.literal("TRADE"),
    counterpartyWallet: WalletSchema,
    itemName: z.string().min(1).max(120),
    itemDescription: z.string().max(1000).optional(),
    location: z.string().max(200).optional(),
    scheduledAt: ISODateSchema.optional(),
    assetSymbol: AssetSymbolSchema,
    assetAmount: z.number().positive("Amount must be greater than 0"),
});
export const CreateGoalPactBodySchema = z.object({
    type: z.literal("GOAL"),
    goalDescription: z.string().min(10).max(1000),
    goalDeadline: ISODateSchema,
    counterpartyWallet: WalletSchema, // referee
    assetSymbol: AssetSymbolSchema,
    assetAmount: z.number().positive("Amount must be greater than 0"),
});
/** Union that the POST /api/pacts handler validates against */
export const CreatePactBodySchema = z.discriminatedUnion("type", [
    CreateTradePactBodySchema,
    CreateGoalPactBodySchema,
]);
export const UpdatePactStatusBodySchema = z.object({
    status: PactStatusSchema,
});
export const SubmitProofBodySchema = z.object({
    proofUrl: z.string().url("Must be a valid URL"),
});
export const VerifyQrBodySchema = z.object({
    nonce: z.string().uuid(),
    pactId: z.string().uuid(),
});
// ------------------------------------------------------------
// QR payload
// ------------------------------------------------------------
export const QrResponseSchema = z.object({
    nonce: z.string().uuid(),
    qrDataUrl: z.string(), // base64 data: URI
    expiresAt: ISODateSchema,
});
// ------------------------------------------------------------
// Dashboard stats
// ------------------------------------------------------------
export const DashboardStatsSchema = z.object({
    totalValueLocked: z.number().nonnegative(),
    totalValueLockedFormatted: z.string(),
    tvlChangePercent: z.number(),
    completedTrades: z.number().int().nonnegative(),
    activeEscrows: z.number().int().nonnegative(),
    awaitingVerification: z.number().int().nonnegative(),
});
// ------------------------------------------------------------
// Profile
// ------------------------------------------------------------
export const ProfileSchema = z.object({
    wallet: z.string(),
    displayName: z.string().max(80).optional(),
    avatarUrl: z.string().url().optional(),
    email: z.string().email().optional(),
    totalPacts: z.number().int().nonnegative(),
    completedPacts: z.number().int().nonnegative(),
    disputedPacts: z.number().int().nonnegative(),
    successRate: z.number().min(0).max(100),
    trustScore: z.number().int().min(0).max(1000).optional(),
    joinedAt: ISODateSchema,
});
export const UpdateProfileBodySchema = z.object({
    displayName: z.string().max(80).optional(),
    email: z.string().email().optional(),
    avatarUrl: z.string().url().optional(),
});
// ------------------------------------------------------------
// Session (enriched — web extras included)
// ------------------------------------------------------------
export const SessionSchema = z.object({
    id: z.string().uuid(),
    wallet: z.string(),
    connectedAt: ISODateSchema,
    expiresAt: ISODateSchema.optional(),
    chainId: z.number().int().positive(),
    chainName: z.string(),
    // Enriched by the backend / client context:
    deviceName: z.string().optional(), // e.g. "Brave Browser (macOS)"
    location: z.string().optional(), // e.g. "London, UK"
    isCurrent: z.boolean().optional(),
});
export const SessionListSchema = z.array(SessionSchema);
// ------------------------------------------------------------
// Paginated response wrapper
// ------------------------------------------------------------
export const PaginatedResponseSchema = (itemSchema) => z.object({
    data: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    hasMore: z.boolean(),
});
export const HistoryListSchema = PaginatedResponseSchema(PactSchema);
// ------------------------------------------------------------
// Query / filter params
// ------------------------------------------------------------
export const PactFiltersSchema = z.object({
    wallet: z.string().optional(),
    type: PactTypeSchema.optional(),
    status: PactStatusSchema.optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});
export const HistoryFiltersSchema = z.object({
    wallet: z.string(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    type: PactTypeSchema.optional(),
    status: PactStatusSchema.optional(),
    from: z.string().optional(),
    to: z.string().optional(),
});
// ------------------------------------------------------------
// API error
// ------------------------------------------------------------
export const ApiErrorSchema = z.object({
    code: z.string(),
    message: z.string(),
    statusCode: z.number().int(),
});
//# sourceMappingURL=schemas.js.map