import { defineChain } from "viem";

const CHAIN_EXPLORER_BASE: Record<number, string> = {
  84532: "https://sepolia.basescan.org",
  545:   "https://evm-testnet.flowscan.io",
  747:   "https://evm.flowscan.io",
};

export function getTxExplorerUrl(txHash: string, chainId = 84532): string {
  const base = CHAIN_EXPLORER_BASE[chainId] ?? CHAIN_EXPLORER_BASE[84532];
  return `${base}/tx/${txHash}`;
}

// Flow EVM is not yet in the viem/chains package — define manually.
export const flowEvmTestnet = defineChain({
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

export const flowEvmMainnet = defineChain({
  id: 747,
  name: "Flow EVM",
  nativeCurrency: { name: "Flow", symbol: "FLOW", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://mainnet.evm.nodes.onflow.org"] },
  },
  blockExplorers: {
    default: { name: "FlowScan", url: "https://evm.flowscan.io" },
  },
});
