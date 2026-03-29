"use client";

import { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import Link from "next/link";
import { Laptop, Shield, Smartphone, X } from "lucide-react";
import { toast } from "sonner";
import { PageFrame } from "@/components/page-frame";
import { AuthGuard } from "@/components/auth-guard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useSettings, useUpdateProfile, useRevokeSession, useTotpSetup, useTotpConfirm, useTotpDisable } from "@/hooks/useSettings";
import { useWallet } from "@/components/providers";
import type { Session } from "@/lib/types";

const AVATAR_STYLES = ["bottts", "pixel-art", "identicon", "shapes", "lorelei"] as const;

function avatarOptions(walletAddress: string): string[] {
  return AVATAR_STYLES.map(
    (style) => `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(walletAddress)}`,
  );
}

// ------------------------------------------------------------
// Session device icon helper
// ------------------------------------------------------------

function SessionIcon({ deviceName }: { deviceName: string | undefined }) {
  const name = deviceName?.toLowerCase() ?? "";

  if (
    name.includes("iphone") ||
    name.includes("android") ||
    name.includes("mobile")
  ) {
    return <Smartphone className="h-4 w-4" />;
  }

  return <Laptop className="h-4 w-4" />;
}

// ------------------------------------------------------------
// Loading skeleton
// ------------------------------------------------------------

function FieldSkeleton() {
  return (
    <div className="h-11 w-full animate-pulse rounded-lg bg-surface-high" />
  );
}

// ------------------------------------------------------------
// Settings Page
// ------------------------------------------------------------

export default function SettingsPage() {
  const { walletAddress } = useWallet();

  const {
    profile,
    sessions = [],
    isLoading,
    isError,
    refetch,
  } = useSettings(walletAddress ?? undefined);

  const updateProfile = useUpdateProfile();
  const revokeSession = useRevokeSession();
  const totpSetup = useTotpSetup();
  const totpConfirm = useTotpConfirm();
  const totpDisable = useTotpDisable();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saved, setSaved] = useState(false);

  // TOTP state
  const [totpStep, setTotpStep] = useState<"idle" | "qr" | "verify" | "disable">("idle");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [totpCode, setTotpCode] = useState("");

  // Populate fields when profile loads
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? "");
      setEmail("");
      setAvatarUrl(profile.avatarUrl ?? "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!walletAddress) return;

    try {
      await updateProfile.mutateAsync({
        wallet: walletAddress,
        displayName,
        email,
        avatarUrl,
      });

      setSaved(true);
      toast.success("Profile updated successfully.");
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to update profile:", err);
      const message = err instanceof Error ? err.message : "Failed to update profile.";
      toast.error(message);
    }
  };

  return (
    <AuthGuard activeHref="/settings">
    <PageFrame activeHref="/settings" showSidebar>
      <section className="section-wrap space-y-7">
        <header>
          <h1 className="font-headline text-4xl font-bold text-white">
            Settings
          </h1>
          <p className="mt-2 text-on-surface-variant">
            Manage cryptographic identity, wallet sessions, and security
            protocols.
          </p>
        </header>

        {/* Disconnected state */}
        {!walletAddress && (
          <Card className="bg-surface text-white">
            <CardHeader className="items-center text-center py-12">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-surface-high text-on-surface-variant">
                <Shield className="h-6 w-6" />
              </div>
              <CardTitle className="font-headline text-2xl font-bold">
                Connect to manage your identity
              </CardTitle>
              <CardDescription className="mt-2 max-w-sm text-on-surface-variant">
                Set your display name, avatar, and view active wallet sessions.
              </CardDescription>
              <Link
                href="/connect"
                className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary-container px-8 text-sm font-bold text-white hover:bg-primary-container/90"
              >
                Connect Wallet
              </Link>
            </CardHeader>
          </Card>
        )}

        {walletAddress && (
          <>
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Identity card */}
              <Card className="bg-surface text-white lg:col-span-8">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-4">
                    <Avatar className="h-16 w-16 rounded-xl">
                      <AvatarImage src={profile?.avatarUrl ?? ""} />
                      <AvatarFallback>
                        {walletAddress.slice(2, 4).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <CardTitle className="font-headline text-2xl font-bold">
                        Identity Details
                      </CardTitle>
                      <CardDescription className="text-on-surface-variant">
                        Update profile metadata synced across SafeMeet.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5">
                  {isError && (
                    <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
                      Failed to load profile.{" "}
                      <button onClick={refetch} className="underline">
                        Retry
                      </button>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                        Display Name
                      </span>

                      {isLoading ? (
                        <FieldSkeleton />
                      ) : (
                        <Input
                          className="h-11 border-outline-variant/40 bg-surface-high text-white"
                          value={displayName}
                          onChange={(e) =>
                            setDisplayName(e.target.value)
                          }
                          placeholder="Your display name"
                        />
                      )}
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                        Wallet
                      </span>

                      <Input
                        className="h-11 border-outline-variant/40 bg-surface-high font-mono text-white"
                        value={walletAddress}
                        readOnly
                      />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">Avatar</span>
                    <div className="grid grid-cols-5 gap-2">
                      {avatarOptions(walletAddress).map((option) => {
                        const selected = avatarUrl === option;
                        return (
                          <button
                            type="button"
                            key={option}
                            onClick={() => setAvatarUrl(option)}
                            className={`overflow-hidden rounded-lg border ${selected ? "border-primary" : "border-outline-variant/30"}`}
                          >
                            <img src={option} alt="avatar option" className="h-14 w-full bg-surface-high object-contain" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Save button */}
                  <Button
                    onClick={handleSave}
                    disabled={updateProfile.isPending || isLoading}
                    className="h-11 rounded-lg bg-primary-container text-sm font-bold text-white hover:bg-primary-container/90"
                  >
                    {updateProfile.isPending
                      ? "Saving..."
                      : saved
                      ? "Saved ✓"
                      : "Save Changes"}
                  </Button>

                  {/* 2FA block */}
                  <div className="rounded-lg border border-outline-variant/30 bg-surface-high p-4 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-on-surface-variant">
                          Two-factor authentication
                        </p>
                        <p className="mt-1 text-lg font-semibold text-white">
                          {profile?.totpEnabled ? "Enabled" : "Not configured"}
                        </p>
                      </div>
                      {profile?.totpEnabled ? (
                        <Badge className="rounded-full bg-emerald-600/20 px-3 text-emerald-400">
                          Active
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              const res = await totpSetup.mutateAsync();
                              setOtpauthUrl(res.otpauthUrl);
                              setTotpCode("");
                              setTotpStep("qr");
                            } catch {
                              toast.error("Failed to start 2FA setup.");
                            }
                          }}
                          disabled={totpSetup.isPending}
                          className="rounded-lg bg-primary-container text-xs font-bold text-white hover:bg-primary-container/90"
                        >
                          {totpSetup.isPending ? "Loading..." : "Set up"}
                        </Button>
                      )}
                    </div>

                    {/* QR step */}
                    {totpStep === "qr" && otpauthUrl && (
                      <div className="space-y-3">
                        <p className="text-sm text-on-surface-variant">
                          Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                        </p>
                        <div className="flex justify-center rounded-lg bg-white p-4">
                          <QRCode value={otpauthUrl} size={180} />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => { setTotpStep("verify"); setTotpCode(""); }}
                          className="w-full rounded-lg bg-surface-highest text-sm font-bold text-white"
                        >
                          I&apos;ve scanned it →
                        </Button>
                      </div>
                    )}

                    {/* Verify step */}
                    {totpStep === "verify" && (
                      <div className="space-y-3">
                        <p className="text-sm text-on-surface-variant">
                          Enter the 6-digit code from your authenticator app to confirm.
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={totpCode}
                            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                            placeholder="000000"
                            className="h-11 w-full rounded-lg border border-outline-variant/40 bg-surface px-4 font-mono text-lg tracking-widest text-white placeholder-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <Button
                            onClick={async () => {
                              try {
                                await totpConfirm.mutateAsync(totpCode);
                                setTotpStep("idle");
                                setTotpCode("");
                                toast.success("2FA enabled successfully.");
                                refetch();
                              } catch {
                                toast.error("Invalid code. Please try again.");
                              }
                            }}
                            disabled={totpConfirm.isPending || totpCode.length !== 6}
                            className="h-11 rounded-lg bg-emerald-600 px-5 font-bold text-white hover:bg-emerald-500"
                          >
                            {totpConfirm.isPending ? "..." : "Verify"}
                          </Button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTotpStep("qr")}
                          className="text-xs text-on-surface-variant underline"
                        >
                          Back to QR code
                        </button>
                      </div>
                    )}

                    {/* Disable step */}
                    {totpStep === "disable" && (
                      <div className="space-y-3">
                        <p className="text-sm text-on-surface-variant">
                          Enter your current 6-digit code to disable 2FA.
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={totpCode}
                            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                            placeholder="000000"
                            className="h-11 w-full rounded-lg border border-outline-variant/40 bg-surface px-4 font-mono text-lg tracking-widest text-white placeholder-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <Button
                            onClick={async () => {
                              try {
                                await totpDisable.mutateAsync(totpCode);
                                setTotpStep("idle");
                                setTotpCode("");
                                toast.success("2FA disabled.");
                                refetch();
                              } catch {
                                toast.error("Invalid code.");
                              }
                            }}
                            disabled={totpDisable.isPending || totpCode.length !== 6}
                            className="h-11 rounded-lg bg-error-container px-5 font-bold text-white hover:bg-error-container/90"
                          >
                            {totpDisable.isPending ? "..." : "Disable"}
                          </Button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTotpStep("idle")}
                          className="text-xs text-on-surface-variant underline"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Disable trigger (only when enabled and not already in disable flow) */}
                    {profile?.totpEnabled && totpStep === "idle" && (
                      <button
                        type="button"
                        onClick={() => { setTotpStep("disable"); setTotpCode(""); }}
                        className="text-xs text-error underline"
                      >
                        Disable 2FA
                      </button>
                    )}
                  </div>

                  {/* Sessions */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                      Active Sessions
                    </p>

                    {isLoading ? (
                      <>
                        <div className="h-14 w-full animate-pulse rounded-lg bg-surface-high" />
                        <div className="h-14 w-full animate-pulse rounded-lg bg-surface-high" />
                      </>
                    ) : sessions.length === 0 ? (
                      <p className="text-sm text-on-surface-variant">
                        No active sessions.
                      </p>
                    ) : (
                      sessions.map((session: Session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant/25 bg-surface-high p-3"
                        >
                          <div className="min-w-0">
                            <p className="inline-flex items-center gap-2 text-sm text-white">
                              <SessionIcon deviceName={session.deviceName} />
                              {session.deviceName ?? "Unknown Device"}
                              {session.isCurrent && (
                                <Badge className="ml-1 rounded-full bg-primary-container/20 px-2 py-0 text-xs text-primary">
                                  Current
                                </Badge>
                              )}
                            </p>
                            <p className="mt-1 text-xs text-on-surface-variant">
                              {session.location ?? session.chainName ?? "Unknown location"}
                            </p>
                          </div>
                          {!session.isCurrent && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm("Revoke this session?")) return;
                                try {
                                  await revokeSession.mutateAsync(session.id);
                                  toast.success("Session revoked.");
                                } catch {
                                  toast.error("Failed to revoke session.");
                                }
                              }}
                              disabled={revokeSession.isPending}
                              className="flex-shrink-0 rounded-md p-1.5 text-on-surface-variant hover:bg-error/10 hover:text-error"
                              title="Revoke session"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Vault status */}
              <Card className="bg-surface text-white lg:col-span-4">
                <CardHeader>
                  <CardTitle className="font-headline text-2xl font-bold">
                    Vault Status
                  </CardTitle>
                  <CardDescription className="text-on-surface-variant">
                    {sessions?.[0]?.chainName ?? "—"} connected
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="rounded-lg border border-outline-variant/30 bg-surface-high p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                      Trust Score
                    </p>
                    <p className="mt-1 font-headline text-3xl font-bold text-white">
                      {isLoading ? "—" : profile?.trustScore ?? "—"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-outline-variant/30 bg-surface-high p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                      Completed Pacts
                    </p>
                    <p className="mt-1 font-headline text-2xl font-bold text-white">
                      {isLoading ? "—" : profile?.completedPacts ?? "—"}
                    </p>
                  </div>

                  <Button className="h-11 w-full rounded-lg bg-secondary-container text-sm font-bold text-white hover:bg-secondary-container/90">
                    Switch Network
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Danger zone */}
            <Card className="bg-surface text-white">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2 font-headline text-2xl font-bold text-error">
                  <Shield className="h-5 w-5" /> Danger Zone
                </CardTitle>
                <CardDescription className="text-on-surface-variant">
                  Deactivating removes active session history and trusted
                  partner links.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <Separator className="bg-outline-variant/20" />

                <Button
                  variant="destructive"
                  className="h-11 rounded-lg bg-error-container font-bold text-white hover:bg-error-container/90"
                >
                  Deactivate Ledger Profile
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </section>
    </PageFrame>
    </AuthGuard>
  );
}
