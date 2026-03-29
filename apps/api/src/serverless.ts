// ============================================================
// apps/api/src/serverless.ts
//
// Serverless handler for Vercel deployment.
// Wraps the Fastify app for serverless execution.
// ============================================================

import { buildServer } from "./index.js";

let app: Awaited<ReturnType<typeof buildServer>> | null = null;

export default async function handler(req: any, res: any) {
  // Reuse app instance across warm invocations
  if (!app) {
    app = await buildServer();
    await app.ready();
  }

  // Forward request to Fastify
  app.server.emit("request", req, res);
}
