// ============================================================
// apps/api/src/index.ts
//
// Fastify v5 server — ESM, Zod type provider, Prisma ORM.
// ============================================================

import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import jwt from "@fastify/jwt";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
} from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "./lib/prisma.js";
import { redis } from "./lib/redis.js";

import authPlugin from "./plugins/auth.js";
import authRoutes from "./routes/auth.js";
import pactsRoutes from "./routes/pacts.js";
import dashboardRoutes from "./routes/dashboard.js";
import profileRoutes from "./routes/profile.js";
import sessionsRoutes from "./routes/sessions.js";
import notificationsRoutes from "./routes/notifications.js";
import totpRoutes from "./routes/totp.js";

// ------------------------------------------------------------
// Server factory — separated for testability
// ------------------------------------------------------------

export async function buildServer() {
  const isDev = process.env["NODE_ENV"] !== "production";
  
  const fastify = Fastify({
    logger: {
      level: process.env["LOG_LEVEL"] ?? "info",
      ...(isDev ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true }
        }
      } : {
        file: process.env["LOG_FILE_PATH"] ?? "/app/logs/api.log",
      }),
    },
  });

  // ----------------------------------------------------------
  // Zod type provider — must be set before any route/schema
  // ----------------------------------------------------------
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // ----------------------------------------------------------
  // OpenAPI / Swagger — registered before routes
  // ----------------------------------------------------------
  await fastify.register(swagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "SafeMeet API",
        description:
          "Trustless P2P escrow API for in-person trades and goal pacts on Base Sepolia.\n\n" +
          "**Auth flow:** `GET /api/auth/nonce` → sign message in wallet → `POST /api/auth/verify` → receive JWT.\n\n" +
          "Pass the JWT as `Authorization: Bearer <token>` on all protected routes.",
        version: "1.0.0",
        contact: { url: "https://app.safe-meet.click" },
      },
      servers: [
        { url: "https://api.safe-meet.click", description: "Production" },
        { url: "http://localhost:4000", description: "Local" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "JWT from POST /api/auth/verify",
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await fastify.register(swaggerUi, {
    routePrefix: "/api/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    },
    theme: {
      title: "SafeMeet API Docs",
      css: [
        {
          filename: "theme.css",
          content: `
/* ── Dark mode (system preference) ─────────────────────────── */
@media (prefers-color-scheme: dark) {
  body { background: #131315 !important; }
  .swagger-ui, .swagger-ui * { color: #e5e1e4; }
  .swagger-ui .topbar { background: #201f22; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .swagger-ui .topbar a span { color: #ccbeff; }
  .swagger-ui .info .title { color: #ffffff; }
  .swagger-ui .info p, .swagger-ui .info li, .swagger-ui .info a { color: #cac3d8; }
  .swagger-ui .info code { background: #2a2a2c; color: #ccbeff; }
  .swagger-ui .scheme-container { background: #201f22; box-shadow: none; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .swagger-ui .opblock-tag { color: #e5e1e4; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .swagger-ui .opblock-tag:hover { background: rgba(255,255,255,0.04); }
  .swagger-ui .opblock { background: #201f22 !important; border: 1px solid rgba(255,255,255,0.08) !important; box-shadow: none !important; }
  .swagger-ui .opblock .opblock-summary { border-bottom: 1px solid rgba(255,255,255,0.06); }
  .swagger-ui .opblock.opblock-get { border-left: 3px solid #3892f8 !important; }
  .swagger-ui .opblock.opblock-post { border-left: 3px solid #7d56fe !important; }
  .swagger-ui .opblock.opblock-patch { border-left: 3px solid #cdc7af !important; }
  .swagger-ui .opblock.opblock-delete { border-left: 3px solid #ffb4ab !important; }
  .swagger-ui .opblock .opblock-summary-description { color: #cac3d8; }
  .swagger-ui .opblock-body, .swagger-ui .opblock-section { background: #1a1a1c; }
  .swagger-ui .tab li button.tablinks { color: #cac3d8; background: transparent; }
  .swagger-ui .tab li button.tablinks.active { color: #ccbeff; border-bottom: 2px solid #7d56fe; }
  .swagger-ui textarea, .swagger-ui input[type="text"], .swagger-ui input[type="email"], .swagger-ui input[type="file"], .swagger-ui input[type="password"] { background: #2a2a2c !important; color: #e5e1e4 !important; border-color: rgba(255,255,255,0.15) !important; }
  .swagger-ui select { background: #2a2a2c; color: #e5e1e4; border-color: rgba(255,255,255,0.15); }
  .swagger-ui .btn { border-radius: 6px; }
  .swagger-ui .btn.execute { background: #7d56fe; border-color: #7d56fe; color: #fff; }
  .swagger-ui .btn.btn-clear { background: transparent; color: #cac3d8; border-color: rgba(255,255,255,0.2); }
  .swagger-ui .btn.authorize { background: transparent; color: #ccbeff; border-color: #7d56fe; }
  .swagger-ui .model-box, .swagger-ui .model { background: #1a1a1c; }
  .swagger-ui section.models { background: #201f22; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; }
  .swagger-ui .model-title { color: #e5e1e4; }
  .swagger-ui table.model td { color: #cac3d8; border-color: rgba(255,255,255,0.06); }
  .swagger-ui .parameter__name { color: #e5e1e4; }
  .swagger-ui .parameter__type { color: #ccbeff; }
  .swagger-ui .parameter__in { color: #cdc7af; }
  .swagger-ui .response-col_status { color: #e5e1e4; }
  .swagger-ui .response-col_description, .swagger-ui .responses-inner { background: #1a1a1c; }
  .swagger-ui .highlight-code > pre, .swagger-ui pre { background: #131315 !important; }
  .swagger-ui .auth-wrapper, .swagger-ui .auth-container { background: #201f22; }
  .swagger-ui .dialog-ux .modal-ux { background: #201f22; border: 1px solid rgba(255,255,255,0.1); }
  .swagger-ui .dialog-ux .modal-ux-header { background: #2a2a2c; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .swagger-ui .dialog-ux .modal-ux-header h3 { color: #e5e1e4; }
  .swagger-ui .prop-type { color: #3892f8; }
  .swagger-ui .prop-format { color: #cdc7af; }
  .swagger-ui .markdown h1,.swagger-ui .markdown h2,.swagger-ui .markdown h3,.swagger-ui .markdown p,.swagger-ui .markdown td,.swagger-ui .markdown li { color: #cac3d8; }
  .swagger-ui .loading-container .loading:after { color: #ccbeff; }
}
/* ── Always ─────────────────────────────────────────────────── */
.swagger-ui .topbar-wrapper img { content: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%237d56fe"><circle cx="12" cy="12" r="10"/></svg>'); width: 32px; height: 32px; }
.swagger-ui .opblock-tag { font-size: 14px; font-weight: 600; letter-spacing: 0.05em; }
.swagger-ui .opblock { border-radius: 8px; overflow: hidden; }
.swagger-ui .btn { border-radius: 6px; font-weight: 600; }
`,
        },
      ],
    },
    staticCSP: false,
  });

  // Relax CSP for Swagger UI in production (Helmet sets strict CSP globally)
  if (process.env["NODE_ENV"] === "production") {
    fastify.addHook("onSend", async (request, reply) => {
      if (request.url.startsWith("/api/docs")) {
        reply.header(
          "content-security-policy",
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src * data: blob:; connect-src *; worker-src blob:;"
        );
      }
    });
  }

  // ----------------------------------------------------------
  // Core plugins
  // ----------------------------------------------------------
  await fastify.register(cors, {
    origin: process.env["FRONTEND_URL"] ?? "http://localhost:3000",
    credentials: true,
  });

  await fastify.register(helmet, {
    contentSecurityPolicy:
      process.env["NODE_ENV"] === "production"
        ? {
            directives: {
              defaultSrc: ["'self'"],
              imgSrc: ["'self'", "data:", "https:"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              connectSrc: [
                "'self'",
                "https://relay.walletconnect.com",
                "wss://relay.walletconnect.com",
                "https://*.walletconnect.com",
                "wss://*.walletconnect.com",
                "https://*.walletconnect.org",
                "wss://*.walletconnect.org",
              ],
              frameSrc: ["'self'", "https://verify.walletconnect.com"],
              mediaSrc: ["'self'", "blob:", "data:"],
              workerSrc: ["'self'", "blob:"],
            },
          }
        : false,
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    errorResponseBuilder: (req, context) => ({
      code: "RATE_LIMIT_EXCEEDED",
      message: `Rate limit exceeded. Retry after ${context.after}`,
      statusCode: 429,
    }),
  });

  await fastify.register(sensible);

  await fastify.register(jwt, {
    secret: process.env["JWT_SECRET"] ?? "change-me-in-development",
  });

  fastify.addHook("onRequest", async (request) => {
    request.log.info({ method: request.method, path: request.url }, "request_start");
  });

  fastify.addHook("onResponse", async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        path: request.url,
        statusCode: reply.statusCode,
        durationMs: reply.elapsedTime,
      },
      "request_end",
    );
  });

  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    const code = error.code ?? "INTERNAL_SERVER_ERROR";
    const message = statusCode >= 500 ? "Internal server error" : (error.message || "Request failed");

    request.log.error(
      {
        err: error,
        requestId: request.id,
        method: request.method,
        path: request.url,
      },
      "request_failed",
    );

    reply.status(statusCode).send({
      code,
      message,
      statusCode,
    });
  });

  // ----------------------------------------------------------
  // Auth plugin — decorates request.walletAddress
  // ----------------------------------------------------------
  await fastify.register(authPlugin);

  // ----------------------------------------------------------
  // Health check  (outside /api/ prefix — infra can hit this)
  // ----------------------------------------------------------
  fastify.get(
    "/health",
    {
      schema: {
        response: {
          200: z.object({
            status: z.literal("ok"),
            ts: z.string().datetime({ offset: true }),
            db: z.literal("ok"),
            redis: z.literal("ok"),
          }),
          503: z.object({
            status: z.literal("error"),
            ts: z.string().datetime({ offset: true }),
            db: z.enum(["ok", "error"]),
            redis: z.enum(["ok", "error"]),
          }),
        },
      },
    },
    async (_request, reply) => {
      const [db, redisStatus] = await Promise.all([
        prisma.$queryRaw`SELECT 1`
          .then(() => "ok" as const)
          .catch(() => "error" as const),
        redis.ping()
          .then((r: string) => (r === "PONG" ? "ok" as const : "error" as const))
          .catch(() => "error" as const),
      ]);

      if (db === "error" || redisStatus === "error") {
        return reply.status(503).send({
          status: "error",
          ts: new Date().toISOString(),
          db,
          redis: redisStatus,
        });
      }

      return reply.send({ status: "ok", ts: new Date().toISOString(), db, redis: redisStatus });
    },
  );

  fastify.addHook("onReady", async () => {
    fastify.log.info("expired pact cleanup started");
    setInterval(async () => {
      try {
        const result = await prisma.pact.updateMany({
          where: {
            status: "ACTIVE",
            goalDeadline: {
              lt: new Date(),
            },
          },
          data: { status: "EXPIRED" },
        });

        if (result.count > 0) {
          fastify.log.info({ count: result.count }, "expired pacts updated");
        }
      } catch (error) {
        fastify.log.error({ err: error }, "expired pact cleanup failed");
      }
    }, 60 * 60 * 1000);
  });

  // ----------------------------------------------------------
  // API routes — all mounted under /api/
  // ----------------------------------------------------------
  await fastify.register(
    async (api) => {
      await api.register(authRoutes, { prefix: "/auth" });
      await api.register(totpRoutes, { prefix: "/auth/2fa" });
      await api.register(dashboardRoutes, { prefix: "/dashboard" });
      await api.register(pactsRoutes, { prefix: "/pacts" });
      await api.register(profileRoutes, { prefix: "/profile" });
      await api.register(sessionsRoutes, { prefix: "/sessions" });
      await api.register(notificationsRoutes, { prefix: "/notifications" });
    },
    { prefix: "/api" },
  );

  return fastify;
}

// ------------------------------------------------------------
// Bootstrap — only run when not in serverless environment
// ------------------------------------------------------------

if (process.env["VERCEL"] !== "1" && import.meta.url === `file://${process.argv[1]}`) {
  async function main() {
    const port = Number(process.env["PORT"] ?? 4000);
    const host = process.env["HOST"] ?? "0.0.0.0";

    const server = await buildServer();

    process.on("uncaughtException", (err) => {
      server.log.fatal({ err }, "uncaughtException");
    });

    process.on("unhandledRejection", (reason) => {
      server.log.fatal({ reason }, "unhandledRejection");
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      server.log.info({ signal }, "Shutdown signal received — closing server.");
      await server.close();
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    try {
      await server.listen({ port, host });
    } catch (err) {
      server.log.error(err);
      process.exit(1);
    }
  }

  main();
}
