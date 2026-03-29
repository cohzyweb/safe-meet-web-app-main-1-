import { parseEther } from "viem";
import { usePublicClient, useWriteContract, useChainId } from "wagmi";
import { ESCROW_CONTRACT_ADDRESSES, escrowContractAbi, pactIdToBytes32 } from "@/lib/escrow-contract";

type LockFundsInput = {
  pactId: string;
  counterpartyWallet: `0x${string}`;
  amountEth: number;
};

export function useEscrowContract() {
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const chainId = useChainId();

  const lockFunds = async ({ pactId, counterpartyWallet, amountEth }: LockFundsInput): Promise<`0x${string}`> => {
    const contractAddress = ESCROW_CONTRACT_ADDRESSES[chainId];
    if (!contractAddress) {
      throw new Error(`No escrow contract deployed on chain ${chainId}. Switch to Flow EVM Testnet or Base Sepolia.`);
    }
    const ESCROW_CONTRACT_ADDRESS = contractAddress;

    if (!publicClient) {
      throw new Error("Public client unavailable.");
    }

    if (amountEth <= 0) {
      throw new Error("Amount must be greater than zero.");
    }

    const txHash = await writeContractAsync({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: escrowContractAbi,
      functionName: "lockFunds",
      args: [pactIdToBytes32(pactId), counterpartyWallet],
      value: parseEther(String(amountEth)),
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  };

  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const contractAddress = ESCROW_CONTRACT_ADDRESSES[chainId];
  const contractReady = !!contractAddress && contractAddress !== ZERO_ADDRESS;

  return { lockFunds, isPending, contractReady };
}
