import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { examplePortfolio } from "../../shared/examples/portfolio";
import { planPortfolio } from "../../core/repayment/portfolio";

test("updated repayment quote requires review before opening the wallet", async ({ page }) => {
  const wallet = "11111111111111111111111111111111",
    portfolio = examplePortfolio();
  portfolio.positions = portfolio.positions.map((s) => ({
    ...s,
    wallet,
    source: "devnet",
    protocol: "kamino",
    warnings: [],
  }));
  const goal = {
      budgetAtomic: "30000000",
      reserveAtomic: "20000000",
      shockBps: 3000,
      bufferBps: 500,
    },
    plan = planPortfolio(portfolio, goal);
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
  await page.route("**/api/portfolio/read", (route) =>
    route.fulfill({ json: { positions: portfolio.positions } }),
  );
  await page.route("**/api/plans", (route) =>
    route.fulfill({ json: { token: "fixture", plan, portfolio, expiresAt: Date.now() + 60000 } }),
  );
  await page.route("**/api/plans/status", (route) =>
    route.fulfill({ json: { phase: "ready", cursor: 0, receipts: [] } }),
  );
  await page.route("**/api/plans/prepare", (route) =>
    route.fulfill({
      json: {
        token: "fixture-binding",
        transaction: "not-signed-in-this-test",
        expiresAt: Date.now() + 60000,
        repayAtomic: "11800100",
        feeLamports: "6000",
        step: 1,
        total: 2,
        lastValidBlockHeight: 123,
        plan: { ...plan, totalRepayAtomic: "13600100", walletAfterAtomic: "66399900" },
        portfolio,
        reviewRequired: true,
      },
    }),
  );
  await page.goto("/portfolio");
  await page.getByRole("button", { name: "Chuẩn bị bước trả nợ", exact: true }).click();
  await expect(page.getByText("Phương án vừa được cập nhật", { exact: true })).toBeVisible();
  const sign = page.getByRole("button", { name: "Ký bằng ví", exact: true });
  await expect(sign).toBeDisabled();
  await page.getByLabel("Tôi đã xem lại phương án mới").check();
  await expect(sign).toBeEnabled();
});
test("a failed wallet read is never presented as an empty loan portfolio", async ({ page }) => {
  const wallet = "11111111111111111111111111111111";
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
  await page.route("**/api/portfolio/read", (route) =>
    route.fulfill({
      status: 503,
      json: { error: { code: "SERVICE_UNAVAILABLE", requestId: "test-only" } },
    }),
  );
  await page.goto("/portfolio");
  await expect(
    page.getByText("Chưa đọc được khoản vay. Hãy làm mới để thử lại.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Chưa có khoản vay được hỗ trợ.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Chuẩn bị bước trả nợ", exact: true })).toHaveCount(
    0,
  );
});
test("goal planner shows exact minimal repayment and blocks unsupported partial allocation", async ({
  page,
}) => {
  await page.goto("/portfolio");
  await expect(page.getByText("13,6 USDC", { exact: true })).toBeVisible();
  await page.getByLabel("Trả tối đa (USDC)").fill("10");
  await expect(page.getByText("Chưa đủ ngân sách", { exact: true })).toBeVisible();
  await expect(page.getByText(/Cần thêm 3,6 USDC/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Ký bằng ví|Chuẩn bị bước trả nợ/ })).toHaveCount(
    0,
  );
  await page.getByLabel("Trả tối đa (USDC)").fill("-1");
  await expect(page.getByRole("alert").filter({ hasText: "Kiểm tra số đã nhập" })).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(3);
});
test("goal planner supports a single selected loan and debt goal remains explicit", async ({
  page,
}) => {
  await page.goto("/portfolio");
  await page.getByRole("checkbox").nth(1).uncheck();
  await page.getByRole("checkbox").nth(2).uncheck();
  await expect(page.getByText("11,8 USDC", { exact: true })).toBeVisible();
  await page.getByLabel("Nếu giá SOL giảm (%)").selectOption("10");
  await expect(page.getByText("Đã đạt mục tiêu", { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test("a pending portfolio plan survives reload and blocks the next signature", async ({ page }) => {
  const wallet = "11111111111111111111111111111111",
    portfolio = examplePortfolio();
  portfolio.positions = portfolio.positions.map((s) => ({
    ...s,
    wallet,
    source: "devnet",
    protocol: "kamino",
    warnings: [],
  }));
  const goal = {
    budgetAtomic: "30000000",
    reserveAtomic: "20000000",
    shockBps: 3000,
    bufferBps: 500,
  };
  await page.addInitScript(
    ({ wallet, session }) => {
      localStorage.setItem("picachu-wallet-connected", "true");
      localStorage.setItem(`picachu-goal-plan:${wallet}`, JSON.stringify(session));
      Object.defineProperty(window, "phantom", {
        value: {
          solana: {
            isPhantom: true,
            publicKey: { toBase58: () => wallet },
            connect: async () => ({ publicKey: { toBase58: () => wallet } }),
            disconnect: async () => {},
            on: () => {},
            removeListener: () => {},
            signTransaction: async () => {
              throw new Error("No signing in this test");
            },
          },
        },
      });
    },
    {
      wallet,
      session: {
        token: "fixture-plan",
        portfolio,
        goal,
        plan: planPortfolio(portfolio, goal),
        pending: true,
        expiresAt: Date.now() + 60000,
      },
    },
  );
  await page.route("**/api/portfolio/read", (route) =>
    route.fulfill({ json: { positions: portfolio.positions } }),
  );
  await page.route("**/api/plans/status", (route) =>
    route.fulfill({ json: { phase: "confirmation_unknown", cursor: 0, receipts: [] } }),
  );
  await page.goto("/portfolio");
  await expect(
    page.getByText("Đang chờ xác minh · chưa gửi bước tiếp theo", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Đang chờ xác minh · chưa gửi bước tiếp theo", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Chuẩn bị bước trả nợ", exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByLabel("Trả tối đa (USDC)")).toBeDisabled();
});
