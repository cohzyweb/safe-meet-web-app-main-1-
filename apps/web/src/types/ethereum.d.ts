// ============================================================
// src/types/ethereum.d.ts
// Type-safe declaration for window.ethereum (EIP-1193 provider)
// Used by RainbowKit/Wagmi internally — we declare it here so
// NO `(window as any).ethereum` casts are ever needed.
// ============================================================

interface EthereumRequestArguments {
  readonly method: string;
  readonly params?: readonly unknown[] | Record<string, unknown>;
}

interface EthereumProviderRpcError extends Error {
  code: number;
  data?: unknown;
}

type EthereumEventMap = {
  accountsChanged: [accounts: string[]];
  chainChanged: [chainId: string];
  connect: [info: { chainId: string }];
  disconnect: [error: EthereumProviderRpcError];
  message: [message: { type: string; data: unknown }];
};

type EthereumEventListener<T extends unknown[]> = (...args: T) => void;

interface EthereumProvider {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;

  request(args: EthereumRequestArguments): Promise<unknown>;

  on<K extends keyof EthereumEventMap>(
    event: K,
    listener: EthereumEventListener<EthereumEventMap[K]>
  ): this;

  removeListener<K extends keyof EthereumEventMap>(
    event: K,
    listener: EthereumEventListener<EthereumEventMap[K]>
  ): this;
}

declare global {
  interface Window {
    /** EIP-1193 provider injected by wallets like MetaMask */
    ethereum?: EthereumProvider;
  }
}

export {};
