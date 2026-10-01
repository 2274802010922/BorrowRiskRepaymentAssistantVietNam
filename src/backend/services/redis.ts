import { AppError } from "./http";
export async function redis(command: string[]) {
  const url = process.env.RATE_LIMIT_REDIS_URL,
    token = process.env.RATE_LIMIT_REDIS_TOKEN;
  if (!url?.startsWith("https://") || !token) throw new AppError("PLAN_STORE_NOT_CONFIGURED", 503);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("REDIS_HTTP");
    const result = await response.json();
    if (result.error) throw new Error("REDIS_COMMAND");
    return result.result as unknown;
  } catch {
    throw new AppError("PLAN_STORE_UNAVAILABLE", 503);
  }
}
