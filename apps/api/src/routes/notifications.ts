import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../plugins/auth.js";

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

const SubscribeBodySchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

const NotificationIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export default async function notificationsRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: z.infer<typeof ListQuerySchema> }>(
    "/",
    {
      preHandler: requireAuth,
      schema: {
        querystring: ListQuerySchema,
      },
    },
    async (request, reply) => {
      const wallet = request.walletAddress;
      if (!wallet) {
        return reply.unauthorized("A valid JWT is required.");
      }

      const { limit, cursor } = request.query;

      let cursorFilter: {
        OR: Array<
          | { createdAt: { lt: Date } }
          | { AND: [{ createdAt: Date }, { id: { lt: string } }] }
        >;
      } | null = null;

      if (cursor) {
        try {
          const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf8")) as {
            createdAt: string;
            id: string;
          };
          cursorFilter = {
            OR: [
              { createdAt: { lt: new Date(decoded.createdAt) } },
              { AND: [{ createdAt: new Date(decoded.createdAt) }, { id: { lt: decoded.id } }] },
            ],
          };
        } catch {
          return reply.badRequest("Invalid cursor.");
        }
      }

      const rows = await prisma.notification.findMany({
        where: {
          wallet,
          ...(cursorFilter ? cursorFilter : {}),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
      });

      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;
      const last = data[data.length - 1];
      const nextCursor =
        hasMore && last
          ? Buffer.from(JSON.stringify({ createdAt: last.createdAt.toISOString(), id: last.id }), "utf8").toString("base64")
          : null;

      const unread = await prisma.notification.count({
        where: {
          wallet,
          isRead: false,
        },
      });

      return reply.send({
        data: data.map((item) => ({
          id: item.id,
          title: item.title,
          body: item.body,
          link: item.link,
          isRead: item.isRead,
          createdAt: item.createdAt.toISOString(),
        })),
        hasMore,
        nextCursor,
        unread,
      });
    },
  );

  fastify.post<{ Body: z.infer<typeof SubscribeBodySchema> }>(
    "/subscribe",
    {
      preHandler: requireAuth,
      schema: { body: SubscribeBodySchema },
    },
    async (request, reply) => {
      const wallet = request.walletAddress;
      if (!wallet) {
        return reply.unauthorized("A valid JWT is required.");
      }

      const { endpoint, p256dh, auth } = request.body;

      await prisma.pushSubscription.upsert({
        where: { endpoint },
        update: {
          wallet,
          p256dh,
          auth,
        },
        create: {
          wallet,
          endpoint,
          p256dh,
          auth,
        },
      });

      return reply.send({ success: true });
    },
  );

  fastify.patch<{ Params: z.infer<typeof NotificationIdParamsSchema> }>(
    "/:id/read",
    {
      preHandler: requireAuth,
      schema: {
        params: NotificationIdParamsSchema,
      },
    },
    async (request, reply) => {
      const wallet = request.walletAddress;
      if (!wallet) {
        return reply.unauthorized("A valid JWT is required.");
      }

      const item = await prisma.notification.findUnique({ where: { id: request.params.id } });
      if (!item) {
        return reply.notFound("Notification not found.");
      }

      if (item.wallet !== wallet) {
        return reply.forbidden("Not your notification.");
      }

      await prisma.notification.update({
        where: { id: item.id },
        data: { isRead: true },
      });

      return reply.send({ success: true });
    },
  );

  fastify.patch(
    "/read-all",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const wallet = request.walletAddress;
      if (!wallet) {
        return reply.unauthorized("A valid JWT is required.");
      }

      await prisma.notification.updateMany({
        where: {
          wallet,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      return reply.send({ success: true });
    },
  );
}
