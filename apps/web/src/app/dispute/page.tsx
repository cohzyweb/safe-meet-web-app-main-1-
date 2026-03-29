"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ExternalLink, ArrowLeft } from "lucide-react";
import { PageFrame } from "@/components/page-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { usePact } from "@/hooks/usePacts";

export default function DisputePage() {
  const searchParams = useSearchParams();
  const pactId = searchParams.get("pactId") ?? undefined;

  const { data: pact, isLoading, isError, refetch } = usePact(pactId);

  return (
    <PageFrame activeHref="/history">
      <section className="section-wrap space-y-6">
        <header className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        </header>

        {!pactId && (
          <Card className="bg-surface text-white">
            <CardHeader className="items-center py-12 text-center">
              <AlertTriangle className="mb-3 h-10 w-10 text-error" />
              <CardTitle className="font-headline text-2xl font-bold">No pact specified</CardTitle>
              <CardDescription className="text-on-surface-variant">
                A pactId query param is required.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {pactId && (
          <>
            {/* Status banner */}
            <div className="flex items-center gap-3 rounded-xl border border-error/30 bg-error/10 px-5 py-4">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-error" />
              <div>
                <p className="font-semibold text-error">This pact is under dispute</p>
                <p className="mt-0.5 text-sm text-on-surface-variant">
                  One party rejected the proof. Both parties should contact each other to resolve.
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Pact details */}
              <Card className="bg-surface text-white">
                <CardHeader>
                  <Badge className="w-fit rounded-full bg-error/20 px-3 py-1 text-xs uppercase tracking-[0.14em] text-error">
                    Disputed
                  </Badge>
                  <CardTitle className="mt-3 font-headline text-3xl font-bold">Pact Details</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  {isError && (
                    <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
                      Failed to load pact.{" "}
                      <button onClick={() => refetch()} className="underline">Retry</button>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-outline-variant/30 bg-surface-high p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">Type</p>
                      <p className="mt-1 font-semibold text-white">
                        {isLoading ? "—" : pact?.type ?? "—"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-outline-variant/30 bg-surface-high p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">Value at stake</p>
                      <p className="mt-1 font-headline text-2xl font-bold text-white">
                        {isLoading ? "—" : pact?.asset.amountFormatted ?? "—"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-outline-variant/30 bg-surface-high p-4 space-y-2 text-sm">
                    <div>
                      <span className="text-on-surface-variant">Creator: </span>
                      <span className="font-mono text-white">{isLoading ? "—" : pact?.creatorWallet}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant">Counterparty: </span>
                      <span className="font-mono text-white">{isLoading ? "—" : pact?.counterpartyWallet}</span>
                    </div>
                  </div>

                  {pact?.goalDescription && (
                    <div className="rounded-lg border border-outline-variant/30 bg-surface-high p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">Goal</p>
                      <p className="mt-1 text-sm text-white">{pact.goalDescription}</p>
                    </div>
                  )}

                  {pact?.itemName && (
                    <div className="rounded-lg border border-outline-variant/30 bg-surface-high p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">Item</p>
                      <p className="mt-1 text-sm text-white">{pact.itemName}</p>
                      {pact.itemDescription && (
                        <p className="mt-1 text-xs text-on-surface-variant">{pact.itemDescription}</p>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-on-surface-variant">
                    Pact ID: <span className="font-mono">{pactId}</span>
                  </p>
                </CardContent>
              </Card>

              {/* Proof + resolution */}
              <Card className="bg-surface text-white">
                <CardHeader>
                  <Badge className="w-fit rounded-full bg-surface-high px-3 py-1 text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                    Submitted proof
                  </Badge>
                  <CardTitle className="mt-3 font-headline text-3xl font-bold">Evidence</CardTitle>
                  <CardDescription className="text-on-surface-variant">
                    The proof that was rejected by the counterparty.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="h-24 w-full animate-pulse rounded-lg bg-surface-high" />
                  ) : pact?.proofUrl ? (
                    <>
                      <div className="rounded-lg border border-outline-variant/30 bg-surface-high p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-on-surface-variant mb-2">Proof URL</p>
                        <a
                          href={pact.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-secondary-container underline underline-offset-2"
                        >
                          View proof <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      {pact.proofSubmittedAt && (
                        <p className="text-xs text-on-surface-variant">
                          Submitted: {new Date(pact.proofSubmittedAt).toLocaleString()}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-on-surface-variant">No proof was submitted.</p>
                  )}

                  <Separator className="bg-outline-variant/20" />

                  <div className="rounded-xl border border-outline-variant/30 bg-surface-high p-5 space-y-2">
                    <p className="font-semibold text-white">How to resolve</p>
                    <ul className="space-y-1.5 text-sm text-on-surface-variant list-disc list-inside">
                      <li>Contact the other party directly to discuss the dispute.</li>
                      <li>If you reach an agreement, one party cancels the pact.</li>
                      <li>Keep all evidence and communication for your records.</li>
                    </ul>
                  </div>

                  <Link
                    href="/history"
                    className="flex h-11 w-full items-center justify-center rounded-lg bg-surface-high text-sm font-bold text-white hover:bg-surface-highest"
                  >
                    View in History
                  </Link>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </section>
    </PageFrame>
  );
}
