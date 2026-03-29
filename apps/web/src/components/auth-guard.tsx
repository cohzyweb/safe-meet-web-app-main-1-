"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Wallet } from "lucide-react";
import Link from "next/link";
import { useWallet } from "@/components/providers";
import { hasAuthToken } from "@/lib/api/client";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageFrame } from "@/components/page-frame";

/**
 * AuthGuard — wraps pages that require wallet connection + SIWE auth.
 *
 * Behavior:
 *  - If wallet is not connected AND no JWT stored → shows connect prompt
 *  - If wallet is connected but no JWT → redirects to /connect to trigger SIWE
 *  - If both connected + authed → renders children
 *  - On mount, if JWT exists from a previous session → renders children (JWT is
 *    validated by the API; if it's expired, the 401 interceptor handles redirect)
 */
export function AuthGuard({
  children,
  activeHref,
}: {
  children: React.ReactNode;
  activeHref?: string;
}) {
  const { walletAddress, isConnected } = useWallet();
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const tokenExists = hasAuthToken();

    if (tokenExists) {
      // Has a stored JWT — let the API validate it. The 401 interceptor
      // in client.ts will redirect to /connect if it's actually expired.
      setAuthed(true);
      setChecked(true);
      return;
    }

    if (isConnected && !tokenExists) {
      // Wallet connected but no JWT — send to /connect to run SIWE
      const returnTo = encodeURIComponent(pathname);
      router.replace(`/connect?returnTo=${returnTo}`);
      return;
    }

    // Not connected, no JWT
    setAuthed(false);
    setChecked(true);
  }, [isConnected, walletAddress, router, pathname]);

  // Still checking — show nothing to avoid flash
  if (!checked) return null;

  // Not authenticated — show connect prompt
  if (!authed) {
    const returnTo = encodeURIComponent(pathname);
    return (
      <PageFrame activeHref={activeHref}>
        <div className="section-wrap py-20">
          <div className="mx-auto max-w-md">
            <Card className="bg-surface text-white shadow-[0_0_50px_-20px_#7d56fe]">
              <CardHeader className="items-center text-center py-12">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Wallet className="h-6 w-6" />
                </div>
                <CardTitle className="font-headline text-2xl font-bold">
                  Sign in to continue
                </CardTitle>
                <CardDescription className="mt-2 max-w-sm text-on-surface-variant">
                  This page requires a connected wallet. Sign in with your wallet — it&apos;s free and gasless.
                </CardDescription>
                <Link
                  href={`/connect?returnTo=${returnTo}`}
                  className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary-container px-8 text-sm font-bold text-white hover:bg-primary-container/90"
                >
                  Connect Wallet
                </Link>
              </CardHeader>
            </Card>
          </div>
        </div>
      </PageFrame>
    );
  }

  return <>{children}</>;
}
