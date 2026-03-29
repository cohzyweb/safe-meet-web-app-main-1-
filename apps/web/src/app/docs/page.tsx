"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Lock, QrCode, Target, Users, BarChart2, Bell, User,
  Shield, ChevronDown, ChevronRight, Sun, Moon, Menu, X,
  ExternalLink, Copy, Check, ArrowRight, Zap,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface Param {
  name: string;
  in: "path" | "query" | "body" | "header";
  required?: boolean;
  type: string;
  description: string;
}

interface EndpointDef {
  method: HttpMethod;
  path: string;
  auth: boolean;
  summary: string;
  description?: string;
  params?: Param[];
  body?: string;
  response?: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const BASE_URL = "https://api.safe-meet.click";

const METHOD_STYLES: Record<HttpMethod, { bg: string; text: string; border: string }> = {
  GET:    { bg: "bg-blue-500/15",   text: "text-blue-400",   border: "border-blue-500/30" },
  POST:   { bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/30" },
  PATCH:  { bg: "bg-amber-500/15",  text: "text-amber-400",  border: "border-amber-500/30" },
  DELETE: { bg: "bg-red-500/15",    text: "text-red-400",    border: "border-red-500/30" },
};

const SECTIONS = [
  { id: "overview",       label: "Overview",        icon: Zap },
  { id: "auth",           label: "Authentication",  icon: Shield },
  { id: "pacts",          label: "Pacts",           icon: Lock },
  { id: "dashboard",      label: "Dashboard",       icon: BarChart2 },
  { id: "profile",        label: "Profile",         icon: User },
  { id: "notifications",  label: "Notifications",   icon: Bell },
] as const;

const ENDPOINTS: Record<string, EndpointDef[]> = {
  auth: [
    {
      method: "GET", path: "/api/auth/nonce", auth: false,
      summary: "Get SIWE nonce",
      description: "Returns a one-time nonce to include in your Sign-In with Ethereum message. Nonces expire after 5 minutes.",
      response: `{ "nonce": "abc123xyz", "expiresAt": "2026-03-27T12:05:00Z" }`,
    },
    {
      method: "POST", path: "/api/auth/verify", auth: false,
      summary: "Verify signature & get JWT",
      description: "Submit the signed SIWE message. Returns a 24-hour JWT for use as a Bearer token on protected routes.",
      body: `{ "message": "<SIWE message string>", "signature": "0x..." }`,
      response: `{ "token": "eyJ...", "wallet": "0x71a3...f92c", "expiresAt": "2026-03-28T12:00:00Z" }`,
    },
    {
      method: "POST", path: "/api/auth/logout", auth: true,
      summary: "Revoke session",
      description: "Invalidates the current JWT and removes the session. The token is blocklisted in Redis.",
      response: `{ "ok": true }`,
    },
    {
      method: "POST", path: "/api/auth/refresh", auth: true,
      summary: "Refresh JWT",
      description: "Issues a fresh 24-hour JWT using the current valid token.",
      response: `{ "token": "eyJ...", "wallet": "0x71a3...f92c", "expiresAt": "..." }`,
    },
  ],
  pacts: [
    {
      method: "GET", path: "/api/pacts", auth: false,
      summary: "List pacts",
      description: "Paginated list of pacts. Filter by wallet, type, or status.",
      params: [
        { name: "wallet", in: "query", type: "string", description: "Filter by creator or counterparty wallet address" },
        { name: "type",   in: "query", type: "TRADE | GOAL", description: "Filter by pact type" },
        { name: "status", in: "query", type: "PactStatus", description: "Filter by status" },
        { name: "page",   in: "query", type: "number", description: "Page number (default: 1)" },
        { name: "limit",  in: "query", type: "number", description: "Results per page (default: 20)" },
      ],
    },
    {
      method: "GET", path: "/api/pacts/history", auth: false,
      summary: "Pact history (cursor pagination)",
      description: "Cursor-based paginated history. Faster for large datasets.",
      params: [
        { name: "wallet", in: "query", required: true, type: "string", description: "Wallet address" },
        { name: "cursor", in: "query", type: "string", description: "Pagination cursor from previous response" },
        { name: "limit",  in: "query", type: "number", description: "Results per page (default: 20)" },
      ],
      response: `{ "data": [...], "hasMore": true, "nextCursor": "base64..." }`,
    },
    {
      method: "GET", path: "/api/pacts/:id", auth: false,
      summary: "Get pact by ID",
      params: [{ name: "id", in: "path", required: true, type: "uuid", description: "Pact UUID" }],
    },
    {
      method: "POST", path: "/api/pacts", auth: true,
      summary: "Create pact",
      description: "Creates a new TRADE or GOAL pact. Rate limited to 10/min per wallet.",
      body: `{
  "counterpartyWallet": "0xb4e1...a31d",
  "type": "TRADE",
  "assetSymbol": "ETH",
  "assetAmount": 0.5,
  "itemName": "MacBook Pro M2",
  "itemDescription": "Space Grey, 16GB RAM",
  "location": "Starbucks Downtown",
  "scheduledAt": "2026-03-28T14:00:00Z"
}`,
      response: `{ "id": "uuid", "status": "PENDING", "createdAt": "..." }`,
    },
    {
      method: "POST", path: "/api/pacts/:id/accept", auth: true,
      summary: "Accept pact",
      description: "Counterparty accepts the pact. Status moves from PENDING → ACTIVE.",
      params: [{ name: "id", in: "path", required: true, type: "uuid", description: "Pact UUID" }],
    },
    {
      method: "POST", path: "/api/pacts/:id/qr", auth: true,
      summary: "Generate QR code",
      description: "Generates a signed, expiring, single-use QR code for the in-person handshake. Rate limited to 5/min.",
      params: [{ name: "id", in: "path", required: true, type: "uuid", description: "Pact UUID" }],
      response: `{ "qrDataUrl": "data:image/png;base64,...", "expiresAt": "..." }`,
    },
    {
      method: "POST", path: "/api/pacts/verify-qr", auth: true,
      summary: "Verify QR & complete trade",
      description: "Counterparty scans and submits the QR nonce. Completes the pact on-chain if valid.",
      body: `{ "nonce": "abc123", "pactId": "uuid" }`,
      response: `{ "ok": true, "status": "COMPLETE" }`,
    },
    {
      method: "PATCH", path: "/api/pacts/:id/proof", auth: true,
      summary: "Submit goal proof",
      description: "Creator submits proof URL for a GOAL pact. Status moves to PROOF_SUBMITTED, referee is notified.",
      params: [{ name: "id", in: "path", required: true, type: "uuid", description: "Pact UUID" }],
      body: `{ "proofUrl": "https://..." }`,
    },
    {
      method: "PATCH", path: "/api/pacts/:id/onchain", auth: true,
      summary: "Attach on-chain transaction",
      description: "Attach a blockchain txHash and contract address after locking funds on-chain.",
      body: `{ "txHash": "0x...", "contractAddress": "0x..." }`,
    },
  ],
  dashboard: [
    {
      method: "GET", path: "/api/dashboard/stats", auth: false,
      summary: "Protocol stats",
      description: "Returns global or wallet-specific stats. Global stats are cached for 20 seconds.",
      params: [
        { name: "wallet", in: "query", type: "string", description: "Optional wallet address for personal stats" },
      ],
      response: `{
  "totalValueLocked": 4.5,
  "totalValueLockedFormatted": "4.50 ETH",
  "tvlChangePercent": 12,
  "completedTrades": 38,
  "activeEscrows": 7,
  "awaitingVerification": 2
}`,
    },
  ],
  profile: [
    {
      method: "GET", path: "/api/profile/:wallet", auth: false,
      summary: "Get profile",
      description: "Returns public profile stats. Auto-creates a profile if one doesn't exist.",
      params: [{ name: "wallet", in: "path", required: true, type: "string", description: "EVM wallet address" }],
      response: `{
  "wallet": "0x71a3...f92c",
  "displayName": "Alice",
  "avatarUrl": "https://...",
  "totalPacts": 10,
  "completedPacts": 9,
  "successRate": 90,
  "trustScore": 95,
  "joinedAt": "2026-01-01T00:00:00Z"
}`,
    },
    {
      method: "PATCH", path: "/api/profile/:wallet", auth: true,
      summary: "Update profile",
      description: "Update your own display name, avatar, or email. You can only update your own wallet's profile.",
      params: [{ name: "wallet", in: "path", required: true, type: "string", description: "Your wallet address" }],
      body: `{ "displayName": "Alice", "avatarUrl": "https://...", "email": "alice@example.com" }`,
    },
  ],
  notifications: [
    {
      method: "GET", path: "/api/notifications", auth: true,
      summary: "List notifications",
      description: "Returns notifications for the authenticated wallet. Cursor-based pagination.",
      params: [
        { name: "limit",  in: "query", type: "number", description: "Max results (1–50, default 20)" },
        { name: "cursor", in: "query", type: "string", description: "Pagination cursor" },
      ],
      response: `{
  "data": [{ "id": "uuid", "title": "Pact accepted", "body": "...", "isRead": false, "createdAt": "..." }],
  "hasMore": false,
  "unread": 3
}`,
    },
    {
      method: "POST", path: "/api/notifications/subscribe", auth: true,
      summary: "Subscribe to push",
      description: "Register a Web Push subscription for real-time notifications.",
      body: `{ "endpoint": "https://...", "p256dh": "...", "auth": "..." }`,
    },
    {
      method: "PATCH", path: "/api/notifications/:id/read", auth: true,
      summary: "Mark as read",
      params: [{ name: "id", in: "path", required: true, type: "uuid", description: "Notification UUID" }],
    },
    {
      method: "PATCH", path: "/api/notifications/read-all", auth: true,
      summary: "Mark all as read",
    },
  ],
};

const PACT_STATUSES = [
  { status: "PENDING",          color: "text-amber-400",   desc: "Created, awaiting counterparty acceptance" },
  { status: "ACTIVE",           color: "text-blue-400",    desc: "Both parties committed, meetup scheduled" },
  { status: "PROOF_SUBMITTED",  color: "text-violet-400",  desc: "Goal proof submitted, awaiting referee" },
  { status: "COMPLETE",         color: "text-emerald-400", desc: "Successfully completed" },
  { status: "DISPUTED",         color: "text-red-400",     desc: "Dispute raised" },
  { status: "CANCELLED",        color: "text-red-400",     desc: "Cancelled before activation" },
  { status: "EXPIRED",          color: "text-slate-400",   desc: "Deadline passed without completion" },
];

// ─── Components ──────────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: HttpMethod }) {
  const s = METHOD_STYLES[method];
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold font-mono border ${s.bg} ${s.text} ${s.border}`}>
      {method}
    </span>
  );
}

function AuthBadge({ required }: { required: boolean }) {
  return required ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
      <Lock className="h-2.5 w-2.5" /> Auth required
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
      <Check className="h-2.5 w-2.5" /> Public
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="absolute right-2 top-2 rounded p-1 text-slate-500 transition-colors hover:text-slate-300"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="relative rounded-lg border border-white/8 bg-[#0d0d0f] text-sm">
      {label && <p className="px-3 pt-2 text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>}
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-slate-300">{code.trim()}</pre>
      <CopyButton text={code.trim()} />
    </div>
  );
}

function ParamTable({ params }: { params: Param[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/8">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/8 bg-white/3">
            <th className="px-3 py-2 text-left font-semibold text-slate-400">Name</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-400">In</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-400">Type</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-400">Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p) => (
            <tr key={p.name} className="border-b border-white/5 last:border-0">
              <td className="px-3 py-2 font-mono text-violet-300">
                {p.name}{p.required && <span className="ml-1 text-red-400">*</span>}
              </td>
              <td className="px-3 py-2 text-slate-400">{p.in}</td>
              <td className="px-3 py-2 font-mono text-blue-300">{p.type}</td>
              <td className="px-3 py-2 text-slate-400">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EndpointCard({ ep }: { ep: EndpointDef }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-white/8 bg-white/2 overflow-hidden transition-colors hover:border-white/15">
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <MethodBadge method={ep.method} />
        <code className="flex-1 font-mono text-sm text-slate-200">{ep.path}</code>
        <AuthBadge required={ep.auth} />
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-white/8 px-4 pb-4 pt-3 space-y-4">
          <div>
            <p className="text-sm font-semibold text-white">{ep.summary}</p>
            {ep.description && <p className="mt-1 text-sm leading-relaxed text-slate-400">{ep.description}</p>}
          </div>
          {ep.params && ep.params.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Parameters</p>
              <ParamTable params={ep.params} />
            </div>
          )}
          {ep.body && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Request Body</p>
              <CodeBlock code={ep.body} />
            </div>
          )}
          {ep.response && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Response</p>
              <CodeBlock code={ep.response} />
            </div>
          )}
          <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/2 px-3 py-2">
            <code className="flex-1 overflow-x-auto font-mono text-xs text-slate-400 whitespace-nowrap">{BASE_URL}{ep.path}</code>
            <CopyButton text={`${BASE_URL}${ep.path}`} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [dark, setDark] = useState(true);
  const [active, setActive] = useState<string>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);

  const themeBase = dark
    ? "bg-[#131315] text-slate-200"
    : "bg-slate-50 text-slate-800";
  const surface = dark ? "bg-[#1e1d20] border-white/8" : "bg-white border-slate-200";
  const surfaceHigh = dark ? "bg-[#2a2a2c] border-white/8" : "bg-slate-100 border-slate-200";
  const mutedText = dark ? "text-slate-400" : "text-slate-500";
  const headingText = dark ? "text-white" : "text-slate-900";
  const divider = dark ? "border-white/8" : "border-slate-200";
  const navItem = (id: string) =>
    active === id
      ? dark ? "bg-violet-500/15 text-violet-300 border-l-2 border-violet-500" : "bg-violet-50 text-violet-700 border-l-2 border-violet-500"
      : dark ? "text-slate-400 hover:text-white hover:bg-white/4" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100";

  const scrollTo = (id: string) => {
    setActive(id);
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const Sidebar = () => (
    <nav className="space-y-0.5">
      <p className={`mb-3 px-3 text-xs font-bold uppercase tracking-widest ${mutedText}`}>Sections</p>
      {SECTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => scrollTo(id)}
          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${navItem(id)}`}
        >
          <Icon className="h-4 w-4 flex-shrink-0" />
          {label}
        </button>
      ))}
      <div className={`mt-4 border-t pt-4 ${divider}`}>
        <a
          href="https://api.safe-meet.click/api/docs"
          target="_blank"
          rel="noreferrer"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${dark ? "text-slate-400 hover:text-white hover:bg-white/4" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}
        >
          <ExternalLink className="h-4 w-4" />
          Swagger UI
        </a>
      </div>
    </nav>
  );

  return (
    <div className={`min-h-screen ${themeBase} transition-colors`}>
      {/* Top header */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-xl ${dark ? "bg-[#131315]/85 border-white/8" : "bg-white/85 border-slate-200"}`}>
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-1.5 lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-400">
                <Shield className="h-4 w-4" />
              </div>
              <span className={`text-sm font-bold ${headingText}`}>SafeMeet API</span>
            </Link>
            <span className={`hidden rounded-full border px-2.5 py-0.5 text-xs sm:block ${dark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>
              v1.0.0
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://api.safe-meet.click/api/docs"
              target="_blank"
              rel="noreferrer"
              className={`hidden items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors sm:flex ${dark ? "border-white/10 text-slate-400 hover:border-white/20 hover:text-white" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Swagger UI
            </a>
            <button
              onClick={() => setDark((v) => !v)}
              className={`rounded-lg border p-1.5 transition-colors ${dark ? "border-white/10 text-slate-400 hover:text-white" : "border-slate-200 text-slate-500 hover:text-slate-900"}`}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link
              href="/connect"
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-500"
            >
              <Zap className="h-3.5 w-3.5" />
              Launch App
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className={`absolute left-0 top-14 bottom-0 w-64 p-4 overflow-y-auto ${dark ? "bg-[#1e1d20]" : "bg-white"}`}>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Layout */}
      <div className="mx-auto flex max-w-7xl">
        {/* Desktop sidebar */}
        <aside className={`sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 flex-shrink-0 overflow-y-auto border-r p-4 lg:block ${divider} ${dark ? "bg-[#131315]" : "bg-slate-50"}`}>
          <Sidebar />
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 px-4 py-10 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl space-y-16">

            {/* ── Overview ─────────────────────────────────── */}
            <section id="overview" className="space-y-6 scroll-mt-16">
              <div className="space-y-3">
                <p className={`text-xs font-bold uppercase tracking-widest ${dark ? "text-violet-400" : "text-violet-600"}`}>API Reference</p>
                <h1 className={`text-4xl font-bold ${headingText}`}>SafeMeet API</h1>
                <p className={`text-lg leading-relaxed ${mutedText}`}>
                  Trustless escrow for in-person trades and goal pacts on Base Sepolia.
                  All endpoints return JSON. Errors follow a consistent shape.
                </p>
              </div>

              <div className={`grid gap-3 rounded-xl border p-5 sm:grid-cols-2 ${surface}`}>
                {[
                  { label: "Base URL", value: "https://api.safe-meet.click" },
                  { label: "Protocol",  value: "HTTPS / REST + JSON" },
                  { label: "Auth",      value: "JWT Bearer (SIWE)" },
                  { label: "Rate limit", value: "100 req/min global" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${mutedText}`}>{label}</p>
                    <p className={`mt-0.5 font-mono text-sm ${headingText}`}>{value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className={`text-sm font-semibold ${headingText}`}>Error shape</p>
                <CodeBlock code={`{ "code": "NOT_FOUND", "message": "Pact not found", "statusCode": 404 }`} />
              </div>

              <div className="space-y-2">
                <p className={`text-sm font-semibold ${headingText}`}>Pact statuses</p>
                <div className={`overflow-hidden rounded-xl border ${surface}`}>
                  {PACT_STATUSES.map(({ status, color, desc }) => (
                    <div key={status} className={`flex items-center gap-3 border-b px-4 py-2.5 last:border-0 ${divider}`}>
                      <code className={`min-w-[10rem] font-mono text-xs font-bold ${color}`}>{status}</code>
                      <span className={`text-sm ${mutedText}`}>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Auth ─────────────────────────────────────── */}
            <section id="auth" className="space-y-5 scroll-mt-16">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${dark ? "border-amber-500/30 bg-amber-500/10" : "border-amber-300 bg-amber-50"}`}>
                  <Shield className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${headingText}`}>Authentication</h2>
                  <p className={`text-sm ${mutedText}`}>Sign-In with Ethereum (SIWE) — gasless, one-time signature</p>
                </div>
              </div>

              <div className={`rounded-xl border p-5 space-y-3 ${surface}`}>
                <p className={`text-sm font-semibold ${headingText}`}>How it works</p>
                {[
                  { step: "1", text: "Call GET /api/auth/nonce to get a one-time nonce." },
                  { step: "2", text: "Construct a SIWE message and sign it with the user's wallet." },
                  { step: "3", text: "POST the message + signature to /api/auth/verify." },
                  { step: "4", text: "Receive a 24-hour JWT. Pass it as Authorization: Bearer <token> on protected routes." },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold ${dark ? "border-violet-500/30 bg-violet-500/10 text-violet-300" : "border-violet-200 bg-violet-50 text-violet-600"}`}>{step}</span>
                    <p className={`text-sm pt-0.5 ${mutedText}`}>{text}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {ENDPOINTS.auth?.map((ep) => <EndpointCard key={ep.path + ep.method} ep={ep} />)}
              </div>
            </section>

            {/* ── Pacts ─────────────────────────────────────── */}
            <section id="pacts" className="space-y-5 scroll-mt-16">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${dark ? "border-violet-500/30 bg-violet-500/10" : "border-violet-200 bg-violet-50"}`}>
                  <Lock className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${headingText}`}>Pacts</h2>
                  <p className={`text-sm ${mutedText}`}>Trade escrow and goal pact lifecycle</p>
                </div>
              </div>

              <div className={`grid gap-3 rounded-xl border p-5 sm:grid-cols-2 ${surface}`}>
                <div className={`space-y-1 rounded-lg border p-3 ${surfaceHigh}`}>
                  <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-violet-400" /><span className={`text-sm font-semibold ${headingText}`}>Trade Escrow</span></div>
                  <p className={`text-xs ${mutedText}`}>Both parties lock ETH. At in-person handoff, QR scan releases funds atomically.</p>
                </div>
                <div className={`space-y-1 rounded-lg border p-3 ${surfaceHigh}`}>
                  <div className="flex items-center gap-2"><Target className="h-4 w-4 text-blue-400" /><span className={`text-sm font-semibold ${headingText}`}>Goal Pact</span></div>
                  <p className={`text-xs ${mutedText}`}>Creator stakes ETH on a commitment. Referee reviews proof and decides the outcome.</p>
                </div>
              </div>

              <div className="space-y-3">
                {ENDPOINTS.pacts?.map((ep) => <EndpointCard key={ep.path + ep.method} ep={ep} />)}
              </div>
            </section>

            {/* ── Dashboard ─────────────────────────────────── */}
            <section id="dashboard" className="space-y-5 scroll-mt-16">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${dark ? "border-blue-500/30 bg-blue-500/10" : "border-blue-200 bg-blue-50"}`}>
                  <BarChart2 className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${headingText}`}>Dashboard</h2>
                  <p className={`text-sm ${mutedText}`}>Protocol-level and wallet-level stats</p>
                </div>
              </div>
              <div className="space-y-3">
                {ENDPOINTS.dashboard?.map((ep) => <EndpointCard key={ep.path + ep.method} ep={ep} />)}
              </div>
            </section>

            {/* ── Profile ─────────────────────────────────────── */}
            <section id="profile" className="space-y-5 scroll-mt-16">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${dark ? "border-emerald-500/30 bg-emerald-500/10" : "border-emerald-200 bg-emerald-50"}`}>
                  <User className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${headingText}`}>Profile</h2>
                  <p className={`text-sm ${mutedText}`}>Trust scores, reputation, and identity</p>
                </div>
              </div>
              <div className="space-y-3">
                {ENDPOINTS.profile?.map((ep) => <EndpointCard key={ep.path + ep.method} ep={ep} />)}
              </div>
            </section>

            {/* ── Notifications ─────────────────────────────── */}
            <section id="notifications" className="space-y-5 scroll-mt-16">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${dark ? "border-amber-500/30 bg-amber-500/10" : "border-amber-200 bg-amber-50"}`}>
                  <Bell className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${headingText}`}>Notifications</h2>
                  <p className={`text-sm ${mutedText}`}>In-app and Web Push notifications</p>
                </div>
              </div>
              <div className="space-y-3">
                {ENDPOINTS.notifications?.map((ep) => <EndpointCard key={ep.path + ep.method} ep={ep} />)}
              </div>
            </section>

            {/* ── Footer CTA ───────────────────────────────── */}
            <div className={`rounded-2xl border p-8 text-center ${dark ? "border-violet-500/20 bg-violet-500/5" : "border-violet-200 bg-violet-50"}`}>
              <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${dark ? "text-violet-400" : "text-violet-600"}`}>Ready to build?</p>
              <h3 className={`text-2xl font-bold mb-2 ${headingText}`}>Try the live app</h3>
              <p className={`text-sm mb-5 ${mutedText}`}>Connect your wallet and run through the full escrow flow on Base Sepolia.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/connect" className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-500">
                  <Zap className="h-4 w-4" /> Launch App
                </Link>
                <a
                  href="https://api.safe-meet.click/api/docs"
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center gap-2 rounded-xl border px-6 py-2.5 text-sm font-bold transition-colors ${dark ? "border-white/15 text-slate-300 hover:border-white/30 hover:text-white" : "border-slate-300 text-slate-700 hover:border-slate-400"}`}
                >
                  <ExternalLink className="h-4 w-4" /> Swagger UI
                </a>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
