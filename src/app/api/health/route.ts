import { NextResponse } from "next/server";
import { executionReadiness } from "../../../backend/services/readiness";
import { liquidationManifest } from "../../../core/liquidation/manifest";
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
      allocator: {
        available: liquidationManifest.verified && execution.configured,
        modelVerified: liquidationManifest.verified,
        modelVersion: liquidationManifest.version,
        evidence: liquidationManifest.evidence,
        checkedPerQuote: true,
        scope: "solvent price-triggered SOL/USDC, no e-mode",
      },
      aiSharedBudgetConfigured: Boolean(
        process.env.RATE_LIMIT_REDIS_URL && process.env.RATE_LIMIT_REDIS_TOKEN,
      ),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
