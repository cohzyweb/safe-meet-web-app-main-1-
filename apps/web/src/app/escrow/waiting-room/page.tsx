"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Share2, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { PageFrame } from "@/components/page-frame";
import { PactTimeline } from "@/components/pact-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePact, useUpdatePactStatus } from "@/hooks/usePacts";
import type { PactStatus } from "@/lib/types";


function statusLabel(status: PactStatus): string {
  const labels: Record<PactStatus, string> = {
    PENDING: "Waiting for Counterparty",
    ACTIVE: "Ready for Meetup",
    PROOF_SUBMITTED: "Proof Under Review",
    COMPLETE: "Complete",
    DISPUTED: "Disputed",
    CANCELLED: "Cancelled",
    EXPIRED: "Expired",
  };
  return labels[status] ?? status;
}

function statusTitle(status: PactStatus): string {
  switch (status) {
    case "PENDING": return "Waiting for Counterparty";
    case "ACTIVE": return "Escrow Funded — Ready to Meet";
    case "PROOF_SUBMITTED": return "Proof Submitted";
    case "COMPLETE": return "Pact Complete";
    case "CANCELLED": return "Pact Cancelled";
    case "EXPIRED": return "Pact Expired";
    default: return "Pact Status";
  }
}

function statusDescription(status: PactStatus): string {
  switch (status) {
    case "PENDING": return "Share the pact link with your counterparty. Once they accept and lock their funds, the pact becomes active.";
    case "ACTIVE": return "Both sides have locked funds. Proceed to the in-person meetup and complete the handshake to release escrow.";
    case "PROOF_SUBMITTED": return "Your proof has been submitted. The referee will review and make a decision.";
    case "COMPLETE": return "The pact has been completed and funds released successfully.";
    case "CANCELLED": return "This pact was cancelled. Any locked funds have been refunded.";
    case "EXPIRED": return "This pact expired before completion.";
    default: return "";
  }
}

function FieldSkeleton() {
  return <div className="mt-2 h-6 w-32 animate-pulse rounded bg-surface-highest" />;
}


