"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Html5QrcodeScanner } from "html5-qrcode";
import { QrCode, ScanLine, CheckCircle2, Info } from "lucide-react";
import { PageFrame } from "@/components/page-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePact, useGenerateQr, useVerifyQr } from "@/hooks/usePacts";
import { getTxExplorerUrl } from "@/lib/chain";

// Dynamically import react-qr-code with no SSR
const QRCode = dynamic(() => import("react-qr-code"), { ssr: false });

// ------------------------------------------------------------
// Real Html5QrcodeScanner — dynamic import, SSR disabled
// ------------------------------------------------------------

interface ScannerProps {
  onScan: (nonce: string) => void;
  isPending: boolean;
}

function QrScannerSection({ onScan, isPending }: ScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    let scanner: Html5QrcodeScanner | null = null;

    async function initScanner() {
      const { Html5QrcodeScanner } = await import("html5-qrcode");

      scanner = new Html5QrcodeScanner(
        "qr-reader-container",
        { fps: 10, qrbox: { width: 220, height: 220 } },
        false
      );

      scanner.render(
        (decodedText: string) => {
          onScan(decodedText);
        },
        (errorMessage: string) => {
          // Suppress frame-level scan errors — they are expected
          void errorMessage;
        }
      );

      scannerRef.current = scanner;
    }

    void initScanner();

    return () => {
      scanner?.clear().catch(() => undefined);
    };
  }, [onScan]);

  return (
    <div className="rounded-xl border border-outline-variant/30 bg-black/60 p-5">
      <div
        id="qr-reader-container"
        ref={containerRef}
        className="overflow-hidden rounded-lg"
      />
      <p className="mt-4 text-center text-sm text-on-surface-variant">
        {isPending ? "Verifying — please wait..." : "Point your camera at the seller's QR code"}
      </p>
    </div>
  );
}

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export default function HandshakePage() {
  const searchParams = useSearchParams();
  const pactId = searchParams.get("pactId") ?? undefined;

  const { data: pact, isLoading } = usePact(pactId);
  const generateQr = useGenerateQr();
  const verifyQr = useVerifyQr();

  const qrData = generateQr.data;

  const handleGenerateQr = () => {
    if (!pactId) return;
    generateQr.mutate(pactId, {
      onSuccess: () => toast.success("QR generated — show it to the buyer."),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to generate QR."),
    });
  };

  const handleScan = (nonce: string) => {
    if (verifyQr.isPending || verifyQr.isSuccess || !pactId) return;
    verifyQr.mutate(
      { nonce, pactId },
      {
        onSuccess: () => {
          toast.success("Pickup confirmed! Escrow released.");
        },
        onError: () => {
          toast.error("QR verification failed. Please try again.");
        },
      }
    );
  };

  return (
    <PageFrame activeHref="/create">
      <section className="section-wrap space-y-6">

        {/* Page header */}
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">In-Person Handshake</p>
          <h1 className="mt-3 font-headline text-4xl font-bold text-white sm:text-5xl">Complete the Trade</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-on-surface-variant">
            The seller generates a QR code, the buyer scans it. Escrow is released the moment the scan succeeds — no middleman.
          </p>
        </div>

        {/* Info bar */}
        {pact && (
          <div className="flex flex-wrap items-center justify-center gap-4 rounded-xl border border-white/8 bg-surface p-4 text-sm text-on-surface-variant">
            <span><span className="font-semibold text-white">Item:</span> {pact.itemName ?? "—"}</span>
            <span className="text-white/20">|</span>
            <span><span className="font-semibold text-white">Amount:</span> {pact.asset.amountFormatted}</span>
            <span className="text-white/20">|</span>
            <span><span className="font-semibold text-white">With:</span> <span className="font-mono text-xs">{pact.counterpartyWallet.slice(0, 8)}…{pact.counterpartyWallet.slice(-4)}</span></span>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">

          {/* Seller — QR code */}
          <Card className="bg-surface text-center text-white">
            <CardHeader>
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <QrCode className="h-5 w-5" />
              </div>
              <Badge className="mx-auto w-fit rounded-full bg-surface-high text-xs uppercase tracking-[0.14em] text-primary">
                I am the Seller
              </Badge>
              <CardTitle className="mt-3 font-headline text-3xl font-bold">Generate QR Code</CardTitle>
              <CardDescription className="mx-auto max-w-sm text-on-surface-variant">
                Tap the button below to generate a one-time QR code. Show it to the buyer only after you have physically handed over the item.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* How it works note */}
              <div className="flex items-start gap-2 rounded-lg border border-white/8 bg-surface-high p-3 text-left text-xs text-on-surface-variant">
                <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                <span>The QR is signed, single-use, and expires in 10 minutes. Escrow releases the moment the buyer scans it.</span>
              </div>

              {/* QR display */}
              <div className="mx-auto w-[270px] rounded-2xl bg-white p-4">
                {qrData?.nonce ? (
                  <QRCode value={qrData.nonce} size={240} />
                ) : (
                  <div className="grid h-[240px] grid-cols-8 gap-1 rounded bg-white p-2">
                    {Array.from({ length: 64 }).map((_, i) => (
                      <span
                        key={i}
                        className={i % 2 === 0 || i % 5 === 0 ? "rounded-sm bg-black/10" : "rounded-sm bg-white"}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* TX hash */}
              <div className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 bg-surface-high px-4 py-2 text-xs text-on-surface-variant">
                {isLoading
                  ? "Loading..."
                  : pact?.txHash
                    ? `TX: ${pact.txHash.slice(0, 6)}...${pact.txHash.slice(-4)}`
                    : "TX: Not yet submitted"}
              </div>
              {pact?.txHash && (
                <div className="mt-2">
                  <a
                    href={getTxExplorerUrl(pact.txHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View on BaseScan ↗
                  </a>
                </div>
              )}

              {/* Generate QR button */}
              {pactId && !qrData && (
                <div className="mt-2">
                  <Button
                    onClick={handleGenerateQr}
                    disabled={generateQr.isPending}
                    className="rounded-lg bg-primary-container text-sm font-bold text-white hover:bg-primary-container/90"
                  >
                    {generateQr.isPending ? "Generating..." : "Generate QR Code"}
                  </Button>
                </div>
              )}

              {/* QR expiry */}
              {qrData?.expiresAt && (
                <p className="text-xs text-amber-400">
                  Expires at {format(new Date(qrData.expiresAt), "HH:mm:ss")} — generate a new one if it expires
                </p>
              )}
            </CardContent>
          </Card>

          {/* Buyer — scan */}
          <Card className="bg-surface text-white">
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-secondary-container/20 bg-secondary-container/10 text-secondary-container">
                <ScanLine className="h-5 w-5" />
              </div>
              <Badge className="w-fit rounded-full bg-surface-high text-xs uppercase tracking-[0.14em] text-secondary-container">
                I am the Buyer
              </Badge>
              <CardTitle className="mt-3 font-headline text-3xl font-bold">Scan to Release</CardTitle>
              <CardDescription className="text-on-surface-variant">
                Once you have physically received the item, scan the seller&apos;s QR code to release the escrow funds.
              </CardDescription>

              {/* How it works note */}
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-white/8 bg-surface-high p-3 text-xs text-on-surface-variant">
                <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-secondary-container" />
                <span>Only scan after you have the item in hand. This action is irreversible — funds will be released to the seller immediately.</span>
              </div>
            </CardHeader>
            <CardContent>
              {verifyQr.isSuccess ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
                  <p className="text-lg font-bold text-emerald-400">Pickup Confirmed!</p>
                  <p className="mt-1 text-sm text-on-surface-variant">Escrow has been released to the seller. Trade complete.</p>
                </div>
              ) : (
                <QrScannerSection onScan={handleScan} isPending={verifyQr.isPending} />
              )}

              {/* Error */}
              {verifyQr.isError && (
                <p className="mt-3 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
                  Verification failed. Make sure you&apos;re scanning the correct QR code and it hasn&apos;t expired.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </PageFrame>
  );
}
