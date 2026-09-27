import { afterEach, expect, it, vi } from "vitest";
import { explain } from "../../backend/ai/explain";
import { exampleSnapshot } from "../fixtures/position";
afterEach(() => vi.unstubAllEnvs());
it("uses an explicitly labelled template without model configuration", async () => {
  vi.stubEnv("AI_ENABLED", "false");
  const result = await explain({
    snapshot: exampleSnapshot(),
    constraints: {
      budgetAtomic: "100000000",
      reserveAtomic: "50000000",
      targetLtvBps: 6000,
      shockBps: 2000,
    },
    locale: "vi",
  });
  expect(result.source).toBe("template");
  expect(result.text).toContain("chưa đạt mục tiêu");
  expect(result.text).toContain("120.000000");
});
