"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { isAddress } from "viem";
import { Lock, Target, ArrowRight, CheckCircle, Info } from "lucide-react";
import { PageFrame } from "@/components/page-frame";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAttachOnchainTx, useCreatePact } from "@/hooks/usePacts";
import { useWallet } from "@/components/providers";
import { useEscrowContract } from "@/hooks/useEscrowContract";
import { ESCROW_CONTRACT_ADDRESSES } from "@/lib/escrow-contract";
import { useEnsResolve } from "@/hooks/useEnsResolve";
import { useChainId } from "wagmi";
import { CreateTradePactBodySchema } from "@safe-meet/shared";
import type { CreateTradePactBody } from "@safe-meet/shared";

const ASSET_OPTIONS = ["ETH", "USDC", "DAI"] as const;

const TRADE_STEPS = [
  { icon: Lock, label: "Funds locked on-chain", desc: "Your collateral is held by a smart contract — not us." },
  { icon: ArrowRight, label: "Share pact link", desc: "Send the link to your counterparty via WhatsApp or Telegram." },
  { icon: CheckCircle, label: "Meet and scan QR", desc: "At handoff, buyer scans seller's QR code to release escrow instantly." },
];

const GOAL_STEPS = [
  { icon: Lock, label: "Stake collateral", desc: "Lock funds as a commitment to your goal." },
  { icon: ArrowRight, label: "Assign a referee", desc: "Choose someone you trust to verify your proof." },
  { icon: CheckCircle, label: "Submit proof", desc: "Show evidence — referee approves or rejects." },
];

