"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ShieldCheck, Zap, Lock, QrCode, Target } from "lucide-react";
import { useWallet } from "@/components/providers";
import { hasAuthToken } from "@/lib/api/client";
import { PageFrame } from "@/components/page-frame";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CAPABILITIES = [
  {
    icon: Lock,
    title: "Create Escrow Pacts",
    text: "Lock collateral for in-person trades. Funds release on QR scan at handoff.",
  },
  {
    icon: Target,
    title: "Set Goal Pacts",
    text: "Stake ETH on your commitments. A referee verifies your proof and decides.",
  },
  {
    icon: QrCode,
    title: "Trustless QR Handshake",
    text: "Signed, expiring, single-use QR codes. Pact completes on scan — no manual steps.",
  },
];

export default function ConnectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isConnected } = useWallet();
  const returnTo = searchParams.get("returnTo");

  useEffect(() => {
    if (!isConnected) return;
    const timer = setInterval(() => {
      if (hasAuthToken()) {
        clearInterval(timer);
        // Redirect to returnTo if provided, otherwise dashboard
        const destination = returnTo && returnTo.startsWith("/") ? returnTo : "/dashboard";
        router.replace(destination);
      }
    }, 300);
    return () => clearInterval(timer);
  }, [isConnected, router, returnTo]);

  return (
    <PageFrame activeHref={undefined}>
      <section className="section-wrap max-w-5xl space-y-5">

        <div className="grid gap-5 lg:grid-cols-2">

          {/* Connect card */}
          <Card className="flex flex-col bg-surface text-white shadow-[0_0_50px_-15px_#7d56fe]">
            <CardHeader className="pb-4">
              <CardDescription className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Step 1 of 1
              </CardDescription>
              <CardTitle className="font-headline text-3xl font-bold">
                Connect to SafeMeet
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed text-on-surface-variant">
                One gasless sign-in to unlock the full escrow flow.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-5">

              {/* SIWE notice */}
              <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-surface-high p-4">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                <p className="text-sm text-on-surface-variant">
                  You'll sign a gasless <span className="font-semibold text-white">SIWE message</span> to prove wallet ownership. This is not a blockchain transaction — no gas, no cost.
                </p>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                {[
                  "Connect your wallet using the button below.",
                  "Sign the authentication message in your wallet.",
                  "You're redirected to the dashboard automatically.",
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <p className="text-sm text-on-surface-variant">{text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-2">
                <ConnectButton />
              </div>
            </CardContent>
          </Card>

          {/* Capabilities */}
          <div className="flex flex-col gap-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
              What you can do after connecting
            </p>
            {CAPABILITIES.map((cap) => {
              const Icon = cap.icon;
              return (
                <Card key={cap.title} className="bg-surface text-white">
                  <CardHeader className="pb-2">
                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <CardTitle className="font-headline text-lg font-bold">{cap.title}</CardTitle>
                    <CardDescription className="text-sm text-on-surface-variant">{cap.text}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}

            <div className="flex items-center gap-4 rounded-xl border border-white/8 bg-surface-high p-4">
              <Zap className="h-5 w-5 flex-shrink-0 text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-white">Built on Base Sepolia</p>
                <p className="text-xs text-on-surface-variant">Testnet — use free Sepolia ETH from a faucet.</p>
              </div>
            </div>
          </div>
        </div>

      </section>
    </PageFrame>
  );
}
