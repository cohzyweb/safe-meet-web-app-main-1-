"use client";

import { Clock3, Handshake, ShieldCheck, Wallet, ArrowRight, Share2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PageFrame } from "@/components/page-frame";
import { AuthGuard } from "@/components/auth-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDashboard } from "@/hooks/useDashboard";
import { useHistory } from "@/hooks/useHistory";
import { useWallet } from "@/components/providers";
import type { Pact, PactStatus } from "@/lib/types";


function StatusBadge({ status }: { status: PactStatus }) {
  const styles: Record<PactStatus, string> = {
    COMPLETE: "bg-emerald-500/20 text-emerald-300",
    PENDING: "bg-tertiary/20 text-tertiary",
    ACTIVE: "bg-primary/20 text-primary",
    PROOF_SUBMITTED: "bg-secondary-container/20 text-secondary-container",
    DISPUTED: "bg-error/20 text-error",
    CANCELLED: "bg-error/20 text-error",
    EXPIRED: "bg-outline-variant/20 text-on-surface-variant",
  };

  const labels: Record<PactStatus, string> = {
    COMPLETE: "Complete",
    PENDING: "Pending",
    ACTIVE: "Active",
    PROOF_SUBMITTED: "Proof Submitted",
    DISPUTED: "Disputed",
    CANCELLED: "Cancelled",
    EXPIRED: "Expired",
  };

  return (
    <Badge className={`rounded-full px-3 py-1 text-xs ${styles[status]}`}>
      {labels[status]}
    </Badge>
  );
}


function StatCardSkeleton() {
  return (
    <Card className="bg-surface text-white">
      <CardHeader>
        <div className="h-3 w-24 animate-pulse rounded bg-surface-high" />
        <div className="mt-2 h-9 w-32 animate-pulse rounded bg-surface-high" />
        <div className="mt-2 h-3 w-20 animate-pulse rounded bg-surface-high" />
      </CardHeader>
    </Card>
  );
}

function PactCardSkeleton() {
  return (
    <Card className="bg-surface-high text-white">
      <CardHeader className="space-y-3">
        <div className="h-5 w-40 animate-pulse rounded bg-surface-highest" />
        <div className="h-3 w-24 animate-pulse rounded bg-surface-highest" />
        <div className="h-3 w-32 animate-pulse rounded bg-surface-highest" />
      </CardHeader>
      <CardContent>
        <div className="h-11 w-full animate-pulse rounded-lg bg-surface-highest" />
      </CardContent>
    </Card>
  );
}


