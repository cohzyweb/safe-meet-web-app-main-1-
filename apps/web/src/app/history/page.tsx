"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import { PageFrame } from "@/components/page-frame";
import { AuthGuard } from "@/components/auth-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHistory } from "@/hooks/useHistory";
import { useProfile } from "@/hooks/useProfile";
import { useWallet } from "@/components/providers";
import type { Pact, PactStatus } from "@/lib/types";
import { getTxExplorerUrl } from "@/lib/chain";


function StatusBadge({ status }: { status: PactStatus }) {
  const styles: Record<PactStatus, string> = {
    COMPLETE: "rounded-full bg-emerald-500/20 text-emerald-300",
    PENDING: "rounded-full bg-tertiary/20 text-tertiary",
    ACTIVE: "rounded-full bg-primary/20 text-primary",
    PROOF_SUBMITTED: "rounded-full bg-secondary-container/20 text-secondary-container",
    DISPUTED: "rounded-full bg-error/20 text-error",
    CANCELLED: "rounded-full bg-error/20 text-error",
    EXPIRED: "rounded-full bg-outline-variant/20 text-on-surface-variant",
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
    <Badge className={styles[status]}>{labels[status]}</Badge>
  );
}


function RowSkeleton() {
  return (
    <TableRow className="border-outline-variant/20">
      {[1, 2, 3, 4, 5].map((i) => (
        <TableCell key={i}>
          <div className="h-4 w-24 animate-pulse rounded bg-surface-high" />
        </TableCell>
      ))}
    </TableRow>
  );
}


export default function HistoryPage() {
  const { walletAddress } = useWallet();
  const [search, setSearch] = useState("");
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const currentCursor = cursorStack.length > 0 ? cursorStack[cursorStack.length - 1] : undefined;

  const { data, isLoading, isError, refetch } = useHistory({
    wallet: walletAddress ?? "",
    page: 1,
    limit: 20,
    cursor: currentCursor,
  });

  const { data: profile } = useProfile(walletAddress ?? undefined);

  const rows = data?.data ?? [];


  const filtered = rows.filter((pact: Pact) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      pact.asset.symbol.toLowerCase().includes(q) ||
      pact.counterpartyWallet.toLowerCase().includes(q) ||
      (pact.itemName ?? "").toLowerCase().includes(q) ||
      (pact.txHash ?? "").toLowerCase().includes(q)
    );
  });


  const handleExportCSV = () => {
    if (!filtered.length) return;
    const headers = ["Date", "Asset", "Counterparty", "Status", "Amount"];
    const csvRows = filtered.map((pact: Pact) => [
      new Date(pact.createdAt).toLocaleDateString(),
      pact.itemName ?? pact.asset.symbol,
      pact.counterpartyWallet,
      pact.status,
      pact.asset.amountFormatted,
    ]);
    const csv = [headers, ...csvRows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "safemeet-history.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AuthGuard activeHref="/history">
    <PageFrame activeHref="/history" showSidebar>
      <section className="section-wrap space-y-7">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-headline text-4xl font-bold text-white">Transaction History</h1>
            <p className="mt-2 max-w-2xl text-on-surface-variant">
              Every interaction on the ledger is recorded with cryptographic finality.
            </p>
          </div>

          {/* Stats */}
          <div className="grid min-w-[280px] gap-3 sm:grid-cols-2">
            <Card className="bg-surface text-white">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                  Total Volume
                </CardDescription>
                <CardTitle className="font-headline text-2xl font-bold">
                  {profile ? `$${(profile.completedPacts * 100).toLocaleString()}` : "—"}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-surface text-white">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                  Success Rate
                </CardDescription>
                <CardTitle className="font-headline text-2xl font-bold text-secondary-container">
                  {profile ? `${profile.successRate}%` : "—"}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </header>

        {/* Disconnected state */}
        {!walletAddress && (
          <Card className="bg-surface text-white shadow-[0_0_50px_-20px_#3892f8]">
            <CardHeader className="items-center text-center py-12">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-secondary-container/20 bg-secondary-container/10 text-secondary-container">
                <Download className="h-6 w-6" />
              </div>
              <CardTitle className="font-headline text-2xl font-bold">Connect to view transaction history</CardTitle>
              <CardDescription className="mt-2 max-w-sm text-on-surface-variant">
                Every pact you create or participate in is recorded here with cryptographic finality.
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

        {walletAddress && (
          <Card className="bg-surface text-white">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative min-w-70 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                  <Input
                    placeholder="Search by asset, hash, or counterparty..."
                    className="h-10 border-outline-variant/40 bg-surface-high pl-10 text-white placeholder:text-on-surface-variant"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  className="h-10 rounded-lg border-outline-variant/40 bg-surface-high text-white"
                >
                  All Types
                </Button>
                <Button
                  variant="outline"
                  className="h-10 rounded-lg border-outline-variant/40 bg-surface-high text-white"
                >
                  Past 30 Days
                </Button>
                <Button
                  onClick={handleExportCSV}
                  className="h-10 rounded-lg bg-primary-container text-sm font-bold text-white hover:bg-primary-container/90"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {isError ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-error">Failed to load history.</p>
                  <Button
                    onClick={() => refetch()}
                    className="mt-3 rounded-lg bg-primary-container text-sm font-bold text-white"
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-outline-variant/20">
                        <TableHead>Date</TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead>Counterparty</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <>
                          <RowSkeleton />
                          <RowSkeleton />
                          <RowSkeleton />
                        </>
                      ) : filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-12 text-center text-on-surface-variant">
                            {search ? "No results match your search." : "Your completed trades will appear here."}
                            {!search && (
                              <div className="mt-3">
                                <Link href="/create" className="text-primary hover:underline">Create a pact</Link>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((pact: Pact) => (
                          <TableRow key={pact.id} className="border-outline-variant/20">
                            <TableCell>
                              <p className="font-medium text-white">
                                {new Date(pact.createdAt).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-on-surface-variant">
                                {new Date(pact.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} UTC
                              </p>
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
                            <TableCell className="text-right font-semibold text-white">
                              {pact.asset.amountFormatted}
                              {pact.txHash ? (
                                <div>
                                  <a
                                    href={getTxExplorerUrl(pact.txHash)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-primary hover:underline"
                                  >
                                    tx
                                  </a>
                                </div>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {data && (data.hasMore || cursorStack.length > 0) && (
                    <div className="mt-4 flex justify-center gap-3">
                      <Button
                        variant="outline"
                        className="h-9 rounded-lg border-outline-variant/40 bg-surface-high text-white"
                        disabled={cursorStack.length === 0}
                        onClick={() => setCursorStack((prev) => prev.slice(0, -1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        className="h-9 rounded-lg border-outline-variant/40 bg-surface-high text-white"
                        onClick={() => {
                          if (!data?.nextCursor) return;
                          setCursorStack((prev) => [...prev, data.nextCursor!]);
                        }}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </section>
    </PageFrame>
    </AuthGuard>
  );
}
