"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageFrame } from "@/components/page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePact, useSubmitProof } from "@/hooks/usePacts";

export default function SubmitProofPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pactId = searchParams.get("pactId") ?? undefined;

  const { data: pact, isLoading } = usePact(pactId);
  const submitProof = useSubmitProof();
  const [proofUrl, setProofUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pactId || !proofUrl.trim()) return;

    try {
      await submitProof.mutateAsync({ id: pactId, proofUrl: proofUrl.trim() });
      toast.success("Proof submitted! Awaiting referee judgment.");
      router.push(`/judgment-room?pactId=${pactId}`);
    } catch {
      toast.error("Failed to submit proof. Please try again.");
    }
  };

  return (
    <PageFrame activeHref="/create">
      <section className="section-wrap max-w-2xl">
        <Card className="bg-surface text-white">
          <CardHeader>
            <CardTitle className="font-headline text-4xl font-bold">Submit Proof</CardTitle>
            <CardDescription className="text-on-surface-variant">
              Provide a URL to evidence of goal completion. The referee will review it before judgment.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Goal summary */}
            {pact && !isLoading && (
              <div className="rounded-lg border border-outline-variant/25 bg-surface-high p-4 text-sm text-on-surface-variant">
                <p>
                  <span className="font-medium text-white">Goal: </span>
                  {pact.goalDescription ?? pact.itemName ?? "—"}
                </p>
                <p className="mt-1">
                  <span className="font-medium text-white">Stake: </span>
                  {pact.asset.amountFormatted}
                </p>
                {pact.goalDeadline && (
                  <p className="mt-1">
                    <span className="font-medium text-white">Deadline: </span>
                    {new Date(pact.goalDeadline).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {/* No pactId */}
            {!pactId && (
              <p className="text-sm text-on-surface-variant">
                No pact ID provided. Navigate here from your waiting room.
              </p>
            )}

            {/* Proof URL form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                  Proof URL
                </label>
                <Input
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://... (image, video, GitHub link, etc.)"
                  type="url"
                  className="h-11 border-outline-variant/40 bg-surface-high text-white placeholder:text-on-surface-variant"
                  disabled={!pactId}
                />
                <p className="text-xs text-on-surface-variant">
                  Link to an image, Loom video, GitHub commit, or any public evidence.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="h-11 flex-1 rounded-lg border-outline-variant/40 bg-surface-high text-white hover:bg-surface-highest"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={!pactId || !proofUrl.trim() || submitProof.isPending}
                  className="h-11 flex-1 rounded-lg bg-primary-container text-sm font-bold text-white hover:bg-primary-container/90"
                >
                  {submitProof.isPending ? "Submitting..." : "Submit Proof"}
                </Button>
              </div>
            </form>

            {/* Error state */}
            {submitProof.isError && (
              <p className="text-sm text-error">
                Submission failed. Make sure the URL is valid and your wallet is connected.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </PageFrame>
  );
}
