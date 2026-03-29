"use client";

import Link from "next/link";
import { Handshake, History, LayoutDashboard, Lock, ShieldCheck } from "lucide-react";
import { LogoIcon } from "@/components/logo-icon";
import { useWallet } from "@/components/providers";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Active Escrows", icon: LayoutDashboard },
  { href: "/history", label: "History", icon: History },
  { href: "/create", label: "Escrow Flows", icon: Handshake },
  { href: "/settings", label: "Security Vault", icon: Lock },
];

export type SideNavProps = {
  activeHref: string | undefined;
};

export function SideNav({ activeHref }: SideNavProps) {
  const { walletAddress } = useWallet();
  const profileHref = walletAddress ? `/profile/${walletAddress}` : "/settings";

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/8 bg-background/95 pt-[72px] xl:block">
      <div className="flex h-full flex-col px-4 py-6">
        <div className="mb-8 flex items-center gap-3 rounded-xl border border-white/8 bg-surface px-3 py-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-container/20 text-primary-container">
            <LogoIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="font-headline text-sm font-bold text-white">Protocol V2.1</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
              Immutable Ledger
            </p>
          </div>
        </div>

        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
                  activeHref === item.href
                    ? "bg-surface-high text-white"
                    : "text-on-surface-variant hover:bg-surface hover:text-on-surface"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <Link
            href="/create"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-container text-sm font-bold text-white transition hover:bg-primary-container/90 active:scale-95"
          >
            <ShieldCheck className="h-4 w-4" />
            New Escrow
          </Link>
          <Link
            href={profileHref}
            className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-outline-variant/30 bg-surface text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant transition hover:text-white"
          >
            Public Profile
          </Link>
        </div>
      </div>
    </aside>
  );
}
