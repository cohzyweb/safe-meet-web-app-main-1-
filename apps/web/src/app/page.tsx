"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Lock, QrCode, ShieldCheck, ArrowRight, Zap, Users, Target, CheckCircle } from "lucide-react";
import { PageFrame } from "@/components/page-frame";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardApi } from "@/lib/api/endpoints";
import type { DashboardStats } from "@/lib/types";

function useGlobalStats() {
  return useQuery<DashboardStats, Error>({
    queryKey: ["global-stats"],
    queryFn: () => dashboardApi.getGlobalStats(),
    staleTime: 60_000,
    retry: 1,
  });
}

const FEATURES = [
  {
    icon: Lock,
    title: "Trade Escrow",
    description: "Lock funds before meeting. Release with a QR-code handshake — no blind trust.",
  },
  {
    icon: Target,
    title: "Goal Pacts",
    description: "Stake collateral on your own commitments. A referee judges proof and decides the outcome.",
  },
  {
    icon: QrCode,
    title: "Trustless Handshake",
    description: "QR codes are signed, expiring, and single-use. Pact completes on scan automatically.",
  },
];

const FLOW = [
  {
    step: "01",
    icon: Users,
    title: "Create A Pact",
    text: "Define terms, counterparties, and amount. Lock collateral on Base Sepolia.",
  },
  {
    step: "02",
    icon: ArrowRight,
    title: "Share & Accept",
    text: "Send the pact link via WhatsApp or Telegram. Counterparty connects and accepts.",
  },
  {
    step: "03",
    icon: CheckCircle,
    title: "Verify & Complete",
    text: "Scan QR at handoff for trades. Submit proof for goals — referee decides.",
  },
];

