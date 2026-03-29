import { z } from "zod";
/** Wallet address: 0x… EVM address or ENS .eth name */
export declare const WalletSchema: z.ZodString;
/** ISO-8601 datetime string */
export declare const ISODateSchema: z.ZodString;
export declare const AssetSymbolSchema: z.ZodEnum<{
    ETH: "ETH";
    USDC: "USDC";
    DAI: "DAI";
    WBTC: "WBTC";
    USDT: "USDT";
}>;
export declare const AssetSchema: z.ZodObject<{
    symbol: z.ZodEnum<{
        ETH: "ETH";
        USDC: "USDC";
        DAI: "DAI";
        WBTC: "WBTC";
        USDT: "USDT";
    }>;
    amount: z.ZodNumber;
    amountFormatted: z.ZodString;
    usdValue: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const PactTypeSchema: z.ZodEnum<{
    TRADE: "TRADE";
    GOAL: "GOAL";
}>;
export declare const PactStatusSchema: z.ZodEnum<{
    PENDING: "PENDING";
    ACTIVE: "ACTIVE";
    PROOF_SUBMITTED: "PROOF_SUBMITTED";
    COMPLETE: "COMPLETE";
    DISPUTED: "DISPUTED";
    CANCELLED: "CANCELLED";
    EXPIRED: "EXPIRED";
}>;
export declare const PactSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<{
        TRADE: "TRADE";
        GOAL: "GOAL";
    }>;
    status: z.ZodEnum<{
        PENDING: "PENDING";
        ACTIVE: "ACTIVE";
        PROOF_SUBMITTED: "PROOF_SUBMITTED";
        COMPLETE: "COMPLETE";
        DISPUTED: "DISPUTED";
        CANCELLED: "CANCELLED";
        EXPIRED: "EXPIRED";
    }>;
    creatorWallet: z.ZodString;
    counterpartyWallet: z.ZodString;
    itemName: z.ZodOptional<z.ZodString>;
    itemDescription: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    scheduledAt: z.ZodOptional<z.ZodString>;
    asset: z.ZodObject<{
        symbol: z.ZodEnum<{
            ETH: "ETH";
            USDC: "USDC";
            DAI: "DAI";
            WBTC: "WBTC";
            USDT: "USDT";
        }>;
        amount: z.ZodNumber;
        amountFormatted: z.ZodString;
        usdValue: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    goalDescription: z.ZodOptional<z.ZodString>;
    goalDeadline: z.ZodOptional<z.ZodString>;
    proofUrl: z.ZodOptional<z.ZodString>;
    proofSubmittedAt: z.ZodOptional<z.ZodString>;
    txHash: z.ZodOptional<z.ZodString>;
    contractAddress: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const PactListSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<{
        TRADE: "TRADE";
        GOAL: "GOAL";
    }>;
    status: z.ZodEnum<{
        PENDING: "PENDING";
        ACTIVE: "ACTIVE";
        PROOF_SUBMITTED: "PROOF_SUBMITTED";
        COMPLETE: "COMPLETE";
        DISPUTED: "DISPUTED";
        CANCELLED: "CANCELLED";
        EXPIRED: "EXPIRED";
    }>;
    creatorWallet: z.ZodString;
    counterpartyWallet: z.ZodString;
    itemName: z.ZodOptional<z.ZodString>;
    itemDescription: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    scheduledAt: z.ZodOptional<z.ZodString>;
    asset: z.ZodObject<{
        symbol: z.ZodEnum<{
            ETH: "ETH";
            USDC: "USDC";
            DAI: "DAI";
            WBTC: "WBTC";
            USDT: "USDT";
        }>;
        amount: z.ZodNumber;
        amountFormatted: z.ZodString;
        usdValue: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    goalDescription: z.ZodOptional<z.ZodString>;
    goalDeadline: z.ZodOptional<z.ZodString>;
    proofUrl: z.ZodOptional<z.ZodString>;
    proofSubmittedAt: z.ZodOptional<z.ZodString>;
    txHash: z.ZodOptional<z.ZodString>;
    contractAddress: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>>;
export declare const CreateTradePactBodySchema: z.ZodObject<{
    type: z.ZodLiteral<"TRADE">;
    counterpartyWallet: z.ZodString;
    itemName: z.ZodString;
    itemDescription: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    scheduledAt: z.ZodOptional<z.ZodString>;
    assetSymbol: z.ZodEnum<{
        ETH: "ETH";
        USDC: "USDC";
        DAI: "DAI";
        WBTC: "WBTC";
        USDT: "USDT";
    }>;
    assetAmount: z.ZodNumber;
}, z.core.$strip>;
export declare const CreateGoalPactBodySchema: z.ZodObject<{
    type: z.ZodLiteral<"GOAL">;
    goalDescription: z.ZodString;
    goalDeadline: z.ZodString;
    counterpartyWallet: z.ZodString;
    assetSymbol: z.ZodEnum<{
        ETH: "ETH";
        USDC: "USDC";
        DAI: "DAI";
        WBTC: "WBTC";
        USDT: "USDT";
    }>;
    assetAmount: z.ZodNumber;
}, z.core.$strip>;
/** Union that the POST /api/pacts handler validates against */
export declare const CreatePactBodySchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"TRADE">;
    counterpartyWallet: z.ZodString;
    itemName: z.ZodString;
    itemDescription: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    scheduledAt: z.ZodOptional<z.ZodString>;
    assetSymbol: z.ZodEnum<{
        ETH: "ETH";
        USDC: "USDC";
        DAI: "DAI";
        WBTC: "WBTC";
        USDT: "USDT";
    }>;
    assetAmount: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"GOAL">;
    goalDescription: z.ZodString;
    goalDeadline: z.ZodString;
    counterpartyWallet: z.ZodString;
    assetSymbol: z.ZodEnum<{
        ETH: "ETH";
        USDC: "USDC";
        DAI: "DAI";
        WBTC: "WBTC";
        USDT: "USDT";
    }>;
    assetAmount: z.ZodNumber;
}, z.core.$strip>], "type">;
export declare const UpdatePactStatusBodySchema: z.ZodObject<{
    status: z.ZodEnum<{
        PENDING: "PENDING";
        ACTIVE: "ACTIVE";
        PROOF_SUBMITTED: "PROOF_SUBMITTED";
        COMPLETE: "COMPLETE";
        DISPUTED: "DISPUTED";
        CANCELLED: "CANCELLED";
        EXPIRED: "EXPIRED";
    }>;
}, z.core.$strip>;
export declare const SubmitProofBodySchema: z.ZodObject<{
    proofUrl: z.ZodString;
}, z.core.$strip>;
export declare const VerifyQrBodySchema: z.ZodObject<{
    nonce: z.ZodString;
    pactId: z.ZodString;
}, z.core.$strip>;
export declare const QrResponseSchema: z.ZodObject<{
    nonce: z.ZodString;
    qrDataUrl: z.ZodString;
    expiresAt: z.ZodString;
}, z.core.$strip>;
export declare const DashboardStatsSchema: z.ZodObject<{
    totalValueLocked: z.ZodNumber;
    totalValueLockedFormatted: z.ZodString;
    tvlChangePercent: z.ZodNumber;
    completedTrades: z.ZodNumber;
    activeEscrows: z.ZodNumber;
    awaitingVerification: z.ZodNumber;
}, z.core.$strip>;
export declare const ProfileSchema: z.ZodObject<{
    wallet: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    totalPacts: z.ZodNumber;
    completedPacts: z.ZodNumber;
    disputedPacts: z.ZodNumber;
    successRate: z.ZodNumber;
    trustScore: z.ZodOptional<z.ZodNumber>;
    joinedAt: z.ZodString;
}, z.core.$strip>;
export declare const UpdateProfileBodySchema: z.ZodObject<{
    displayName: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const SessionSchema: z.ZodObject<{
    id: z.ZodString;
    wallet: z.ZodString;
    connectedAt: z.ZodString;
    expiresAt: z.ZodOptional<z.ZodString>;
    chainId: z.ZodNumber;
    chainName: z.ZodString;
    deviceName: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    isCurrent: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const SessionListSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    wallet: z.ZodString;
    connectedAt: z.ZodString;
    expiresAt: z.ZodOptional<z.ZodString>;
    chainId: z.ZodNumber;
    chainName: z.ZodString;
    deviceName: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    isCurrent: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>>;
export declare const PaginatedResponseSchema: <T extends z.ZodTypeAny>(itemSchema: T) => z.ZodObject<{
    data: z.ZodArray<T>;
    total: z.ZodNumber;
    page: z.ZodNumber;
    limit: z.ZodNumber;
    hasMore: z.ZodBoolean;
}, z.core.$strip>;
export declare const HistoryListSchema: z.ZodObject<{
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            TRADE: "TRADE";
            GOAL: "GOAL";
        }>;
        status: z.ZodEnum<{
            PENDING: "PENDING";
            ACTIVE: "ACTIVE";
            PROOF_SUBMITTED: "PROOF_SUBMITTED";
            COMPLETE: "COMPLETE";
            DISPUTED: "DISPUTED";
            CANCELLED: "CANCELLED";
            EXPIRED: "EXPIRED";
        }>;
        creatorWallet: z.ZodString;
        counterpartyWallet: z.ZodString;
        itemName: z.ZodOptional<z.ZodString>;
        itemDescription: z.ZodOptional<z.ZodString>;
        location: z.ZodOptional<z.ZodString>;
        scheduledAt: z.ZodOptional<z.ZodString>;
        asset: z.ZodObject<{
            symbol: z.ZodEnum<{
                ETH: "ETH";
                USDC: "USDC";
                DAI: "DAI";
                WBTC: "WBTC";
                USDT: "USDT";
            }>;
            amount: z.ZodNumber;
            amountFormatted: z.ZodString;
            usdValue: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>;
        goalDescription: z.ZodOptional<z.ZodString>;
        goalDeadline: z.ZodOptional<z.ZodString>;
        proofUrl: z.ZodOptional<z.ZodString>;
        proofSubmittedAt: z.ZodOptional<z.ZodString>;
        txHash: z.ZodOptional<z.ZodString>;
        contractAddress: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
    total: z.ZodNumber;
    page: z.ZodNumber;
    limit: z.ZodNumber;
    hasMore: z.ZodBoolean;
}, z.core.$strip>;
export declare const PactFiltersSchema: z.ZodObject<{
    wallet: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<{
        TRADE: "TRADE";
        GOAL: "GOAL";
    }>>;
    status: z.ZodOptional<z.ZodEnum<{
        PENDING: "PENDING";
        ACTIVE: "ACTIVE";
        PROOF_SUBMITTED: "PROOF_SUBMITTED";
        COMPLETE: "COMPLETE";
        DISPUTED: "DISPUTED";
        CANCELLED: "CANCELLED";
        EXPIRED: "EXPIRED";
    }>>;
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export declare const HistoryFiltersSchema: z.ZodObject<{
    wallet: z.ZodString;
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    type: z.ZodOptional<z.ZodEnum<{
        TRADE: "TRADE";
        GOAL: "GOAL";
    }>>;
    status: z.ZodOptional<z.ZodEnum<{
        PENDING: "PENDING";
        ACTIVE: "ACTIVE";
        PROOF_SUBMITTED: "PROOF_SUBMITTED";
        COMPLETE: "COMPLETE";
        DISPUTED: "DISPUTED";
        CANCELLED: "CANCELLED";
        EXPIRED: "EXPIRED";
    }>>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ApiErrorSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    statusCode: z.ZodNumber;
}, z.core.$strip>;
//# sourceMappingURL=schemas.d.ts.map