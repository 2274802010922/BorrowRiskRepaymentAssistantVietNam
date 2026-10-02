import { goalSchema, type RepaymentGoal } from "../../shared/portfolio";
import { parseUsdcInput } from "./amount-input";

// Extract only explicit numeric goals. Ambiguous/missing fields never become wallet instructions.
export function explicitGoal(
  text: string,
  locale: "vi" | "en",
):
  | { status: "ready"; goal: RepaymentGoal; defaultBuffer: boolean }
  | { status: "needs_clarification" } {
  const normalized = text.normalize("NFC"),
    input = normalized.toLowerCase();
  if (
    input.length > 300 ||
    /https?:|[<>]|\b(ignore|system|seed|private key|password|not|don't)\b|bỏ qua hướng dẫn|không|đừng|sk-[a-z0-9-]+/i.test(
      input,
    ) ||
    /\b[1-9A-HJ-NP-Za-km-z]{32,88}\b/.test(normalized)
  )
    return { status: "needs_clarification" };
  const value = (pattern: RegExp) => {
    const matches = [...input.matchAll(pattern)];
    if (matches.length !== 1) return null;
    const raw = matches[0][1];
    if (raw.includes(",") && (locale === "en" || /,\d{3}$/.test(raw))) return null;
    return raw.replace(",", ".");
  };
  const amount = "([0-9]{1,12}(?:[.,][0-9]{1,6})?)";
  const budget = value(
    new RegExp(
      `(?:trả tối đa|trả tối đa là|ngân sách|budget|repay up to|pay up to)\\s*:?\\s*${amount}\\s*usdc`,
      "g",
    ),
  );
  const reserve = value(
    new RegExp(`(?:giữ lại|giữ|dự trữ|keep|reserve)\\s*:?\\s*${amount}\\s*usdc`, "g"),
  );
  const shock = value(
    /(?:sol\s*(?:giảm|giảm giá|falls?|drops?)|giá sol giảm)\s*:?\s*([0-9]{1,2}(?:[.,][0-9]{1,2})?)\s*%/g,
  );
  const bufferMatches = /(?:dư địa|buffer)/.test(input);
  const buffer = value(/(?:dư địa|buffer)\s*:?\s*([0-9]{1,2}(?:[.,][0-9]{1,2})?)\s*%/g);
  if (budget === null || reserve === null || shock === null || (bufferMatches && buffer === null))
    return { status: "needs_clarification" };
  const budgetAtomic = parseUsdcInput(budget),
    reserveAtomic = parseUsdcInput(reserve);
  if (budgetAtomic === null || reserveAtomic === null) return { status: "needs_clarification" };
  const result = goalSchema.safeParse({
    budgetAtomic: budgetAtomic.toString(),
    reserveAtomic: reserveAtomic.toString(),
    shockBps: Math.round(Number(shock) * 100),
    bufferBps: buffer === null ? 500 : Math.round(Number(buffer) * 100),
  });
  return result.success
    ? { status: "ready", goal: result.data, defaultBuffer: buffer === null }
    : { status: "needs_clarification" };
}
