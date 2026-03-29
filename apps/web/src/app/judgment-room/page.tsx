"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Scale, CheckCircle2, XCircle, Info } from "lucide-react";
import { PageFrame } from "@/components/page-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { usePact, useUpdatePactStatus } from "@/hooks/usePacts";


function ValueSkeleton() {
  return <div className="mt-2 h-9 w-28 animate-pulse rounded bg-surface-highest" />;
}


function DeadlineDisplay({ deadline }: { deadline: string | undefined }) {
  if (!deadline) return <p className="mt-2 font-headline text-3xl font-bold text-on-surface-variant">—</p>;

  const date = new Date(deadline);
  const isExpired = date < new Date();

  return (
    <p className={`mt-2 font-headline text-3xl font-bold ${isExpired ? "text-error" : "text-white"}`}>
      {isExpired ? "Expired" : date.toLocaleDateString()}
    </p>
  );
}


export default function JudgmentRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pactId = searchParams.get("pactId") ?? undefined;

  const { data: pact, isLoading, isError, refetch } = usePact(pactId);
  const updateStatus = useUpdatePactStatus();
  const [imageFailed, setImageFailed] = useState(false);

  const handleApprove = async () => {
    if (!pactId) return;
    await updateStatus.mutateAsync({ id: pactId, status: "COMPLETE" });
    router.push("/dashboard");
  };

  const handleReject = async () => {
    if (!pactId) return;
    await updateStatus.mutateAsync({ id: pactId, status: "DISPUTED" });
    router.push(`/dispute?pactId=${pactId}`);
  };

  return (
    <PageFrame activeHref="/create">
      <section className="section-wrap space-y-6">

        {/* Page header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <Scale className="h-6 w-6" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Referee Panel</p>
          <h1 className="mt-3 font-headline text-4xl font-bold text-white sm:text-5xl">Review & Decide</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-on-surface-variant">
            You have been assigned as referee for this goal pact. Review the submitted proof and decide whether the goal was achieved.
          </p>
        </div>

        {/* Role explainer */}
        <div className="mx-auto max-w-2xl rounded-xl border border-white/8 bg-surface p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <div className="text-sm text-on-surface-variant">
              <span className="font-semibold text-white">Your role: </span>
              As the referee, your decision is final. If you approve, the creator&apos;s staked funds are returned to them. If you reject, the funds are sent to the counterparty as a penalty. Review carefully before deciding.
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">

          {/* Evidence panel */}
          <Card className="bg-surface text-white">
            <CardHeader>
              <Badge className="w-fit rounded-full bg-surface-high px-3 py-1 text-xs uppercase tracking-[0.14em] text-primary">
                Submitted Proof
              </Badge>
              <CardTitle className="mt-3 font-headline text-3xl font-bold">Evidence</CardTitle>
              <CardDescription className="mt-2 text-on-surface-variant">
                Review the proof submitted by the goal creator before making your decision.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {isError && (
                <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
                  Failed to load proof.{" "}
                  <button onClick={() => refetch()} className="underline">Retry</button>
                </div>
              )}

              {/* Goal description */}
              <div>
                <p className="mb-1 text-xs uppercase tracking-[0.12em] text-on-surface-variant">Goal Description</p>
                <div className="rounded-lg border border-outline-variant/30 bg-surface-high p-4 text-sm italic text-on-surface-variant">
                  {isLoading ? (
                    <div className="h-4 w-full animate-pulse rounded bg-surface-highest" />
                  ) : (
                    pact?.goalDescription ?? pact?.itemName ?? "No description provided."
                  )}
                </div>
              </div>

              {/* Proof URL */}
              <div>
                <p className="mb-1 text-xs uppercase tracking-[0.12em] text-on-surface-variant">Proof Link</p>
                <div className="rounded-lg border border-outline-variant/30 bg-surface-high p-4 text-sm text-secondary-container">
                  {isLoading ? (
                    <div className="h-4 w-48 animate-pulse rounded bg-surface-highest" />
                  ) : pact?.proofUrl ? (
                    <a
                      href={pact.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      {pact.proofUrl}
                    </a>
                  ) : (
                    <span className="text-on-surface-variant">No proof URL submitted</span>
                  )}
                </div>
              </div>

              {/* Proof image */}
              {pact?.proofUrl && pact.proofUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                <div>
                  <p className="mb-1 text-xs uppercase tracking-[0.12em] text-on-surface-variant">Proof Image</p>
                  <div className="aspect-video overflow-hidden rounded-lg border border-outline-variant/30 bg-surface-high">
                    {!imageFailed ? (
                      <img
                        src={pact.proofUrl}
                        alt="Proof"
                        className="h-full w-full object-cover"
                        onError={() => setImageFailed(true)}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <a href={pact.proofUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white">
                          Open Link ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Proof submitted timestamp */}
              {pact?.proofSubmittedAt && (
                <p className="text-xs text-on-surface-variant">
                  Submitted: {new Date(pact.proofSubmittedAt).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Decision panel */}
          <Card className="bg-surface text-white">
            <CardHeader>
              <Badge className="w-fit rounded-full bg-surface-high px-3 py-1 text-xs uppercase tracking-[0.14em] text-tertiary">
                Your Decision
              </Badge>
              <CardTitle className="mt-3 font-headline text-3xl font-bold">Approve or Reject</CardTitle>
              <CardDescription className="text-on-surface-variant">
                This action is final and cannot be undone.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-outline-variant/30 bg-surface-high p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">
                    Staked Amount
                  </p>
                  {isLoading ? <ValueSkeleton /> : (
                    <p className="mt-2 font-headline text-3xl font-bold text-white">
                      {pact?.asset.amountFormatted ?? "—"}
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-outline-variant/30 bg-surface-high p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">
                    Deadline
                  </p>
                  {isLoading ? <ValueSkeleton /> : (
                    <DeadlineDisplay deadline={pact?.goalDeadline} />
                  )}
                </div>
              </div>

              {/* Creator info */}
              {pact && (
                <div className="mt-4 rounded-lg border border-outline-variant/20 bg-surface-high p-3 text-sm text-on-surface-variant">
                  <p><span className="font-medium text-white">Goal creator:</span> {pact.creatorWallet}</p>
                  <p className="mt-1"><span className="font-medium text-white">Current status:</span> {pact.status}</p>
                </div>
              )}

              <Separator className="my-6 bg-outline-variant/20" />

              {/* Decision buttons with consequences */}
              <div className="space-y-3">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-on-surface-variant">
                  <span className="font-semibold text-emerald-400">Approve:</span> The goal was achieved. The creator&apos;s stake is returned to them.
                </div>
                <Button
                  onClick={handleApprove}
                  disabled={updateStatus.isPending || !pactId || pact?.status === "COMPLETE"}
                  className="h-12 w-full rounded-lg bg-emerald-600 font-headline text-base font-bold text-white hover:bg-emerald-500"
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  {updateStatus.isPending ? "Processing..." : "Approve — Goal Achieved"}
                </Button>

                <div className="rounded-lg border border-error/20 bg-error/5 p-3 text-xs text-on-surface-variant">
                  <span className="font-semibold text-error">Reject:</span> The goal was NOT achieved. The stake is forfeited to the counterparty.
                </div>
                <Button
                  variant="outline"
                  onClick={handleReject}
                  disabled={updateStatus.isPending || !pactId || pact?.status === "DISPUTED"}
                  className="h-12 w-full rounded-lg border-error/40 bg-transparent font-headline text-base font-bold text-error hover:bg-error/10 hover:text-error"
                >
                  <XCircle className="mr-2 h-5 w-5" />
                  {updateStatus.isPending ? "Processing..." : "Reject — Goal Not Met"}
                </Button>
              </div>

              {/* Success feedback */}
              {updateStatus.isSuccess && (
                <p className="mt-3 text-center text-sm text-emerald-400">
                  Decision submitted. Redirecting...
                </p>
              )}

              {/* Error feedback */}
              {updateStatus.isError && (
                <p className="mt-3 text-center text-sm text-error">
                  Failed to submit decision. Please try again.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </PageFrame>
  );
}
