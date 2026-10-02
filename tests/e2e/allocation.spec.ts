import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { exampleAllocationContext } from "../../src/core/allocation/example";
import { planAllocation } from "../../src/core/allocation/plan";
import { mkdir } from "node:fs/promises";

test("example allocation improves the scenario while remaining clearly non-executable", async ({
  page,
}) => {
  await page.goto("/portfolio");
  await page.getByLabel("Trả tối đa (USDC)").fill("10");
  await page.getByRole("button", { name: "Xem cách phân bổ tiền", exact: true }).click();
  await expect(page.getByText("Cải thiện một phần", { exact: true })).toBeVisible();
  await expect(page.getByText("Chưa đạt mục tiêu", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Ký bằng ví", exact: true })).toHaveCount(0);
  await page.getByText("So sánh cách trả", { exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("50.00000");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test("unsupported data produces an explanation and no signing action", async ({ page }) => {
  await page.route("**/api/portfolio/allocate", (r) =>
    r.fulfill({ json: { state: "unavailable", reason: "LIQUIDATION_PROGRAM_CHANGED" } }),
  );
  await page.goto("/portfolio");
  await page.getByLabel("Trả tối đa (USDC)").fill("10");
  await page.getByRole("button", { name: "Xem cách phân bổ tiền", exact: true }).click();
  await expect(
    page.getByText(
      "Phiên bản Kamino đã đổi so với bản đối chứng. Phân bổ được tạm chặn để kiểm chứng lại.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Ký bằng ví", exact: true })).toHaveCount(0);
});
test("partial acceptance and changed quote review are required before wallet signing", async ({
  page,
}) => {
  const wallet = "11111111111111111111111111111111",
    context = exampleAllocationContext(3000),
    goal = { budgetAtomic: "10000000", reserveAtomic: "20000000", shockBps: 3000, bufferBps: 500 };
  context.portfolio.positions = context.portfolio.positions.map((s) => ({
    ...s,
    wallet,
    source: "devnet",
    protocol: "kamino",
  }));
  const plan = planAllocation(context, goal),
    portfolio = context.portfolio;
  await page.addInitScript(
    ({ wallet }) => {
      localStorage.setItem("picachu-wallet-connected", "true");
      Object.defineProperty(window, "phantom", {
        value: {
          solana: {
            isPhantom: true,
            publicKey: { toBase58: () => wallet },
            connect: async () => ({ publicKey: { toBase58: () => wallet } }),
            disconnect: async () => {},
            on: () => {},
            removeListener: () => {},
          },
        },
      });
    },
    { wallet },
  );
  await page.route("**/api/portfolio/read", (r) =>
    r.fulfill({ json: { positions: portfolio.positions } }),
  );
  await page.route("**/api/portfolio/allocate", (r) =>
    r.fulfill({
      json: {
        state: "ready",
        token: "fixture-quote",
        executionAllowed: true,
        expiresAt: Date.now() + 90000,
        plan,
        portfolio,
      },
    }),
  );
  await page.route("**/api/plans", (r) => {
    expect(r.request().postDataJSON()).toMatchObject({
      mode: "loss-allocation-v1",
      acceptedPartial: true,
      quoteToken: "fixture-quote",
    });
    return r.fulfill({
      json: { token: "fixture-plan", plan, portfolio, expiresAt: Date.now() + 90000 },
    });
  });
  await page.route("**/api/plans/prepare", (r) =>
    r.fulfill({
      json: {
        token: "fixture-binding",
        transaction: "no-real-signature-in-this-test",
        expiresAt: Date.now() + 90000,
        repayAtomic: plan.totalRepayAtomic,
        feeLamports: "6000",
        step: 1,
        total: 1,
        lastValidBlockHeight: 123,
        plan,
        portfolio,
        reviewRequired: true,
      },
    }),
  );
  await page.route("**/api/plans/status", (r) =>
    r.fulfill({ json: { phase: "ready", cursor: 0, receipts: [] } }),
  );
  await page.goto("/portfolio");
  await page.getByLabel("Trả tối đa (USDC)").fill("10");
  await page.getByRole("button", { name: "Xem cách phân bổ tiền", exact: true }).click();
  const prepare = page.getByRole("button", { name: "Chuẩn bị bước trả nợ", exact: true });
  await expect(prepare).toBeDisabled();
  await page
    .getByLabel("Tôi đã xem phân bổ và chấp nhận trả một phần; chưa đạt mọi mục tiêu.")
    .check();
  await prepare.click();
  const sign = page.getByRole("button", { name: "Ký bằng ví", exact: true });
  await expect(sign).toBeDisabled();
  await page.getByLabel("Tôi đã xem lại phương án mới").check();
  await expect(sign).toBeEnabled();
});
for (const width of [375, 768, 1024, 1440])
  for (const locale of ["vi", "en"] as const) {
    test(`allocation remains readable ${locale} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/portfolio");
      if (locale === "en")
        await page.getByRole("combobox", { name: "Ngôn ngữ" }).selectOption("en");
      await page
        .getByLabel(locale === "vi" ? "Trả tối đa (USDC)" : "Maximum repayment (USDC)")
        .fill("10");
      await page
        .getByRole("button", {
          name: locale === "vi" ? "Xem cách phân bổ tiền" : "Explore repayment allocation",
          exact: true,
        })
        .click();
      await expect(
        page.getByText(locale === "vi" ? "Cải thiện một phần" : "Partial improvement", {
          exact: true,
        }),
      ).toBeVisible();
      await page
        .getByText(locale === "vi" ? "So sánh cách trả" : "Compare repayment approaches", {
          exact: true,
        })
        .click();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await expect(page.getByRole("table")).toBeVisible();
      await mkdir("work/allocator-ui", { recursive: true });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.screenshot({ path: `work/allocator-ui/${locale}-${width}.png`, fullPage: true });
    });
  }
