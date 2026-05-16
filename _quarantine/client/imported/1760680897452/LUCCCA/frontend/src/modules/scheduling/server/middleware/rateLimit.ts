import type { Request, Response, NextFunction } from "express";

// In-memory sliding window limiter (per IP)
export function rateLimit({
  windowMs = 60_000,
  max = 60,
}: { windowMs?: number; max?: number } = {}) {
  const hits = new Map<string, number[]>();
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (
      req.ip ||
      (req.headers["x-forwarded-for"] as string) ||
      req.socket.remoteAddress ||
      "unknown"
    ).toString();
    const now = Date.now();
    const since = now - windowMs;
    const arr = (hits.get(ip) || []).filter((t) => t > since);
    arr.push(now);
    hits.set(ip, arr);
    if (arr.length > max)
      return res.status(429).json({ error: "Too many requests" });
    next();
  };
}
