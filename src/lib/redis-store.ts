import { Redis } from "@upstash/redis";
import type { AppData } from "./types";
import { parseAppData } from "./validate";

function client(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

const REDIS_PREFIX = "taskpath:v1:";
const REDIS_PREFIX_LEGACY = "algo-todo:v1:";

const key = (userId: string) => `${REDIS_PREFIX}${userId}`;
const legacyKey = (userId: string) => `${REDIS_PREFIX_LEGACY}${userId}`;

export async function loadFromRedis(userId: string): Promise<AppData | null> {
  const r = client();
  if (!r) return null;
  let raw = await r.get(key(userId));
  if (raw == null) raw = await r.get(legacyKey(userId));
  if (raw == null) return null;
  const str = typeof raw === "string" ? raw : JSON.stringify(raw);
  return parseAppData(JSON.parse(str));
}

export async function saveToRedis(userId: string, data: AppData): Promise<void> {
  const r = client();
  if (!r) throw new Error("Redis not configured");
  const payload = JSON.stringify(data);
  await r.set(key(userId), payload);
  try {
    await r.del(legacyKey(userId));
  } catch {
    /* ignore */
  }
}