export default function WaitingRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pactId = searchParams.get("pactId") ?? undefined;

  const { data: pact, isLoading, isError, refetch } = usePact(pactId);
  const updateStatus = useUpdatePactStatus();

  const shareUrl = typeof window !== "undefined" && pactId
    ? `${window.location.origin}/pact/${pactId}`
    : "";

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Pact link copied to clipboard");
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`You've been invited to a SafeMeet pact. Accept here: ${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleShareTelegram = () => {
    const text = encodeURIComponent(`You've been invited to a SafeMeet pact. Accept here:`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`, "_blank");
  };

  const handleGoToMeetup = () => {
    if (!pactId) return;
    router.push(`/escrow/handshake?pactId=${pactId}`);
  };

  const handleCancelRefund = async () => {
    if (!pactId) return;
    try {
      await updateStatus.mutateAsync({ id: pactId, status: "CANCELLED" });
      toast.success("Pact cancelled.");
      router.push("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to cancel pact.";
      toast.error(message);
    }
  };

  const currentStatus = pact?.status;

  return (
    <PageFrame activeHref="/create">
      <section className="section-wrap max-w-3xl space-y-6">

        {/* Status header */}
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Pact Status</p>
          <h1 className="mt-3 font-headline text-4xl font-bold text-white sm:text-5xl">
            {isLoading ? "Loading..." : currentStatus ? statusTitle(currentStatus) : "Your Pact"}
          </h1>
          {currentStatus && (
            <p className="mx-auto mt-3 max-w-lg text-sm text-on-surface-variant">
              {statusDescription(currentStatus)}
            </p>
          )}
        </div>

        <Card className="overflow-hidden bg-surface text-white">
          <CardHeader className="border-b border-outline-variant/20 bg-surface-high">
            {pact ? <PactTimeline status={pact.status} /> : null}
            <CardDescription className="mt-4 text-on-surface-variant">
              {isLoading ? "Loading pact details..." : `Pact ID: ${pactId ?? "—"}`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 p-7">
            {/* Error state */}
            {isError && (
              <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
                Failed to load pact details.{" "}
                <button onClick={() => refetch()} className="underline">Retry</button>
              </div>
            )}

            {/* No pactId state */}
            {!pactId && (
              <p className="text-sm text-on-surface-variant">
                No pact ID found. Navigate here from a pact detail page.
              </p>
            )}

            {/* ── Your next step callout ── */}
            {pact && pact.status === "PENDING" && (
              <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4">
                <Share2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="font-semibold text-white">Next step: Share this pact</p>
                    <p className="mt-0.5 text-sm text-on-surface-variant">
                      Your counterparty needs to accept before funds are locked. Send them the link below.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 rounded-lg bg-primary-container text-xs font-bold text-white hover:bg-primary-container/90"
                      onClick={handleCopyLink}
                    >
                      Copy Pact Link
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-lg border-green-500/40 bg-transparent text-xs font-bold text-green-400 hover:bg-green-500/10"
                      onClick={handleShareWhatsApp}
                    >
                      Share via WhatsApp
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-lg border-sky-500/40 bg-transparent text-xs font-bold text-sky-400 hover:bg-sky-500/10"
                      onClick={handleShareTelegram}
                    >
                      Share via Telegram
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {pact && pact.status === "ACTIVE" && pact.type === "TRADE" && (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
                <div>
                  <p className="font-semibold text-white">Next step: Go to your meetup</p>
                  <p className="mt-0.5 text-sm text-on-surface-variant">
                    Both parties have locked funds. When you&apos;re face-to-face, the seller generates a QR code and the buyer scans it to complete the transfer.
                  </p>
                </div>
              </div>
            )}

            {pact && pact.status === "ACTIVE" && pact.type === "GOAL" && (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
                <div>
                  <p className="font-semibold text-white">Next step: Complete your goal and submit proof</p>
                  <p className="mt-0.5 text-sm text-on-surface-variant">
                    Once you&apos;ve achieved your goal, submit evidence (a link, screenshot, or note). Your referee will review and release your stake.
                  </p>
                </div>
              </div>
            )}

            {pact && pact.status === "PROOF_SUBMITTED" && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
                <div>
                  <p className="font-semibold text-white">Waiting for referee decision</p>
                  <p className="mt-0.5 text-sm text-on-surface-variant">
                    Your proof is under review. The referee will approve or reject it. You&apos;ll be notified when a decision is made.
                  </p>
                </div>
              </div>
            )}

            {pact && (pact.status === "CANCELLED" || pact.status === "EXPIRED") && (
              <div className="flex items-start gap-3 rounded-xl border border-outline-variant/30 bg-surface-high p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-on-surface-variant" />
                <div>
                  <p className="font-semibold text-white">This pact is no longer active</p>
                  <p className="mt-0.5 text-sm text-on-surface-variant">
                    Any locked funds have been returned. You can create a new pact from the dashboard.
                  </p>
                </div>
              </div>
            )}

            {/* Pact details */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                  {pact?.type === "GOAL" ? "Goal" : "Item"}
                </p>
                {isLoading ? <FieldSkeleton /> : (
                  <p className="mt-2 text-lg font-semibold text-white">
                    {pact?.itemName ?? pact?.goalDescription ?? "—"}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">Escrow Amount</p>
                {isLoading ? <FieldSkeleton /> : (
                  <p className="mt-2 text-lg font-semibold text-white">
                    {pact?.asset.amountFormatted ?? "—"}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                  {pact?.type === "GOAL" ? "Referee" : "Counterparty"}
                </p>
                {isLoading ? <FieldSkeleton /> : (
                  <p className="mt-2 font-mono text-sm font-semibold text-white break-all">
                    {pact?.counterpartyWallet ?? "—"}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">Status</p>
                {isLoading ? <FieldSkeleton /> : (
                  <Badge className="mt-2 w-fit rounded-full bg-tertiary/20 px-3 py-1 text-xs uppercase tracking-[0.14em] text-tertiary">
                    {pact ? statusLabel(pact.status) : "—"}
                  </Badge>
                )}
              </div>

              {pact?.location && (
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">Meetup Location</p>
                  <p className="mt-2 text-lg font-semibold text-white">{pact.location}</p>
                </div>
              )}

              {pact?.scheduledAt && (
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">Scheduled</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {new Date(pact.scheduledAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="grid gap-3 sm:grid-cols-2">
              {pact?.type === "TRADE" && (
                <Button
                  onClick={handleGoToMeetup}
                  disabled={!pactId || isLoading || pact?.status === "CANCELLED" || pact?.status === "PENDING"}
                  title={pact?.status === "PENDING" ? "Counterparty must accept the pact first" : undefined}
                  className="h-11 rounded-lg bg-primary-container text-sm font-bold text-white hover:bg-primary-container/90 disabled:cursor-not-allowed"
                >
                  {pact?.status === "PENDING" ? "Awaiting Counterparty..." : "Go to Meetup (Generate QR)"}
                </Button>
              )}

              {pact?.type === "GOAL" && (
                <Button
                  onClick={() => router.push(`/submit-proof?pactId=${pactId}`)}
                  disabled={!pactId || pact?.status === "CANCELLED" || pact?.status === "PROOF_SUBMITTED" || pact?.status === "PENDING"}
                  className="h-11 rounded-lg bg-primary-container text-sm font-bold text-white hover:bg-primary-container/90"
                >
                  {pact?.status === "PROOF_SUBMITTED" ? "Proof Submitted — Awaiting Review" : "Submit Proof"}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={handleCancelRefund}
                disabled={updateStatus.isPending || !pactId || pact?.status === "CANCELLED" || pact?.status === "COMPLETE"}
                className="h-11 rounded-lg border-error/40 bg-transparent text-sm font-bold text-error hover:bg-error/10 hover:text-error disabled:opacity-40"
              >
                {updateStatus.isPending ? "Cancelling..." : pact?.status === "COMPLETE" ? "Pact Complete" : "Cancel and Refund"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </PageFrame>
  );
}
