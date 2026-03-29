"use client";

import Link from "next/link";
import { Users, Share2, CheckCircle, Lock, QrCode, ShieldCheck, ArrowRight } from "lucide-react";
import { PageFrame } from "@/components/page-frame";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

const STEPS = [
  {
    step: "01",
    icon: Users,
    title: "Create a Pact",
    text: "Connect your wallet and define the pact terms: trade or goal, amount, counterparty address, and deadline. Collateral is locked into the smart contract on Base Sepolia.",
    detail: "No gas surprises — you sign a SIWE message first, then one on-chain transaction to lock funds.",
    color: "text-primary",
    borderColor: "border-primary/30",
    bgColor: "bg-primary/10",
    glowColor: "shadow-[0_0_30px_-12px_#7d56fe]",
  },
  {
    step: "02",
    icon: Share2,
    title: "Share & Accept",
    text: "Share the unique pact link over WhatsApp, Telegram, or any channel. The counterparty connects their wallet, reviews terms, and accepts — locking their side of the deal.",
    detail: "Both parties must commit before anything moves. No single party controls the outcome.",
    color: "text-secondary-container",
    borderColor: "border-secondary-container/30",
    bgColor: "bg-secondary-container/10",
    glowColor: "shadow-[0_0_30px_-12px_#3892f8]",
  },
  {
    step: "03",
    icon: CheckCircle,
    title: "Verify & Complete",
    text: "For trades: scan the signed QR code at handoff — the contract releases funds instantly. For goal pacts: submit proof and your designated referee judges the outcome.",
    detail: "QR codes are signed, expiring, and single-use. Referee decisions are final on-chain.",
    color: "text-emerald-400",
    borderColor: "border-emerald-400/30",
    bgColor: "bg-emerald-400/10",
    glowColor: "shadow-[0_0_30px_-12px_#34d399]",
  },
];

const PACT_TYPES = [
  {
    icon: Lock,
    title: "Trade Escrow",
    description: "You're selling a phone, car, or item in person. Both parties lock equal collateral. Whoever backs out loses their stake. Scan QR at exchange to release.",
    tag: "For sellers & buyers",
    tagColor: "text-primary bg-primary/10 border-primary/20",
  },
  {
    icon: QrCode,
    title: "Goal Pact",
    description: "Stake ETH on a personal commitment — fitness goal, study target, business milestone. Choose a referee who will verify your proof before funds are released.",
    tag: "For accountability",
    tagColor: "text-secondary-container bg-secondary-container/10 border-secondary-container/20",
  },
];

export default function HowItWorksPage() {
  return (
    <PageFrame activeHref={undefined}>
      <section className="section-wrap space-y-16 pb-10">

        {/* Header */}
        <header className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-on-surface-variant">
            Protocol Overview
          </p>
          <h1 className="font-headline text-4xl font-bold text-white sm:text-5xl">
            How SafeMeet Works
          </h1>
          <p className="mx-auto max-w-lg text-sm leading-relaxed text-on-surface-variant sm:text-base">
            Three steps from pact creation to trustless completion. No middlemen, no blind trust.
          </p>
        </header>

        {/* Steps */}
        <div className="space-y-5">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.step} className="grid gap-5 lg:grid-cols-[auto_1fr]">
                {/* Step number + connector */}
                <div className="hidden flex-col items-center lg:flex">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${step.borderColor} ${step.bgColor} ${step.color} ${step.glowColor}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="mt-3 h-full min-h-[2rem] w-px bg-gradient-to-b from-white/15 to-transparent" />
                  )}
                </div>

                {/* Content */}
                <Card className={`bg-surface text-white ${step.glowColor}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${step.borderColor} ${step.bgColor} ${step.color} lg:hidden`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <CardDescription className={`text-xs font-bold uppercase tracking-[0.2em] ${step.color}`}>
                        Step {step.step}
                      </CardDescription>
                    </div>
                    <CardTitle className="font-headline text-2xl font-bold">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm leading-relaxed text-on-surface-variant">{step.text}</p>
                    <div className="flex items-start gap-2 rounded-lg border border-white/8 bg-surface-high p-3">
                      <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                      <p className="text-xs text-on-surface-variant">{step.detail}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Pact types */}
        <div>
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.25em] text-on-surface-variant">
            Two types of pacts
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            {PACT_TYPES.map((pt) => {
              const Icon = pt.icon;
              return (
                <Card key={pt.title} className="bg-surface text-white">
                  <CardHeader>
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-surface-high text-on-surface-variant">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${pt.tagColor}`}>
                        {pt.tag}
                      </span>
                    </div>
                    <CardTitle className="font-headline text-xl font-bold">{pt.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed text-on-surface-variant">
                      {pt.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="relative overflow-hidden rounded-2xl border border-primary-container/30 bg-surface p-8 text-center shadow-[0_0_60px_-20px_#7d56fe]">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-48 w-48 rounded-full bg-primary-container/15 blur-3xl" />
          </div>
          <div className="relative z-10 space-y-4">
            <h2 className="font-headline text-3xl font-bold text-white">Ready to create a pact?</h2>
            <p className="text-sm text-on-surface-variant">Connect your wallet and go live in under two minutes.</p>
            <Link
              href="/connect"
              className={buttonVariants({ className: "h-11 rounded-xl px-8 font-bold text-sm" })}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Connect Wallet
            </Link>
          </div>
        </div>

      </section>
    </PageFrame>
  );
}