function EmptyPacts() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <img src="/illustrations/flat-source-03.svg" alt="No active escrows" className="mb-6 w-full max-w-xl rounded-xl border border-white/10" />
      <ShieldCheck className="mb-4 h-10 w-10 text-on-surface-variant" />
      <p className="font-headline text-lg font-bold text-white">No active pacts yet</p>
      <p className="mt-1 text-sm text-on-surface-variant">
        Create a trade escrow or goal pact to get started.
      </p>
      <Link href="/create" className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary-container px-5 text-sm font-bold text-white">
        Create Your First Pact <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function PactCard({ pact }: { pact: Pact }) {
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/pact/${pact.id}`
    : `/pact/${pact.id}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Pact link copied");
  };

  return (
    <Card className="bg-surface-high text-white">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="font-headline text-xl font-bold">
                {pact.itemName ?? pact.goalDescription ?? "Unnamed Pact"}
              </CardTitle>
              <StatusBadge status={pact.status} />
            </div>
            <CardDescription className="mt-1 text-xs font-mono text-on-surface-variant truncate max-w-[200px]">
              {pact.counterpartyWallet}
            </CardDescription>
          </div>
          <Badge className="flex-shrink-0 rounded-full bg-surface-highest px-3 py-1 text-xs text-white">
            {pact.asset.amountFormatted}
          </Badge>
        </div>

        <div className="space-y-1.5 text-sm text-on-surface-variant">
          {pact.location && <p>📍 {pact.location}</p>}
          {pact.scheduledAt && (
            <p className="inline-flex items-center gap-2">
              <Clock3 className="h-3.5 w-3.5" />
              {new Date(pact.scheduledAt).toLocaleString()}
            </p>
          )}
        </div>

        {/* Contextual hint */}
        {pact.status === "PENDING" && (
          <p className="rounded-lg border border-tertiary/20 bg-tertiary/5 px-3 py-2 text-xs text-tertiary">
            Waiting for counterparty to accept — share the link so they can join.
          </p>
        )}
        {pact.status === "ACTIVE" && pact.type === "TRADE" && (
          <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            Ready to meet — both sides have locked funds. Go to the meetup to complete.
          </p>
        )}
        {pact.status === "PROOF_SUBMITTED" && (
          <p className="rounded-lg border border-secondary-container/20 bg-secondary-container/5 px-3 py-2 text-xs text-secondary-container">
            Proof submitted — awaiting referee review.
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-2">
        {pact.status === "PENDING" ? (
          <div className="flex gap-2">
            <Button
              onClick={handleCopyLink}
              className="h-10 flex-1 rounded-lg bg-primary-container text-xs font-bold text-white hover:bg-primary-container/90"
            >
              <Share2 className="mr-1.5 h-3.5 w-3.5" /> Copy Share Link
            </Button>
            <Link
              href={`/escrow/waiting-room?pactId=${pact.id}`}
              className="inline-flex h-10 items-center rounded-lg border border-outline-variant/40 bg-surface px-4 text-xs font-bold text-white hover:bg-surface-high"
            >
              View
            </Link>
          </div>
        ) : pact.status === "ACTIVE" && pact.type === "TRADE" ? (
          <Link
            href={`/escrow/handshake?pactId=${pact.id}`}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary-container font-bold text-white hover:bg-primary-container/90"
          >
            Go to Meetup (QR Handshake)
          </Link>
        ) : pact.status === "ACTIVE" && pact.type === "GOAL" ? (
          <Link
            href={`/submit-proof?pactId=${pact.id}`}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary-container font-bold text-white hover:bg-primary-container/90"
          >
            Submit Proof
          </Link>
        ) : (
          <Link
            href={`/escrow/waiting-room?pactId=${pact.id}`}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-outline-variant/40 bg-surface font-bold text-white hover:bg-surface-high"
          >
            View Pact
          </Link>
        )}
      </CardContent>
    </Card>
  );
}


export default function DashboardPage() {
  const { walletAddress } = useWallet();

  const { stats, pending, isLoading, isError, refetch } = useDashboard(walletAddress ?? undefined);

  const { data: historyData, isLoading: historyLoading } = useHistory({
    wallet: walletAddress ?? "",
    page: 1,
    limit: 10,
  });

  const historyRows = historyData?.data ?? [];

  return (
    <AuthGuard activeHref="/dashboard">
    <PageFrame activeHref="/dashboard" showSidebar>
      <section className="section-wrap space-y-8">
        <header className="space-y-2">
          <h1 className="font-headline text-4xl font-bold text-white">My Dashboard</h1>
          <p className="text-on-surface-variant">
            Track your active pacts, meetups, and trade history in one place.
          </p>
        </header>

        {/* Disconnected state — kept as fallback in case AuthGuard allows through with stale token */}
        {!walletAddress && (
          <Card className="bg-surface text-white shadow-[0_0_50px_-20px_#7d56fe]">
            <CardHeader className="items-center text-center py-12">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <Wallet className="h-6 w-6" />
              </div>
              <CardTitle className="font-headline text-2xl font-bold">Connect your wallet to view your dashboard</CardTitle>
              <CardDescription className="mt-2 max-w-sm text-on-surface-variant">
                All your active pacts, escrow balances, and trade history will appear here after you connect.
              </CardDescription>
              <Link
                href="/connect"
                className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary-container px-8 text-sm font-bold text-white hover:bg-primary-container/90"
              >
                Connect Wallet
              </Link>
            </CardHeader>
          </Card>
        )}

        {/* Stat cards */}
        {walletAddress && (
          <>
            <div className="grid gap-5 md:grid-cols-3">
              {isLoading ? (
                <>
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                </>
              ) : isError ? (
                <Card className="bg-surface text-white md:col-span-3">
                  <CardHeader>
                    <CardDescription className="text-error">
                      Failed to load stats.
                    </CardDescription>
                    <Button
                      onClick={refetch}
                      className="mt-2 w-fit rounded-lg bg-primary-container text-sm font-bold text-white"
                    >
                      Retry
                    </Button>
                  </CardHeader>
                </Card>
              ) : (
                <>
                  <Card className="bg-surface text-white">
                    <CardHeader>
                      <CardDescription className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">
                        Total Value Locked
                      </CardDescription>
                      <CardTitle className="font-headline text-4xl font-bold">
                        {stats?.totalValueLockedFormatted ?? "—"}
                      </CardTitle>
                      <div className="inline-flex items-center gap-2 text-xs text-primary">
                        <Wallet className="h-3.5 w-3.5" />
                        {stats ? `+${stats.tvlChangePercent}% this month` : "—"}
                      </div>
                    </CardHeader>
                  </Card>

                  <Card className="bg-surface text-white">
                    <CardHeader>
                      <CardDescription className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">
                        Completed Trades
                      </CardDescription>
                      <CardTitle className="font-headline text-4xl font-bold">
                        {stats?.completedTrades.toLocaleString() ?? "—"}
                      </CardTitle>
                      <div className="inline-flex items-center gap-2 text-xs text-secondary-container">
                        <Handshake className="h-3.5 w-3.5" /> All verified by on-chain escrow
                      </div>
                    </CardHeader>
                  </Card>

                  <Card className="bg-surface text-white">
                    <CardHeader>
                      <CardDescription className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">
                        Active Escrows
                      </CardDescription>
                      <CardTitle className="font-headline text-4xl font-bold">
                        {stats?.activeEscrows ?? "—"}
                      </CardTitle>
                      <div className="inline-flex items-center gap-2 text-xs text-tertiary">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {stats ? `${stats.awaitingVerification} awaiting verification` : "—"}
                      </div>
                    </CardHeader>
                  </Card>
                </>
              )}
            </div>

            {/* Tabs */}
            <Card className="bg-surface p-2 text-white">
              <Tabs defaultValue="pending" className="w-full">
                <CardHeader className="pb-2">
                  <TabsList className="bg-surface-high">
                    <TabsTrigger value="pending">Active Pacts</TabsTrigger>
                    <TabsTrigger value="history">Trade History</TabsTrigger>
                  </TabsList>
                </CardHeader>

                <CardContent>
                  {/* Active pacts tab */}
                  <TabsContent value="pending" className="mt-1">
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h2 className="font-headline text-2xl font-bold text-white">Active Pacts</h2>
                        <p className="text-sm text-on-surface-variant">
                          Pacts that need your attention or are awaiting meetup.
                        </p>
                      </div>
                      <Link
                        href="/create"
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-container px-4 text-xs font-bold text-white hover:bg-primary-container/90"
                      >
                        New Pact <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    {isLoading ? (
                      <div className="grid gap-5 lg:grid-cols-2">
                        <PactCardSkeleton />
                        <PactCardSkeleton />
                      </div>
                    ) : pending.length === 0 ? (
                      <EmptyPacts />
                    ) : (
                      <div className="grid gap-5 lg:grid-cols-2">
                        {pending.map((pact: Pact) => (
                          <PactCard key={pact.id} pact={pact} />
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* History tab */}
                  <TabsContent value="history" className="mt-1">
                    {historyLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-12 w-full animate-pulse rounded bg-surface-high" />
                        ))}
                      </div>
                    ) : historyRows.length === 0 ? (
                      <div className="py-12 text-center text-sm text-on-surface-variant">
                        No completed trades yet.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-outline-variant/20">
                            <TableHead>Date</TableHead>
                            <TableHead>Item / Goal</TableHead>
                            <TableHead>Counterparty</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {historyRows.map((pact: Pact) => (
                            <TableRow key={pact.id} className="border-outline-variant/20">
                              <TableCell>
                                {new Date(pact.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="font-semibold text-white">
                                {pact.itemName ?? pact.asset.symbol}
                              </TableCell>
                              <TableCell className="text-on-surface-variant">
                                {pact.counterpartyWallet}
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={pact.status} />
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {pact.asset.amountFormatted}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </>
        )}
      </section>
    </PageFrame>
    </AuthGuard>
  );
}
