"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAddress } from "viem";
import { PageFrame } from "@/components/page-frame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAttachOnchainTx, useCreatePact } from "@/hooks/usePacts";
import { useProfile } from "@/hooks/useProfile";
import { useWallet } from "@/components/providers";
import { useEscrowContract } from "@/hooks/useEscrowContract";
import { ESCROW_CONTRACT_ADDRESSES } from "@/lib/escrow-contract";
import { useEnsResolve } from "@/hooks/useEnsResolve";
import { useChainId } from "wagmi";

// ------------------------------------------------------------
// Zod form schema
// ------------------------------------------------------------

const CreateGoalSchema = z.object({
  goalDescription: z.string().min(10, "Please describe your goal in at least 10 characters"),
  assetSymbol: z.enum(["ETH", "USDC", "DAI"]),
  assetAmount: z.string().min(1, "Amount is required"),
  counterpartyWallet: z
    .string()
    .min(5, "Enter a valid wallet address or ENS name")
    .regex(/^(0x[a-fA-F0-9]{40}|.+\.eth)$/, "Must be a valid 0x address or .eth name"),
  goalDeadline: z.string().min(1, "Please set a deadline"),
});

type CreateGoalForm = z.infer<typeof CreateGoalSchema>;

// ------------------------------------------------------------
// Create Goal Page
// ------------------------------------------------------------

export default function CreateGoalPage() {
  const router = useRouter();
  const { walletAddress } = useWallet();
  const createPact = useCreatePact();
  const attachOnchainTx = useAttachOnchainTx();
  const { lockFunds, isPending: contractPending, contractReady } = useEscrowContract();
  const chainId = useChainId();
  const { data: profile } = useProfile(walletAddress ?? undefined);
  const { resolve: resolveEns, resolving: ensResolving } = useEnsResolve();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateGoalForm>({
    resolver: zodResolver(CreateGoalSchema),
    defaultValues: {
      assetSymbol: "ETH",
    },
  });

  const onSubmit = async (data: CreateGoalForm) => {
    if (!walletAddress) return;
    const amount = parseFloat(data.assetAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid stake amount.");
      return;
    }
    try {
      // Resolve ENS name to address if needed
      let referee = data.counterpartyWallet;
      if (!isAddress(referee)) {
        const resolved = await resolveEns(referee);
        if (!resolved) {
          toast.error("Could not resolve referee address. Enter a valid 0x address or .eth name.");
          return;
        }
        referee = resolved;
      }

      const pact = await createPact.mutateAsync({
        type: "GOAL",
        goalDescription: data.goalDescription,
        goalDeadline: new Date(data.goalDeadline).toISOString(),
        counterpartyWallet: referee,
        assetSymbol: data.assetSymbol,
        assetAmount: amount,
      });

      if (contractReady && isAddress(referee)) {
        try {
          const txHash = await lockFunds({
            pactId: pact.id,
            counterpartyWallet: referee as `0x${string}`,
            amountEth: amount,
          });
          await attachOnchainTx.mutateAsync({
            id: pact.id,
            txHash,
            contractAddress: ESCROW_CONTRACT_ADDRESSES[chainId]!,
          });
        } catch {
          toast.warning("On-chain lock skipped — pact saved off-chain.");
        }
      }

      toast.success("Goal pact created!");
      router.push(`/escrow/waiting-room?pactId=${pact.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create pact.";
      toast.error(message);
    }
  };

  return (
    <PageFrame activeHref="/create">
      <section className="section-wrap grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <header className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Commitment flow</p>
            <h1 className="font-headline text-4xl font-bold text-white">Create Goal Pact</h1>
            <p className="text-on-surface-variant">
              Lock a stake, define a deadline, and assign a referee.
            </p>
          </header>

          {!walletAddress && (
            <p className="text-sm text-on-surface-variant">
              Connect your wallet to create a goal pact.
            </p>
          )}

          <Card className="bg-surface text-white">
            <CardContent className="space-y-5 pt-6">

              {/* Goal description */}
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                  Goal description
                </span>
                <Textarea
                  {...register("goalDescription")}
                  className="min-h-32 border-outline-variant/40 bg-surface-high text-white placeholder:text-on-surface-variant"
                  placeholder="Run 50 miles this week"
                />
                {errors.goalDescription && (
                  <p className="text-xs text-error">{errors.goalDescription.message}</p>
                )}
              </label>

              {/* Asset + Amount */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                    Asset
                  </span>
                  <Controller
                    name="assetSymbol"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-11 w-full border-outline-variant/40 bg-surface-high text-white">
                          <SelectValue placeholder="Select asset" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ETH">ETH</SelectItem>
                          <SelectItem value="USDC">USDC</SelectItem>
                          <SelectItem value="DAI">DAI</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                    Stake amount
                  </span>
                  <Input
                    {...register("assetAmount")}
                    className="h-11 border-outline-variant/40 bg-surface-high text-white placeholder:text-on-surface-variant"
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                  />
                  {errors.assetAmount && (
                    <p className="text-xs text-error">{errors.assetAmount.message}</p>
                  )}
                </label>
              </div>

              {/* Referee wallet */}
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                  Referee wallet
                </span>
                <Input
                  {...register("counterpartyWallet")}
                  className="h-11 border-outline-variant/40 bg-surface-high text-white placeholder:text-on-surface-variant"
                  placeholder="0x... or name.eth"
                  type="text"
                />
                {errors.counterpartyWallet && (
                  <p className="text-xs text-error">{errors.counterpartyWallet.message}</p>
                )}
              </label>

              {/* Deadline */}
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                  Deadline
                </span>
                <Input
                  {...register("goalDeadline")}
                  className="h-11 border-outline-variant/40 bg-surface-high text-white"
                  type="datetime-local"
                />
                {errors.goalDeadline && (
                  <p className="text-xs text-error">{errors.goalDeadline.message}</p>
                )}
              </label>

              {/* API error */}
              {createPact.isError && (
                <p className="text-sm text-error">
                  Failed to create pact. Please try again.
                </p>
              )}

              {/* Submit */}
              <Button
                onClick={handleSubmit(onSubmit)}
                disabled={!walletAddress || createPact.isPending || contractPending || attachOnchainTx.isPending || ensResolving}
                className="h-12 w-full rounded-lg bg-error-container font-headline text-lg font-bold text-white hover:bg-error-container/90"
              >
                {ensResolving ? "Resolving..." : createPact.isPending || contractPending || attachOnchainTx.isPending ? "Staking..." : "Stake My Pride and Crypto"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:col-span-5">
          <Card className="bg-surface text-white">
            <CardHeader>
              <CardTitle className="font-headline text-2xl font-bold">Strict Enforcement</CardTitle>
              <CardDescription className="text-sm leading-relaxed text-on-surface-variant">
                If the referee rejects your proof, funds are redirected by immutable contract logic.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-surface text-white">
            <CardHeader>
              <CardDescription className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                Trust score
              </CardDescription>
              <CardTitle className="font-headline text-4xl font-bold">
                {profile?.trustScore ? `${profile.trustScore} / 1000` : "— / 1000"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-surface text-white">
            <CardHeader>
              <CardDescription className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                Completed pacts
              </CardDescription>
              <CardTitle className="font-headline text-4xl font-bold">
                {profile?.completedPacts ?? "—"}
              </CardTitle>
            </CardHeader>
          </Card>
        </aside>
      </section>
    </PageFrame>
  );
}
