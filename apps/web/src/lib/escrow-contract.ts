import { keccak256, stringToHex } from "viem";

// Primary contract address (chain-agnostic for single-chain deploys)
export const ESCROW_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS as `0x${string}` | undefined;

// Per-chain contract addresses — use these when supporting multiple chains simultaneously
export const ESCROW_CONTRACT_ADDRESSES: Record<number, `0x${string}` | undefined> = {
  // Base Sepolia
  84532: process.env.NEXT_PUBLIC_BASE_ESCROW_ADDRESS as `0x${string}` | undefined
    ?? (process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS as `0x${string}` | undefined),
  // Flow EVM Testnet
  545: process.env.NEXT_PUBLIC_FLOW_TESTNET_ESCROW_ADDRESS as `0x${string}` | undefined
    ?? (process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS as `0x${string}` | undefined),
  // Flow EVM Mainnet
  747: process.env.NEXT_PUBLIC_FLOW_MAINNET_ESCROW_ADDRESS as `0x${string}` | undefined,
};

export const escrowContractAbi = [
  {
    type: "function",
    name: "lockFunds",
    stateMutability: "payable",
    inputs: [
      { name: "pactId", type: "bytes32" },
      { name: "counterparty", type: "address" },
    ],
    outputs: [],
  },
] as const;

export function pactIdToBytes32(pactId: string): `0x${string}` {
  return keccak256(stringToHex(pactId));
}
