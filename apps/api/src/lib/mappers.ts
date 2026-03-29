// ============================================================
// apps/api/src/lib/mappers.ts
//
// Maps raw Prisma rows to the shared domain types that the
// frontend expects. The DB stores asset as flat columns
// (assetSymbol, assetAmount) while the shared PactSchema
// uses a nested `asset` object.
//
// Strict rules:
//  - No `as X` assertions (except after a Zod `.parse()`)
//  - Prisma-generated payload types used throughout
//  - Explicit annotated return types on every mapper
// ============================================================

import type { Pact as PrismaPact } from "@prisma/client";
import {
  AssetSymbolSchema,
  PactTypeSchema,
  PactStatusSchema,
} from "@safe-meet/shared";
import type { Pact } from "@safe-meet/shared";

// Asset amounts formatted with up to 6 significant decimal places.
function formatAmount(amount: number, symbol: string): string {
  const formatted = parseFloat(amount.toPrecision(6)).toString();
  return `${formatted} ${symbol}`;
}

export function mapPact(row: PrismaPact): Pact {
  // Parse enums through Zod — the only sanctioned use of the parsed value.
  // `.parse()` throws a ZodError (not a cast) if the DB ever has bad data.
  const type = PactTypeSchema.parse(row.type);
  const status = PactStatusSchema.parse(row.status);
  const assetSymbol = AssetSymbolSchema.parse(row.assetSymbol);

  return {
    id: row.id,
    type,
    status,

    creatorWallet: row.creatorWallet,
    counterpartyWallet: row.counterpartyWallet,

    // Optional TRADE fields — coerce null → undefined to satisfy
    // exactOptionalPropertyTypes (omit the key when absent).
    ...(row.itemName !== null ? { itemName: row.itemName } : {}),
    ...(row.itemDescription !== null
      ? { itemDescription: row.itemDescription }
      : {}),
    ...(row.location !== null ? { location: row.location } : {}),
    ...(row.scheduledAt !== null
      ? { scheduledAt: row.scheduledAt.toISOString() }
      : {}),

    asset: {
      symbol: assetSymbol,
      amount: row.assetAmount,
      amountFormatted: formatAmount(row.assetAmount, assetSymbol),
    },

    // Optional GOAL fields
    ...(row.goalDescription !== null
      ? { goalDescription: row.goalDescription }
      : {}),
    ...(row.goalDeadline !== null
      ? { goalDeadline: row.goalDeadline.toISOString() }
      : {}),

    // Optional proof fields
    ...(row.proofUrl !== null ? { proofUrl: row.proofUrl } : {}),
    ...(row.proofSubmittedAt !== null
      ? { proofSubmittedAt: row.proofSubmittedAt.toISOString() }
      : {}),

    // Optional on-chain fields
    ...(row.txHash !== null ? { txHash: row.txHash } : {}),
    ...(row.contractAddress !== null
      ? { contractAddress: row.contractAddress }
      : {}),

    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapPacts(rows: PrismaPact[]): Pact[] {
  return rows.map(mapPact);
}
