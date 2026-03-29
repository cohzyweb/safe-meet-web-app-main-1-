import { Redis } from "ioredis";

type RedisClient = Redis;

declare global {
  var __redisClient: RedisClient | undefined;
}

const redisUrl = process.env["REDIS_URL"] ?? "redis://redis:6379";

export const redis =
  globalThis.__redisClient ??
  new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });

if (process.env["NODE_ENV"] !== "production") {
  globalThis.__redisClient = redis;
}
