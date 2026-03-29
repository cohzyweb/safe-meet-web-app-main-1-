#!/usr/bin/env node
// ============================================================
// contracts/deploy.mjs
// Deploy SafeMeetEscrow to Base Sepolia or Flow EVM Testnet.
//
// Usage:
//   PRIVATE_KEY=0x... node contracts/deploy.mjs
//   PRIVATE_KEY=0x... DEPLOY_CHAIN=flow-testnet node contracts/deploy.mjs
//   PRIVATE_KEY=0x... DEPLOY_CHAIN=base-sepolia node contracts/deploy.mjs
//
// Optional env:
//   DEPLOY_CHAIN     — "base-sepolia" (default) | "flow-testnet"
//   RPC_URL          — override chain RPC
//
// After deploy, add the printed address to .env.web:
//   NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=0x...
// ============================================================

import { readFileSync } from "fs";
import { createWalletClient, createPublicClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import solc from "solc";

// ── Chain definitions ──────────────────────────────────────

const flowEvmTestnet = defineChain({
  id: 545,
  name: "Flow EVM Testnet",
  nativeCurrency: { name: "Flow", symbol: "FLOW", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet.evm.nodes.onflow.org"] },
  },
  blockExplorers: {
    default: { name: "FlowScan", url: "https://evm-testnet.flowscan.io" },
  },
  testnet: true,
});

const CHAINS = {
  "base-sepolia": {
    chain: baseSepolia,
    defaultRpc: "https://sepolia.base.org",
    explorerTx: (addr) => `https://sepolia.basescan.org/address/${addr}`,
    faucet: "https://www.alchemy.com/faucets/base-sepolia",
    currency: "ETH",
  },
  "flow-testnet": {
    chain: flowEvmTestnet,
    defaultRpc: "https://testnet.evm.nodes.onflow.org",
    explorerTx: (addr) => `https://evm-testnet.flowscan.io/address/${addr}`,
    faucet: "https://testnet-faucet.onflow.org",
    currency: "FLOW",
  },
};

const deployChainKey = process.env.DEPLOY_CHAIN ?? "base-sepolia";
const chainConfig = CHAINS[deployChainKey];
if (!chainConfig) {
  console.error(`Error: unknown DEPLOY_CHAIN="${deployChainKey}". Valid: ${Object.keys(CHAINS).join(", ")}`);
  process.exit(1);
}

// ── 1. Read and compile the contract ──────────────────────────

const source = readFileSync(new URL("./src/SafeMeetEscrow.sol", import.meta.url), "utf8");

const input = {
  language: "Solidity",
  sources: { "SafeMeetEscrow.sol": { content: source } },
  settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } } },
};

process.stdout.write("Compiling SafeMeetEscrow.sol…  ");
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors?.some((e) => e.severity === "error")) {
  console.error("\nCompilation errors:");
  output.errors.forEach((e) => console.error(" ", e.formattedMessage));
  process.exit(1);
}

const contract = output.contracts["SafeMeetEscrow.sol"]["SafeMeetEscrow"];
const abi = contract.abi;
const bytecode = "0x" + contract.evm.bytecode.object;
console.log("done");

// ── 2. Set up viem clients ─────────────────────────────────────

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.error("Error: PRIVATE_KEY env var is required.\n  PRIVATE_KEY=0x... node contracts/deploy.mjs");
  process.exit(1);
}

const rpcUrl = process.env.RPC_URL ?? chainConfig.defaultRpc;
const account = privateKeyToAccount(privateKey);

const walletClient = createWalletClient({
  account,
  chain: chainConfig.chain,
  transport: http(rpcUrl),
});

const publicClient = createPublicClient({
  chain: chainConfig.chain,
  transport: http(rpcUrl),
});

// ── 3. Deploy ──────────────────────────────────────────────────

console.log(`Chain:          ${chainConfig.chain.name} (id=${chainConfig.chain.id})`);
console.log(`Deploying from: ${account.address}`);
console.log(`RPC:            ${rpcUrl}`);
process.stdout.write("Sending deploy tx…  ");

const hash = await walletClient.deployContract({
  abi,
  bytecode,
  args: [],
});

console.log(`tx: ${hash}`);
process.stdout.write("Waiting for receipt…  ");

const receipt = await publicClient.waitForTransactionReceipt({ hash });
const address = receipt.contractAddress;

if (!address) {
  console.error("Deploy failed — no contract address in receipt.");
  process.exit(1);
}

console.log("done\n");
console.log("═══════════════════════════════════════════════════");
console.log("  SafeMeetEscrow deployed!");
console.log(`  Chain:    ${chainConfig.chain.name}`);
console.log(`  Address:  ${address}`);
console.log(`  Block:    ${receipt.blockNumber}`);
console.log(`  Explorer: ${chainConfig.explorerTx(address)}`);
console.log("═══════════════════════════════════════════════════\n");
console.log("Next: add to your .env.web (and VPS .env.web):");
console.log(`  NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=${address}\n`);
console.log(`Get testnet ${chainConfig.currency}: ${chainConfig.faucet}\n`);
