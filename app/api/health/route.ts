import { NextResponse } from "next/server";
import { executionReadiness } from "../../../backend/services/readiness";
export function GET() {
  const execution = executionReadiness();
  return NextResponse.json(
    {
      app: "picachu",
      cluster: "devnet",
      executionConfigured: execution.configured,
      execution,
      aiConfigured: Boolean(
        process.env.AI_ENABLED === "true" && process.env.OPENROUTER_API_KEY && process.env.AI_MODEL,
      ),
      mode: "mvp",
      portfolioPlanStoreConfigured: Boolean(
        process.env.RATE_LIMIT_REDIS_URL && process.env.RATE_LIMIT_REDIS_TOKEN,
      ),
      allocator: { available: false, reason: "LIQUIDATION_PARITY_NOT_VERIFIED" },
      aiSharedBudgetConfigured: Boolean(
        process.env.RATE_LIMIT_REDIS_URL && process.env.RATE_LIMIT_REDIS_TOKEN,
      ),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
