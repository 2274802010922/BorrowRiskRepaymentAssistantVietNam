import { expect, test } from "@playwright/test";
test("unconfigured Web3 APIs return structured errors instead of opaque 500", async ({
  request,
}) => {
  const health = await (await request.get("/api/health")).json();
  test.skip(health.executionConfigured, "This diagnostic expects an unconfigured test environment");
  for (const [url, data] of [
    ["/api/demo", { action: "check", wallet: "11111111111111111111111111111111" }],
    ["/api/positions/read", { wallet: "11111111111111111111111111111111" }],
    ["/api/repayments/prepare", {}],
  ] as const) {
    const response = await request.post(url, { data });
    expect(response.status()).toBe(503);
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(await response.json()).toMatchObject({
      error: { code: "EXECUTION_NOT_CONFIGURED", requestId: expect.any(String) },
    });
  }
});
