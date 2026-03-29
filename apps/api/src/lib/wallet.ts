import { getAddress } from "viem";

export function normalizeWalletAddress(value: string): string {
  try {
    return getAddress(value).toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}
