// Exact parsing for the UI form contract; this is NOT a repayment planner.
export function parseUsdcInput(value: string): bigint | null {
  const input = value.trim();
  if (!/^\d{1,12}(?:\.\d{1,6})?$/.test(input)) return null;
  const [whole, fraction = ""] = input.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
}

export function validateBudgetForm(budget: string, reserve: string, wallet: string) {
  const budgetValue = parseUsdcInput(budget);
  const reserveValue = parseUsdcInput(reserve);
  const walletValue = parseUsdcInput(wallet);
  return {
    budget: budgetValue === null || budgetValue === 0n ? "positive_amount" : null,
    reserve:
      reserveValue === null
        ? "valid_amount"
        : walletValue === null || reserveValue > walletValue
          ? "reserve_exceeds_balance"
          : null,
  } as const;
}
