"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md bg-surface text-white">
        <CardHeader>
          <CardTitle className="font-headline text-2xl font-bold text-error">
            Something went wrong
          </CardTitle>
          <CardDescription className="text-on-surface-variant">
            An unexpected error occurred. We&apos;ve been notified and are working
            to fix it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-error/30 bg-error/10 p-3">
            <p className="text-sm text-error">
              {error.message || "Unknown error"}
            </p>
            {error.digest && (
              <p className="mt-1 text-xs text-error/70">
                Error ID: {error.digest}
              </p>
            )}
          </div>
          <Button
            onClick={reset}
            className="w-full rounded-lg bg-primary-container font-bold text-white hover:bg-primary-container/90"
          >
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
