import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json({
    app: "BorrowRisk Vietnam",
    cluster: "devnet",
    executionConfigured: Boolean(
      process.env.PLAN_BINDING_SECRET &&
      process.env.PLAN_BINDING_SECRET.length >= 32 &&
      process.env.KAMINO_MARKET_ID &&
      process.env.KAMINO_COLLATERAL_RESERVE &&
      process.env.KAMINO_DEBT_RESERVE,
    ),
    aiConfigured: Boolean(
      process.env.AI_ENABLED === "true" && process.env.OPENROUTER_API_KEY && process.env.AI_MODEL,
    ),
    mode: "mvp",
  });
}
