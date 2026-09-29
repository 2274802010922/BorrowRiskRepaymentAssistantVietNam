import { AppError } from "./http";

const windows = new Map<string, { count: number; expires: number }>();
export async function consumeBudget(kind: "ai" | "rpc") {
  const perMinute = kind === "ai" ? 10 : 120,
    perDay = kind === "ai" ? 300 : 10000;
  const url = process.env.RATE_LIMIT_REDIS_URL,
    token = process.env.RATE_LIMIT_REDIS_TOKEN;
  if (url && token) {
    if (!url.startsWith("https://")) throw new AppError("RATE_LIMIT_UNAVAILABLE", 503);
    // One global budget prevents a caller rotating IPs from exhausting provider spend.
    const lua =
      "local a=tonumber(redis.call('GET',KEYS[1]) or '0'); local b=tonumber(redis.call('GET',KEYS[2]) or '0'); if a>=tonumber(ARGV[1]) or b>=tonumber(ARGV[2]) then return 0 end; if redis.call('INCR',KEYS[1])==1 then redis.call('EXPIRE',KEYS[1],60) end; if redis.call('INCR',KEYS[2])==1 then redis.call('EXPIRE',KEYS[2],86400) end; return 1";
    try {
      const result = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify([
          "EVAL",
          lua,
          "2",
          `picachu:${kind}:minute`,
          `picachu:${kind}:day`,
          String(perMinute),
          String(perDay),
        ]),
        signal: AbortSignal.timeout(2500),
      });
      if (!result.ok) throw new AppError("RATE_LIMIT_UNAVAILABLE", 503);
      const data = await result.json();
      if (data.error || ![0, 1].includes(data.result))
        throw new AppError("RATE_LIMIT_UNAVAILABLE", 503);
      if (data.result === 0) throw new AppError("RATE_LIMITED", 429);
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("RATE_LIMIT_UNAVAILABLE", 503);
    }
  }
  // AI spend on production is fail-closed until a shared budget store is configured.
  if (kind === "ai" && process.env.VERCEL) throw new AppError("AI_BUDGET_NOT_CONFIGURED", 503);
  // Best effort for RPC/local development, not a cross-instance quota.
  const now = Date.now(),
    key = kind;
  let window = windows.get(key);
  if (!window || window.expires < now) {
    window = { count: 0, expires: now + 60000 };
    windows.set(key, window);
  }
  if (window.count >= perMinute) throw new AppError("RATE_LIMITED", 429);
  window.count++;
}
