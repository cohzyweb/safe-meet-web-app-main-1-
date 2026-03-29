import "@rainbow-me/rainbowkit/styles.css";
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import "./globals.css";

const headline = Space_Grotesk({
  variable: "--font-headline",
  subsets: ["latin"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://safe-meet.click"),
  title: {
    default: "SafeMeet — Trustless Escrow for High-Stakes Trades",
    template: "%s | SafeMeet",
  },
  description:
    "Lock collateral before you meet. Release only after a signed QR handshake or referee approval. No blind trust — built on Base.",
  keywords: ["escrow", "p2p trade", "blockchain", "base", "crypto", "trustless", "pact", "goal accountability"],
  openGraph: {
    title: "SafeMeet — Trustless Escrow for High-Stakes Trades",
    description:
      "Lock collateral before you meet. Release only after a signed QR handshake or referee approval. No blind trust — built on Base.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "SafeMeet Protocol" }],
    type: "website",
    siteName: "SafeMeet",
  },
  twitter: {
    card: "summary_large_image",
    title: "SafeMeet — Trustless Escrow for High-Stakes Trades",
    description:
      "Lock collateral before you meet. Release only after a signed QR handshake or referee approval. No blind trust — built on Base.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full dark", headline.variable, body.variable, "font-sans")}
    >
      <body className="min-h-full bg-background text-on-surface font-body antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
