import { expect, test } from "@playwright/test";
test("compact explanations keep exact facts and picachu branding", async ({ page }) => {
  await page.goto("/workspace");
  await expect(page.getByRole("link", { name: "picachu", exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Giải thích kết quả", exact: true }).click();
  await expect(
    page.getByText("Trả 100 USDC, còn 50 USDC trong ví.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Cần trả thêm 20 USDC/)).toBeVisible();
  await expect(page.locator(".explanation-brief")).not.toContainText("50.000000");
});
test("setup fails closed on stale oracle and never asks for a signature", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "phantom", {
      value: {
        solana: {
          isPhantom: true,
          publicKey: { toBase58: () => "11111111111111111111111111111111" },
          connect: async () => ({
            publicKey: { toBase58: () => "11111111111111111111111111111111" },
          }),
          disconnect: async () => {},
          on: () => {},
          removeListener: () => {},
          signTransaction: async () => {
            throw new Error("Signing must not be reached");
          },
        },
      },
    });
  });
  await page.route("**/api/demo", (route) =>
    route.fulfill({ status: 400, json: { error: { code: "STALE_DATA" } } }),
  );
  await page.goto("/setup");
  await page.getByRole("button", { name: "Kết nối ví", exact: true }).last().click();
  await page.getByRole("button", { name: "Kiểm tra điều kiện", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Dữ liệu hoặc giá đã cũ" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Xác nhận trong ví", exact: true })).toHaveCount(0);
});
test("setup restores an unresolved transaction after reload", async ({ page }) => {
  const wallet = "11111111111111111111111111111111";
  await page.addInitScript(
    ({ wallet }) => {
      localStorage.setItem(
        "picachu-demo-pending",
        JSON.stringify({
          [wallet]: {
            wallet,
            token: "fixture-binding",
            signature: "1".repeat(64),
            stage: "deposit",
          },
        }),
      );
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
  await page.route("**/api/demo", (route) => route.fulfill({ json: { phase: "pending" } }));
  await page.goto("/setup");
  await page.getByRole("button", { name: "Kết nối ví", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: "Tiếp tục giao dịch đang chờ" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Kết nối ví", exact: true }).last().click();
  await page.getByRole("button", { name: "Kiểm tra kết quả", exact: true }).click();
  await expect(page.getByText(/Đang chờ xác nhận hoặc đối chiếu/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Xem trước giao dịch", exact: true })).toHaveCount(
    0,
  );
});
