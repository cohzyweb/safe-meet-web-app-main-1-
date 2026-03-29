import { Card, CardContent, CardHeader } from "@/components/ui/card";

function SkeletonCard() {
  return (
    <Card className="bg-surface">
      <CardHeader>
        <div className="h-6 w-32 animate-pulse rounded bg-surface-high" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-surface-high" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-surface-high" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-surface-high" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-surface-high" />
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonStat() {
  return (
    <Card className="bg-surface">
      <CardHeader>
        <div className="h-3 w-24 animate-pulse rounded bg-surface-high" />
        <div className="mt-2 h-8 w-20 animate-pulse rounded bg-surface-high" />
      </CardHeader>
    </Card>
  );
}

export default function Loading() {
  return (
    <div className="section-wrap space-y-8">
      <header className="space-y-2">
        <div className="h-10 w-64 animate-pulse rounded bg-surface-high" />
        <div className="h-5 w-96 animate-pulse rounded bg-surface-high" />
      </header>

      <div className="grid gap-5 md:grid-cols-3">
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>

      <SkeletonCard />
    </div>
  );
}
