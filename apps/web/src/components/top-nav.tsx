"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, Zap, LogOut, Copy, ExternalLink, ChevronDown } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDisconnect } from "wagmi";
import { LogoIcon } from "@/components/logo-icon";
import { NotificationsMenu } from "@/components/notifications-menu";
import { useWallet } from "@/components/providers";
import { hasAuthToken, clearAuthToken } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";

const APP_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/history", label: "History" },
  { href: "/create", label: "Escrow" },
  { href: "/settings", label: "Settings" },
];

const PUBLIC_NAV_ITEMS = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/docs", label: "Docs" },
];

export type TopNavProps = {
  activeHref: string | undefined;
};

function AccountMenu({ walletAddress }: { walletAddress: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { disconnect } = useDisconnect();

  const walletLabel = `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`;

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, handleClickOutside]);

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(walletAddress);
    toast.success("Wallet address copied");
    setOpen(false);
  };

  const handleSignOut = () => {
    clearAuthToken();
    if (typeof window !== "undefined") {
      localStorage.removeItem("safemeet_jwt_wallet");
    }
    disconnect();
    setOpen(false);
    router.push("/");
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface px-3 py-1.5 text-xs text-on-surface-variant transition-colors hover:border-white/20 hover:bg-surface-high"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="font-medium">{walletLabel}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-surface shadow-2xl">
          {/* Header */}
          <div className="border-b border-white/8 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
              Connected Wallet
            </p>
            <p className="mt-1 font-mono text-xs font-medium text-white">{walletLabel}</p>
          </div>

          {/* Actions */}
          <div className="p-1.5">
            <button
              type="button"
              onClick={handleCopyAddress}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-on-surface-variant transition-colors hover:bg-surface-high hover:text-white"
            >
              <Copy className="h-3.5 w-3.5" /> Copy Address
            </button>
            <Link
              href={`/profile/${walletAddress}`}
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-on-surface-variant transition-colors hover:bg-surface-high hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View Profile
            </Link>
          </div>

          {/* Sign out */}
          <div className="border-t border-white/8 p-1.5">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-error transition-colors hover:bg-error/10"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TopNav({ activeHref }: TopNavProps) {
  const { walletAddress, isConnected } = useWallet();
  const [authed, setAuthed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    setAuthed(hasAuthToken());
    const onStorage = () => setAuthed(hasAuthToken());
    window.addEventListener("storage", onStorage);
    // Also poll briefly since localStorage changes in the same tab
    // don't fire the storage event natively
    const poll = setInterval(() => setAuthed(hasAuthToken()), 1000);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(poll);
    };
  }, []);

  // Re-check auth state when wallet changes
  useEffect(() => {
    setAuthed(hasAuthToken());
  }, [walletAddress]);

  const handleMobileSignOut = () => {
    clearAuthToken();
    if (typeof window !== "undefined") {
      localStorage.removeItem("safemeet_jwt_wallet");
    }
    disconnect();
    setMobileOpen(false);
    router.push("/");
  };

  const navItems = authed ? APP_NAV_ITEMS : PUBLIC_NAV_ITEMS;

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-background/85 backdrop-blur-xl">
      <div className="section-wrap flex h-[4.5rem] items-center justify-between gap-6 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-surface-high text-primary-container shadow-[0_0_35px_-18px_#7d56fe]"
          aria-label="SafeMeet home"
        >
          <LogoIcon className="h-6 w-6" />
          <span className="sr-only">SafeMeet</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-semibold tracking-wide transition-colors",
                activeHref === item.href
                  ? "text-primary border-b-2 border-primary pb-1"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop right side */}
        <div className="hidden items-center gap-3 md:flex">
          {authed && walletAddress ? (
            <>
              <NotificationsMenu />
              <AccountMenu walletAddress={walletAddress} />
            </>
          ) : isConnected ? (
            <>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface px-3 py-1 text-xs text-on-surface-variant">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                {walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "Connected"}
              </span>
              <Link
                href="/connect"
                className={buttonVariants({ className: "h-9 rounded-lg px-5 text-sm font-bold" })}
              >
                Sign In
              </Link>
            </>
          ) : (
            <Link
              href="/connect"
              className={buttonVariants({ className: "h-9 rounded-lg px-5 text-sm font-bold" })}
            >
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              Launch App
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-surface text-white md:hidden"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-white/8 bg-background/95 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "text-sm font-semibold",
                  activeHref === item.href ? "text-primary" : "text-on-surface-variant"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 space-y-3">
            {authed && walletAddress ? (
              <>
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-surface px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="font-mono text-xs text-white">
                      {`${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleMobileSignOut}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-error/30 bg-error/10 px-4 py-2.5 text-sm font-bold text-error"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </>
            ) : isConnected ? (
              <Link
                href="/connect"
                onClick={() => setMobileOpen(false)}
                className={buttonVariants({ className: "w-full justify-center text-sm font-bold" })}
              >
                Sign In
              </Link>
            ) : (
              <Link
                href="/connect"
                onClick={() => setMobileOpen(false)}
                className={buttonVariants({ className: "w-full justify-center text-sm font-bold" })}
              >
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                Launch App
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