export default function CreatePage() {
  const router = useRouter();
  const { walletAddress } = useWallet();
  const createPact = useCreatePact();
  const attachOnchainTx = useAttachOnchainTx();
  const { lockFunds, isPending: contractPending, contractReady } = useEscrowContract();
  const chainId = useChainId();
  const [tradeExpanded, setTradeExpanded] = useState(false);
  const { resolve: resolveEns, resolving: ensResolving } = useEnsResolve();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTradePactBody>({
    resolver: zodResolver(CreateTradePactBodySchema),
    defaultValues: {
      type: "TRADE",
      assetSymbol: "ETH",
    },
  });

  const handleStartGoal = () => {
    router.push("/create/goal");
  };

  const onTradeSubmit = async (data: CreateTradePactBody) => {
    try {
      // Resolve ENS name to address if needed
      let counterparty = data.counterpartyWallet;
      if (!isAddress(counterparty)) {
        const resolved = await resolveEns(counterparty);
        if (!resolved) {
          toast.error("Could not resolve wallet address. Enter a valid 0x address or .eth name.");
          return;
        }
        counterparty = resolved;
      }
      const pact = await createPact.mutateAsync({ ...data, counterpartyWallet: counterparty });

      if (contractReady && isAddress(counterparty)) {
        try {
          const txHash = await lockFunds({
            pactId: pact.id,
            counterpartyWallet: counterparty as `0x${string}`,
            amountEth: data.assetAmount,
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

      toast.success("Trade pact created!");
      router.push(`/escrow/waiting-room?pactId=${pact.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create pact");
    }
  };

  return (
    <PageFrame activeHref="/create">
      <motion.section
        className="section-wrap space-y-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.3 }}
      >
        <header className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
            New Pact
          </p>
          <h1 className="mt-3 font-headline text-5xl font-bold text-white sm:text-6xl">
            Create a Pact
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-on-surface-variant">
            Choose what kind of agreement you want to protect — a physical trade or a personal goal.
          </p>
        </header>

        {/* Wallet required banner */}
        {!walletAddress && (
          <div className="mx-auto max-w-lg rounded-2xl border border-primary-container/40 bg-surface p-8 text-center shadow-[0_0_50px_-20px_#7d56fe]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <Lock className="h-5 w-5" />
            </div>
            <p className="font-semibold text-white">Wallet not connected</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              You need a wallet to create a pact. Signing in is free and gasless — no transaction needed.
            </p>
            <Link
              href="/connect"
              className="mt-5 inline-flex h-11 items-center rounded-xl bg-primary-container px-8 text-sm font-bold text-white hover:bg-primary-container/90"
            >
              Connect Wallet to Continue
            </Link>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Trade Escrow card */}
          <Card className="relative overflow-hidden bg-surface text-white">
            <div className="sm-glow -top-28 -right-24 h-56 w-56 bg-primary-container/25" />

            {/* Overlay when not connected */}
            {!walletAddress && (
              <div className="absolute inset-0 z-10 flex items-end justify-center rounded-[inherit] bg-surface/60 backdrop-blur-[2px] pb-8">
                <Link
                  href="/connect"
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-primary/30 bg-surface px-5 text-sm font-bold text-primary hover:bg-primary/10"
                >
                  <Lock className="h-3.5 w-3.5" /> Connect to unlock
                </Link>
              </div>
            )}

            <CardHeader>
              <div className="mb-1 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <Lock className="h-4 w-4" />
                </div>
                <CardDescription className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                  Trade Escrow
                </CardDescription>
              </div>
              <CardTitle className="font-headline text-3xl font-bold">Sell or Buy Safely</CardTitle>
              <CardDescription className="text-on-surface-variant">
                Lock funds before meeting. Release only when you physically receive the item — via a one-time QR scan. No trust required.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Mini how-it-works */}
              {!tradeExpanded && (
                <div className="space-y-2 rounded-xl border border-white/6 bg-surface-high p-4">
                  {TRADE_STEPS.map((s) => {
                    const Icon = s.icon;
                    return (
                      <div key={s.label} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Icon className="h-3 w-3" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{s.label}</p>
                          <p className="text-xs text-on-surface-variant">{s.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!tradeExpanded ? (
                <Button
                  onClick={() => setTradeExpanded(true)}
                  disabled={!walletAddress}
                  className="h-11 w-full rounded-lg bg-primary-container px-6 text-sm font-bold text-white hover:bg-primary-container/90"
                >
                  Start Trade Pact
                </Button>
              ) : (
                <form onSubmit={handleSubmit(onTradeSubmit)} className="space-y-4">
                  <input type="hidden" {...register("type")} value="TRADE" />

                  {/* Counterparty wallet */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                      Counterparty Wallet
                    </label>
                    <Input
                      {...register("counterpartyWallet")}
                      placeholder="0x… or name.eth"
                      className="h-10 border-outline-variant/40 bg-surface-high text-white placeholder:text-on-surface-variant"
                    />
                    <p className="flex items-center gap-1 text-[11px] text-on-surface-variant">
                      <Info className="h-3 w-3" />
                      The wallet address of the person you&apos;re trading with
                    </p>
                    {errors.counterpartyWallet && (
                      <p className="text-xs text-error">{errors.counterpartyWallet.message}</p>
                    )}
                  </div>

                  {/* Item name */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                      Item Name
                    </label>
                    <Input
                      {...register("itemName")}
                      placeholder="e.g. MacBook Pro M2"
                      className="h-10 border-outline-variant/40 bg-surface-high text-white placeholder:text-on-surface-variant"
                    />
                    {errors.itemName && (
                      <p className="text-xs text-error">{errors.itemName.message}</p>
                    )}
                  </div>

                  {/* Item description */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                      Description (optional)
                    </label>
                    <textarea
                      {...register("itemDescription")}
                      placeholder="Brief description of the item..."
                      rows={2}
                      className="w-full rounded-md border border-outline-variant/40 bg-surface-high px-3 py-2 text-sm text-white placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                      Meetup Location (optional)
                    </label>
                    <Input
                      {...register("location")}
                      placeholder="e.g. Starbucks Downtown"
                      className="h-10 border-outline-variant/40 bg-surface-high text-white placeholder:text-on-surface-variant"
                    />
                  </div>

                  {/* Scheduled at */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                      Meetup Time (optional)
                    </label>
                    <Input
                      {...register("scheduledAt")}
                      type="datetime-local"
                      className="h-10 border-outline-variant/40 bg-surface-high text-white"
                    />
                  </div>

                  {/* Asset symbol + amount */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                      Escrow Amount
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        {...register("assetSymbol")}
                        className="h-10 w-full rounded-md border border-outline-variant/40 bg-surface-high px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {ASSET_OPTIONS.map((sym) => (
                          <option key={sym} value={sym}>
                            {sym}
                          </option>
                        ))}
                      </select>
                      <Input
                        {...register("assetAmount", { valueAsNumber: true })}
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.0"
                        className="h-10 border-outline-variant/40 bg-surface-high text-white placeholder:text-on-surface-variant"
                      />
                    </div>
                    <p className="flex items-center gap-1 text-[11px] text-on-surface-variant">
                      <Info className="h-3 w-3" />
                      This amount is locked on-chain until the QR handshake is complete
                    </p>
                    {errors.assetAmount && (
                      <p className="text-xs text-error">{errors.assetAmount.message}</p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setTradeExpanded(false)}
                      className="h-11 flex-1 rounded-lg border-outline-variant/40 bg-surface-high text-white hover:bg-surface-highest"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!walletAddress || createPact.isPending || contractPending || attachOnchainTx.isPending || ensResolving}
                      className="h-11 flex-1 rounded-lg bg-primary-container text-sm font-bold text-white hover:bg-primary-container/90"
                    >
                      {ensResolving ? "Resolving..." : createPact.isPending || contractPending || attachOnchainTx.isPending ? "Creating..." : "Create Pact"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Goal Pact card */}
          <Card className="relative overflow-hidden bg-surface text-white">
            <div className="sm-glow -top-28 -right-24 h-56 w-56 bg-secondary-container/25" />

            {/* Overlay when not connected */}
            {!walletAddress && (
              <div className="absolute inset-0 z-10 flex items-end justify-center rounded-[inherit] bg-surface/60 backdrop-blur-[2px] pb-8">
                <Link
                  href="/connect"
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-secondary-container/30 bg-surface px-5 text-sm font-bold text-secondary-container hover:bg-secondary-container/10"
                >
                  <Lock className="h-3.5 w-3.5" /> Connect to unlock
                </Link>
              </div>
            )}

            <CardHeader>
              <div className="mb-1 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-secondary-container/20 bg-secondary-container/10 text-secondary-container">
                  <Target className="h-4 w-4" />
                </div>
                <CardDescription className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                  Goal Pact
                </CardDescription>
              </div>
              <CardTitle className="font-headline text-3xl font-bold">Commit to a Goal</CardTitle>
              <CardDescription className="text-on-surface-variant">
                Stake funds on your own promise. Assign a referee to review your proof — they decide whether you get your stake back.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Mini how-it-works */}
              <div className="space-y-2 rounded-xl border border-white/6 bg-surface-high p-4">
                {GOAL_STEPS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary-container/10 text-secondary-container">
                        <Icon className="h-3 w-3" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">{s.label}</p>
                        <p className="text-xs text-on-surface-variant">{s.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                onClick={handleStartGoal}
                disabled={!walletAddress}
                className="h-11 w-full rounded-lg bg-secondary-container px-6 text-sm font-bold text-white hover:bg-secondary-container/90"
              >
                Start Goal Pact
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Bottom explainer */}
        <div className="rounded-2xl border border-white/8 bg-surface p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
            How pacts work
          </p>
          <div className="grid gap-4 sm:grid-cols-3 text-sm text-on-surface-variant">
            <p><span className="font-semibold text-white">Non-custodial.</span> Your funds go directly into a smart contract — SafeMeet never holds your money.</p>
            <p><span className="font-semibold text-white">Gasless sign-in.</span> Connecting your wallet is free. Gas is only paid when funds are locked or released.</p>
            <p><span className="font-semibold text-white">Cancel anytime.</span> Before your counterparty accepts, you can cancel and get your funds back immediately.</p>
          </div>
        </div>
      </motion.section>
    </PageFrame>
  );
}
