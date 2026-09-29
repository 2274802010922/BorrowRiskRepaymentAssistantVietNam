import { expect, test } from "@playwright/test";
import { exampleSnapshot } from "../fixtures/position";
const wallet = "11111111111111111111111111111111";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ wallet }) => {
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
    { wallet },
  );
  await page.route("**/api/health", (route) =>
    route.fulfill({ json: { executionConfigured: true } }),
  );
});
test("connecting loads the wallet; refresh preserves budget and reserve; menu disconnects explicitly", async ({
  page,
}) => {
  const snapshot = {
    ...exampleSnapshot(),
    source: "devnet",
    protocol: "kamino",
    wallet,
    position: wallet,
    warnings: [],
    observedAt: new Date().toISOString(),
  };
  await page.route("**/api/positions/read", (route) =>
    route.fulfill({ json: { positions: [snapshot] } }),
  );
  await page.goto("/workspace");
  await page.getByRole("button", { name: "Kết nối ví", exact: true }).click();
  await expect(page.getByRole("button", { name: "Đọc ví của tôi", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByLabel("Ngân sách tối đa", { exact: false }).fill("75");
  await page.getByLabel("Tiền muốn giữ lại", { exact: false }).fill("60");
  await page.getByRole("button", { name: "Làm mới", exact: true }).click();
  await expect(page.getByLabel("Ngân sách tối đa", { exact: false })).toHaveValue("75");
  await expect(page.getByLabel("Tiền muốn giữ lại", { exact: false })).toHaveValue("60");
  await page.reload();
  await expect(page.getByRole("button", { name: "Làm mới", exact: true })).toBeVisible();
  await page.locator(".wallet-menu summary").click();
  await expect(page.getByRole("button", { name: "Sao chép địa chỉ" })).toBeVisible();
  await page.getByRole("button", { name: "Ngắt kết nối", exact: true }).click();
  await expect(page.getByRole("button", { name: "Kết nối ví", exact: true })).toBeVisible();
});
test("preparing locks monetary inputs and invalidates preview when the reserve changes afterwards", async ({
  page,
}) => {
  const snapshot = {
    ...exampleSnapshot(),
    source: "devnet",
    protocol: "kamino",
    wallet,
    position: wallet,
    warnings: [],
  };
  await page.route("**/api/positions/read", (route) =>
    route.fulfill({ json: { positions: [snapshot] } }),
  );
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/repayments/prepare", async (route) => {
    await barrier;
    await route.fulfill({
      json: {
        snapshot,
        token: "fixture",
        transaction: "",
        repayAtomic: "100000000",
        feeLamports: "5000",
        expiresAt: Date.now() + 90000,
        lastValidBlockHeight: 99,
        messageHash: "fixture",
      },
    });
  });
  await page.goto("/workspace");
  await page.getByRole("button", { name: "Kết nối ví", exact: true }).click();
  await page.getByRole("button", { name: "Chuẩn bị giao dịch", exact: true }).click();
  await expect(page.getByLabel("Ngân sách tối đa", { exact: false })).toBeDisabled();
  await expect(page.getByLabel("Tiền muốn giữ lại", { exact: false })).toBeDisabled();
  release();
  await expect(page.getByRole("button", { name: "Xác nhận trong ví", exact: true })).toBeVisible();
  await page.getByLabel("Tiền muốn giữ lại", { exact: false }).fill("70");
  await expect(page.getByRole("button", { name: "Xác nhận trong ví", exact: true })).toHaveCount(0);
});
test("debt-free demo offers a separately simulated withdrawal without pretending marker means a loan", async ({
  page,
}) => {
  let operation: string | undefined;
  await page.route("**/api/demo", (route) => {
    const body = route.request().postDataJSON();
    if (body.action === "check")
      return route.fulfill({
        json: {
          stage: "closed",
          canWithdraw: true,
          position: wallet,
          walletSol: "100000000",
          collateralAtomic: "100000000",
          debtAtomic: "0",
          maxBorrowAtomic: "0",
          debtSymbol: "USDC",
          config: { market: wallet, collateral: wallet, debt: wallet },
        },
      });
    operation = body.operation;
    return route.fulfill({
      json: {
        stage: "withdraw",
        amountAtomic: "100000000",
        feeLamports: "5000",
        token: "fixture",
        transaction: "",
        position: wallet,
        expiresAt: Date.now() + 60000,
      },
    });
  });
  await page.goto("/setup");
  await page.getByRole("button", { name: "Kết nối ví", exact: true }).last().click();
  await page.getByRole("button", { name: "Kiểm tra điều kiện", exact: true }).click();
  await expect(page.getByText(/không tự chứng minh từng có khoản vay/)).toBeVisible();
  await page.getByRole("button", { name: "Xem trước rút toàn bộ thế chấp", exact: true }).click();
  await expect(page.getByRole("button", { name: "Xác nhận trong ví", exact: true })).toBeVisible();
  expect(operation).toBe("withdraw");
});
