"use client";

import { use } from "react";
import { PageFrame } from "@/components/page-frame";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";
import { usePacts } from "@/hooks/usePacts";
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
    <Badge className={`rounded-full px-2 py-0.5 text-xs ${styles[status]}`}>
      {labels[status]}
    </Badge>
  );
}


function StatSkeleton() {
  return (
    <Card className="bg-surface text-white">
      <CardHeader className="pb-2">
        <div className="h-3 w-20 animate-pulse rounded bg-surface-high" />
        <div className="mt-2 h-9 w-24 animate-pulse rounded bg-surface-high" />
      </CardHeader>
    </Card>
  );
}

function ActivitySkeleton() {
  return (
    <div className="rounded-lg border border-outline-variant/25 bg-surface-high p-4">
      <div className="h-4 w-36 animate-pulse rounded bg-surface-highest" />
      <div className="mt-2 h-3 w-20 animate-pulse rounded bg-surface-highest" />
    </div>
  );
}


type ProfilePageProps = {
  params: Promise<{ wallet: string }>;
};

export default function ProfilePage({ params }: ProfilePageProps) {
  const { wallet } = use(params);

  const { data: profile, isLoading: profileLoading, isError: profileError, refetch } = useProfile(wallet);
  const { data: pacts, isLoading: pactsLoading } = usePacts({ wallet, page: 1, limit: 6 });

  const recentPacts = pacts ?? [];

  return (
    <PageFrame activeHref={undefined}>
      <section className="section-wrap space-y-8">

        {/* Profile header */}
        <Card className="bg-surface text-white">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-4">
              <Avatar className="h-16 w-16 rounded-xl">
                <AvatarImage src={profile?.avatarUrl ?? ""} />
                <AvatarFallback>{wallet.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <Badge className="mb-2 rounded-full bg-surface-high text-xs uppercase tracking-[0.14em] text-primary">
                  Public profile
                </Badge>
                <CardTitle className="font-headline text-4xl font-bold">
                  {profile?.displayName ?? wallet}
                </CardTitle>
                <CardDescription className="mt-2 font-mono text-sm text-on-surface-variant">
                  {wallet}
                </CardDescription>
              </div>

              {profileError && (
                <Button
                  onClick={() => refetch()}
                  className="ml-auto rounded-lg bg-primary-container text-sm font-bold text-white"
                >
                  Retry
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Stats */}
        <div className="grid gap-5 md:grid-cols-3">
          {profileLoading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <Card className="bg-surface text-white">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                    Trade success
                  </CardDescription>
                  <CardTitle className="font-headline text-4xl font-bold">
                    {profile ? `${profile.successRate}%` : "—"}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-surface text-white">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                    Completed pacts
                  </CardDescription>
                  <CardTitle className="font-headline text-4xl font-bold">
                    {profile?.completedPacts ?? "—"}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-surface text-white">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                    Trust score
                  </CardDescription>
                  <CardTitle className="font-headline text-4xl font-bold">
                    {profile?.trustScore ?? "—"}
                  </CardTitle>
                </CardHeader>
              </Card>
            </>
          )}
        </div>

        {/* Recent activity */}
        <Card className="bg-surface text-white">
          <CardHeader>
            <CardTitle className="font-headline text-2xl font-bold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {pactsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => <ActivitySkeleton key={i} />)}
              </div>
            ) : recentPacts.length === 0 ? (
              <p className="py-8 text-center text-sm text-on-surface-variant">
                This wallet has no trades yet.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recentPacts.map((pact: Pact) => (
                  <div
                    key={pact.id}
                    className="rounded-lg border border-outline-variant/25 bg-surface-high p-4"
                  >
                    <p className="font-semibold text-white">
                      {pact.itemName ?? pact.goalDescription ?? pact.asset.symbol}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-on-surface-variant">
                        {new Date(pact.createdAt).toLocaleDateString()}
                      </p>
                      <StatusBadge status={pact.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </section>
    </PageFrame>
  );
}
