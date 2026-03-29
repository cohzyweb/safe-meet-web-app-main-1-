# SafeMeet

> **Trustless peer-to-peer escrow for real-world trades and goal commitments — built on Base Sepolia.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.0-black.svg)](https://www.fastify.io/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.0-2D3748.svg)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## What is SafeMeet?

SafeMeet is a decentralized escrow protocol that makes in-person trades and personal goal commitments trustless and verifiable. Instead of relying on a third party, participants connect their Ethereum wallets, create a **Pact**, and the protocol handles verification — either via QR code scanning at the point of trade, or through a designated referee for goal accountability.

**Two core use cases:**

- **In-person trades** — Exchange high-value items securely. Both parties agree on the terms, meet up, and confirm completion via cryptographically signed QR codes.
- **Goal commitments** — Set a personal objective with a deadline. A referee oversees proof submission and confirms whether the goal was met.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the App](#running-the-app)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Security](#security)
- [Deployment](#deployment)
- [Scripts](#scripts)

---

## Tech Stack

### Backend (`apps/api`)
| Tool | Purpose |
|------|---------|
| **Fastify v5** | High-performance HTTP server with Zod type provider |
| **Prisma ORM** | Database access and migrations |
| **PostgreSQL** | Primary database |
| **JWT + SIWE** | Authentication via Sign-In with Ethereum |
| **Redis (ioredis)** | Rate limiting and session caching |
| **QRCode + crypto** | Cryptographically signed QR payloads |
| **Nodemailer / Resend** | Transactional email (MJML templates) |
| **otplib** | TOTP two-factor authentication |
| **web-push** | Browser push notifications |
| **viem** | Ethereum utilities |
| **Zod** | Runtime schema validation |

### Frontend (`apps/web`)
| Tool | Purpose |
|------|---------|
| **Next.js 16** | React framework with App Router |
| **RainbowKit + Wagmi** | Wallet connection UI |
| **TanStack Query** | Server state management |
| **TanStack Table** | Data tables |
| **Tailwind CSS v4** | Utility-first styling |
| **shadcn/ui** | Accessible UI components |
| **Framer Motion** | Animations |
| **Zustand** | Client-side state |
| **React Hook Form + Zod** | Form validation |
| **html5-qrcode / react-qr-code** | QR scanning and display |
| **Sonner** | Toast notifications |

### Shared (`packages/shared`)
| Tool | Purpose |
|------|---------|
| **Zod** | Shared schemas for end-to-end type safety between frontend and backend |

### Tooling
| Tool | Purpose |
|------|---------|
| **Turborepo** | Monorepo task orchestration |
| **pnpm workspaces** | Package management |
| **TypeScript** | Strict mode throughout |
| **tsx** | TypeScript execution for the API dev server |

---

## Project Structure

```
safe-meet/
├── apps/
│   ├── api/                  # Fastify v5 backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma # Database schema
│   │   │   └── migrations/   # SQL migration history
│   │   ├── scripts/
│   │   │   ├── seed.ts       # Seed demo data
│   │   │   └── reset-demo.ts # Reset demo environment
│   │   └── src/
│   │       ├── index.ts      # Server entry point
│   │       ├── lib/          # Prisma, Redis, email, notifications
│   │       ├── plugins/      # Fastify auth plugin
│   │       └── routes/       # auth, pacts, dashboard, profile, sessions, totp, notifications
│   └── web/                  # Next.js 16 frontend
│       ├── public/           # Static assets & illustrations
│       └── src/app/          # App Router pages (connect, create, pacts, dashboard, etc.)
├── packages/
│   └── shared/               # Zod schemas shared across apps
├── turbo.json                # Turborepo pipeline config
├── pnpm-workspace.yaml       # pnpm workspace definition
└── package.json              # Root scripts
```

---

## Prerequisites

- **Node.js** v20 or higher
- **pnpm** v9 or higher — `npm install -g pnpm`
- **PostgreSQL** v14 or higher (running locally or via a cloud provider)
- **Redis** (optional, for rate limiting in development)
- A **WalletConnect Project ID** — get one free at [cloud.walletconnect.com](https://cloud.walletconnect.com)

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Chidi09/safe-meet-web-app.git
cd safe-meet-web-app

# 2. Install dependencies
pnpm install

# 3. Build the shared package (required before first run)
pnpm --filter @safe-meet/shared build

# 4. Set up environment variables (see next section)
cp apps/api/.env.example apps/api/.env
# then create apps/web/.env.local manually

# 5. Set up the database
pnpm db:generate
pnpm db:migrate

# 6. Start the dev servers
pnpm dev
```

The app will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000

---

## Environment Variables

### Backend — `apps/api/.env`

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/safemeet"
JWT_SECRET="your-jwt-secret-minimum-32-characters-long"
QR_SECRET="different-secret-for-signing-qr-codes"
FRONTEND_URL="http://localhost:3000"
PORT=4000
NODE_ENV="development"

# Optional: Email (pick one)
RESEND_API_KEY="re_..."
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="user@example.com"
SMTP_PASS="password"

# Optional: Web push notifications
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:you@example.com"

# Optional: Redis (for rate limiting)
REDIS_URL="redis://localhost:6379"
```

### Frontend — `apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your-walletconnect-project-id"
```

> **Note:** Never commit `.env` or `.env.local` to version control. Both files are gitignored by default.

---

## Database Setup

The project uses **Prisma Migrate** with PostgreSQL. Migrations are tracked in `apps/api/prisma/migrations/`.

```bash
# Generate the Prisma client
pnpm db:generate

# Run all pending migrations (development)
pnpm db:migrate

# Push schema without migrations (fast iteration, dev only)
pnpm db:push

# Seed the database with demo data
pnpm --filter @safe-meet/api db:seed

# Reset and re-seed the demo environment
pnpm --filter @safe-meet/api demo:refresh
```

### Schema Overview

| Model | Description |
|-------|-------------|
| `Pact` | Core entity — a trade or goal commitment between two wallet addresses |
| `Profile` | Wallet-linked user profile with trust score and stats |
| `Session` | Wallet sessions with device and location metadata |
| `Notification` | In-app notifications linked to a wallet |
| `PushSubscription` | Web Push API subscriptions per wallet |
| `QrNonce` | Short-lived, single-use nonces for QR verification |

**Pact statuses:** `PENDING → ACTIVE → PROOF_SUBMITTED → COMPLETE` (or `DISPUTED` / `CANCELLED` / `EXPIRED`)

---

## Running the App

```bash
# Run all apps and packages together
pnpm dev

# Run frontend only (http://localhost:3000)
pnpm dev:web

# Run backend only (http://localhost:4000)
pnpm dev:api

# Build all for production
pnpm build

# Type-check across entire monorepo
pnpm typecheck
```

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/nonce` | Get a SIWE nonce for the wallet |
| `POST` | `/api/auth/verify` | Verify SIWE signature, receive JWT |

### Pacts
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/pacts` | — | List pacts (filterable) |
| `POST` | `/api/pacts` | ✅ | Create a new pact |
| `GET` | `/api/pacts/:id` | — | Get pact details |
| `PATCH` | `/api/pacts/:id/status` | ✅ | Update pact status (owner only) |
| `POST` | `/api/pacts/:id/qr` | ✅ | Generate a signed QR code |
| `POST` | `/api/pacts/verify-qr` | ✅ | Verify QR and complete pact |

### Dashboard & Profile
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/dashboard/stats?wallet=` | — | Dashboard statistics for a wallet |
| `GET` | `/api/profile/:wallet` | — | Public profile |
| `PATCH` | `/api/profile/:wallet` | ✅ | Update own profile |

### Notifications
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/notifications` | ✅ | List notifications |
| `PATCH` | `/api/notifications/:id/read` | ✅ | Mark as read |
| `POST` | `/api/notifications/push/subscribe` | ✅ | Register push subscription |

### Sessions & TOTP
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/sessions` | ✅ | List active sessions |
| `DELETE` | `/api/sessions/:id` | ✅ | Revoke a session |
| `POST` | `/api/totp/setup` | ✅ | Generate TOTP secret |
| `POST` | `/api/totp/verify` | ✅ | Verify and enable TOTP |
| `DELETE` | `/api/totp` | ✅ | Disable TOTP |

---

## Security

- **SIWE authentication** — Sign-In with Ethereum; no passwords, wallet signature is the credential
- **JWT tokens** — Short-lived, signed with `JWT_SECRET`
- **TOTP / 2FA** — Optional two-factor authentication via authenticator app
- **Cryptographically signed QR codes** — Signed with `QR_SECRET`; short-lived nonces prevent replay
- **Rate limiting** — 100 req/min general; 5 req/min on QR endpoints
- **Helmet security headers** — Applied in production
- **Zod validation** — All inputs validated on every endpoint
- **Resource authorization** — Ownership checked on all state-changing routes

---

## Deployment

### Vercel (Recommended)

Create two separate Vercel projects — one for the frontend and one for the backend.

```bash
# Frontend
cd apps/web
vercel --prod

# Backend
cd apps/api
vercel --prod
```

Set environment variables in each project's Vercel dashboard. The API includes a `vercel.json` for serverless deployment configuration.

### Database

Use **Vercel Postgres**, **Supabase**, **Railway**, or any managed PostgreSQL provider:

```bash
# Deploy migrations to production
npx prisma migrate deploy
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm dev:web` | Start frontend only |
| `pnpm dev:api` | Start backend only |
| `pnpm build` | Build all packages and apps |
| `pnpm typecheck` | Type-check the entire monorepo |
| `pnpm lint` | Lint all packages |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema changes without migration |
| `pnpm db:migrate` | Run Prisma migrations |

---

## License

MIT — see [LICENSE](./LICENSE) for details.

---

Built with ❤️ for the Ethereum ecosystem.