function IPhoneStatusBar() {
  return (
    <div
      className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6"
      style={{ height: 50 }}
    >
      {/* Time */}
      <span className="text-[13px] font-semibold text-white" style={{ letterSpacing: "0.01em" }}>
        9:41
      </span>
      {/* Right icons — signal, wifi, battery */}
      <div className="flex items-center gap-1">
        {/* Cellular signal */}
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
          <rect x="0" y="9" width="3" height="3" rx="0.5" fill="white" />
          <rect x="4.5" y="6" width="3" height="6" rx="0.5" fill="white" />
          <rect x="9" y="3" width="3" height="9" rx="0.5" fill="white" />
          <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="white" />
        </svg>
        {/* WiFi */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path d="M8 10.5a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5z" fill="white" transform="translate(0,-2)" />
          <path d="M5.05 9.05a4.24 4.24 0 015.9 0" stroke="white" strokeWidth="1.3" strokeLinecap="round" transform="translate(0,-2)" />
          <path d="M2.1 6.1a8.49 8.49 0 0111.8 0" stroke="white" strokeWidth="1.3" strokeLinecap="round" transform="translate(0,-2)" />
        </svg>
        {/* Battery */}
        <svg width="27" height="12" viewBox="0 0 27 12" fill="none">
          <rect x="0" y="0.5" width="22" height="11" rx="2" stroke="white" strokeOpacity="0.35" strokeWidth="1" />
          <rect x="1.5" y="2" width="19" height="8" rx="1" fill="white" />
          <path d="M23 4v4a2 2 0 000-4z" fill="white" fillOpacity="0.4" />
        </svg>
      </div>
    </div>
  );
}

function IPhoneMockup() {
  /* ---------- dimensions based on iPhone 15 Pro proportions ---------- */
  const phoneWidth = 272;
  const frameThickness = 4;
  const screenWidth = phoneWidth - frameThickness * 2;
  const screenAspect = 2556 / 1179;            // iPhone 15 Pro native
  const screenHeight = screenWidth * screenAspect;
  const phoneHeight = screenHeight + frameThickness * 2;
  const outerRadius = 52;
  const innerRadius = outerRadius - frameThickness;

  return (
    <div className="relative flex h-full min-h-[520px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-surface-high py-10">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-96 w-80 rounded-full bg-primary-container/20 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Phone body */}
        <div
          className="relative"
          style={{
            width: phoneWidth,
            height: phoneHeight,
            borderRadius: outerRadius,
            /* Titanium frame — multi-layer to simulate metal */
            background: "linear-gradient(160deg, #48484a 0%, #2c2c2e 25%, #1c1c1e 50%, #2c2c2e 75%, #3a3a3c 100%)",
            boxShadow: [
              "0 0 0 0.5px rgba(255,255,255,0.12)",                       // highlight edge
              "inset 0 1px 0 rgba(255,255,255,0.15)",                      // top bevel
              "inset 0 -1px 0 rgba(0,0,0,0.3)",                           // bottom bevel
              "0 40px 100px -20px rgba(0,0,0,0.95)",                       // deep shadow
              "0 6px 24px -4px rgba(0,0,0,0.7)",                          // mid shadow
            ].join(", "),
          }}
        >
          {/* ── Side buttons ── */}
          {/* Silent switch (left) */}
          <div
            className="absolute"
            style={{
              left: -2.5,
              top: 100,
              width: 3,
              height: 18,
              borderRadius: "2px 0 0 2px",
              background: "linear-gradient(180deg, #48484a 0%, #2c2c2e 100%)",
              boxShadow: "-1px 0 2px rgba(0,0,0,0.5)",
            }}
          />
          {/* Volume up (left) */}
          <div
            className="absolute"
            style={{
              left: -2.5,
              top: 140,
              width: 3,
              height: 36,
              borderRadius: "2px 0 0 2px",
              background: "linear-gradient(180deg, #48484a 0%, #2c2c2e 100%)",
              boxShadow: "-1px 0 2px rgba(0,0,0,0.5)",
            }}
          />
          {/* Volume down (left) */}
          <div
            className="absolute"
            style={{
              left: -2.5,
              top: 186,
              width: 3,
              height: 36,
              borderRadius: "2px 0 0 2px",
              background: "linear-gradient(180deg, #48484a 0%, #2c2c2e 100%)",
              boxShadow: "-1px 0 2px rgba(0,0,0,0.5)",
            }}
          />
          {/* Power button (right) */}
          <div
            className="absolute"
            style={{
              right: -2.5,
              top: 154,
              width: 3,
              height: 50,
              borderRadius: "0 2px 2px 0",
              background: "linear-gradient(180deg, #48484a 0%, #2c2c2e 100%)",
              boxShadow: "1px 0 2px rgba(0,0,0,0.5)",
            }}
          />

          {/* ── Screen ── */}
          <div
            className="absolute overflow-hidden"
            style={{
              top: frameThickness,
              left: frameThickness,
              width: screenWidth,
              height: screenHeight,
              borderRadius: innerRadius,
              background: "#000",
            }}
          >
            {/* iOS status bar */}
            <IPhoneStatusBar />

            {/* Dynamic Island */}
            <div
              className="absolute z-30"
              style={{
                top: 10,
                left: "50%",
                transform: "translateX(-50%)",
                width: 120,
                height: 34,
                borderRadius: 20,
                background: "#000",
              }}
            >
              {/* Front camera dot */}
              <div
                className="absolute"
                style={{
                  right: 20,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "radial-gradient(circle at 40% 40%, #1a1a2e 0%, #0a0a12 100%)",
                  boxShadow: "inset 0 0 2px rgba(255,255,255,0.08)",
                }}
              />
            </div>

            {/* App screenshot */}
            <Image
              src="/illustrations/handshake-mobile.png"
              alt="SafeMeet QR handshake flow on iPhone"
              width={390}
              height={844}
              className="w-full"
              style={{ display: "block" }}
              priority
            />
          </div>
        </div>

        {/* Caption */}
        <p className="mt-5 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
          Live on Flow EVM & Base Sepolia
        </p>

        {/* Feature pills */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {[
            { icon: QrCode, label: "QR Handshake" },
            { icon: ShieldCheck, label: "Non-custodial" },
            { icon: Zap, label: "Instant release" },
          ].map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-surface px-3 py-1 text-[11px] font-medium text-on-surface-variant"
            >
              <Icon className="h-3 w-3 text-primary" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { data: stats } = useGlobalStats();

  const statCards = [
    { label: "TVL", value: stats ? stats.totalValueLockedFormatted : "—", accent: "text-primary" },
    { label: "Active Escrows", value: stats ? String(stats.activeEscrows) : "—", accent: "text-secondary-container" },
    { label: "Completed Trades", value: stats ? String(stats.completedTrades) : "—", accent: "text-emerald-400" },
    { label: "Awaiting Verification", value: stats ? String(stats.awaitingVerification) : "—", accent: "text-amber-400" },
  ];

  return (
    <PageFrame activeHref={undefined}>
      <section className="section-wrap space-y-14 pb-10">

        {/* ── Hero ── */}
        <div className="grid items-stretch gap-5 lg:grid-cols-2">
          <div className="flex flex-col justify-center space-y-6 rounded-2xl border border-white/10 bg-surface p-6 sm:p-10">
            <Badge className="w-fit rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs tracking-[0.2em] text-primary hover:bg-primary/10">
              SafeMeet Protocol · Base Sepolia
            </Badge>
            <h1 className="font-headline text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Escrow For<br />
              <span className="text-primary">High-Stakes</span><br />
              Trades & Pacts
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-on-surface-variant sm:text-base">
              Lock collateral before you meet. Release only after a signed QR handshake or referee approval. No blind trust — ever.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/connect"
                className={buttonVariants({ className: "h-11 rounded-xl px-7 font-bold text-sm" })}
              >
                <Zap className="mr-2 h-4 w-4" />
                Launch App
              </Link>
              <Link
                href="/how-it-works"
                className={buttonVariants({ variant: "outline", className: "h-11 rounded-xl px-7 font-bold text-sm" })}
              >
                How It Works
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center gap-4 border-t border-white/8 pt-5">
              {["Gasless sign-in", "Non-custodial", "Open source"].map((item) => (
                <span key={item} className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <IPhoneMockup />
        </div>

        {/* ── How it flows ── */}
        <div>
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.25em] text-on-surface-variant">
            Three steps to trustless completion
          </p>
          <div className="relative grid gap-5 md:grid-cols-3">
            {/* Connector line (desktop) */}
            <div className="absolute left-[33%] right-[33%] top-8 hidden h-px bg-gradient-to-r from-white/0 via-white/15 to-white/0 md:block" />

            {FLOW.map((step) => {
              const Icon = step.icon;
              return (
                <Card key={step.step} className="relative bg-surface text-white">
                  <CardHeader className="pb-3">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-mono text-3xl font-bold text-white/10">{step.step}</span>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-surface-high text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <CardTitle className="font-headline text-lg font-bold">{step.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed text-on-surface-variant">
                      {step.text}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ── Live stats ── */}
        <div>
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.25em] text-on-surface-variant">
            Live protocol stats
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map(({ label, value, accent }) => (
              <Card key={label} className="bg-surface text-white">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">
                    {label}
                  </CardDescription>
                  <CardTitle className={`font-headline text-3xl font-bold ${accent}`}>
                    {value}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Feature highlights ── */}
        <div>
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.25em] text-on-surface-variant">
            Protocol features
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.title} className="group bg-surface text-white transition-colors hover:border-white/20">
                  <CardHeader>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="font-headline text-xl font-bold">{f.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed text-on-surface-variant">
                      {f.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ── CTA banner ── */}
        <div className="relative overflow-hidden rounded-2xl border border-primary-container/30 bg-surface p-8 text-center shadow-[0_0_60px_-20px_#7d56fe] sm:p-12">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-64 w-64 rounded-full bg-primary-container/15 blur-3xl" />
          </div>
          <div className="relative z-10 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              Ready to meet safely?
            </p>
            <h2 className="font-headline text-3xl font-bold text-white sm:text-4xl">
              No trust required.<br />Just a wallet and a pact.
            </h2>
            <p className="mx-auto max-w-md text-sm text-on-surface-variant">
              Create your first escrow pact in under two minutes. Built on Base Sepolia for the Base Buildathon.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                href="/connect"
                className={buttonVariants({ className: "h-11 rounded-xl px-8 font-bold text-sm" })}
              >
                Get Started Free
              </Link>
              <Link
                href="/how-it-works"
                className={buttonVariants({ variant: "outline", className: "h-11 rounded-xl px-8 font-bold text-sm" })}
              >
                See the flow
              </Link>
            </div>
          </div>
        </div>

      </section>
    </PageFrame>
  );
}
