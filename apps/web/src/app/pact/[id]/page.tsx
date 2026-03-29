"use client";

import Link from "next/link";
import { use } from "react";
import { toast } from "sonner";
import { PageFrame } from "@/components/page-frame";
import { PactTimeline } from "@/components/pact-timeline";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePact, useAcceptPact } from "@/hooks/usePacts";
import { useWallet } from "@/components/providers";
import { hasAuthToken } from "@/lib/api/client";
import { getTxExplorerUrl } from "@/lib/chain";

type PactPageProps = {
  params: Promise<{ id: string }>;
};

export default function PublicPactPage({ params }: PactPageProps) {
  const { id } = use(params);
  const { data: pact, isLoading } = usePact(id);
  const acceptPact = useAcceptPact();
  const { walletAddress, isConnected } = useWallet();

  const canAccept = Boolean(
    pact &&
      walletAddress &&
      hasAuthToken() &&
      walletAddress.toLowerCase() === pact.counterpartyWallet.toLowerCase() &&
      pact.status === "PENDING",
  );

  const handleAccept = async () => {
    if (!pact) return;
    try {
      await acceptPact.mutateAsync(pact.id);
      toast.success("Pact accepted. You can continue to waiting room.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to accept pact.";
      toast.error(message);
    }
  };

  return (
    <PageFrame activeHref={undefined}>
      <section className="section-wrap max-w-3xl">
        <Card className="bg-surface text-white">
          <CardHeader>
            <CardTitle className="font-headline text-4xl font-bold">Shared Pact</CardTitle>
            <CardDescription className="text-on-surface-variant">
              Review the pact details and accept if you are the counterparty.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {isLoading ? <p className="text-sm text-on-surface-variant">Loading pact...</p> : null}
            {pact ? (
              <>
                <PactTimeline status={pact.status} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">Type</p>
                    <p className="mt-1 text-sm text-white">{pact.type}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">Status</p>
                    <Badge className="mt-1 bg-surface-high text-white">{pact.status}</Badge>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">Item / Goal</p>
                    <p className="mt-1 text-sm text-white">{pact.itemName ?? pact.goalDescription ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">Amount</p>
                    <p className="mt-1 text-sm text-white">{pact.asset.amountFormatted}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-surface-high p-4 text-xs text-on-surface-variant">
                  Creator: {pact.creatorWallet}
                </div>
                {pact.txHash && (
                  <a href={getTxExplorerUrl(pact.txHash)} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                    View escrow transaction on BaseScan
                  </a>
                )}
                {!isConnected ? (
                  <Link href="/connect" className="text-sm font-semibold text-primary underline-offset-2 hover:underline">
                    Connect wallet to accept this pact
                  </Link>
                ) : null}
                {isConnected && !hasAuthToken() ? (
                  <Link href="/connect" className="text-sm font-semibold text-primary underline-offset-2 hover:underline">
                    Sign in to SafeMeet to accept
                  </Link>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleAccept}
                    disabled={!canAccept || acceptPact.isPending}
                    className="bg-primary-container text-white hover:bg-primary-container/90"
                  >
                    {acceptPact.isPending ? "Accepting..." : "Accept This Pact"}
                  </Button>
                  <Link href={`/escrow/waiting-room?pactId=${id}`} className="inline-flex h-10 items-center rounded-lg border border-white/20 px-4 text-sm">
                    Open Waiting Room
                  </Link>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </PageFrame>
  );
}
