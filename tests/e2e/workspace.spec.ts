import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const locale of ["vi", "en"])
  for (const width of [375, 768, 1024, 1440]) {
    test(`${locale} · ${width}px · routes remain readable`, async ({ page, context }) => {
      await context.addCookies([
        { name: "borrowrisk-locale", value: locale, domain: "127.0.0.1", path: "/" },
      ]);
      await page.setViewportSize({ width, height: 1000 });
      for (const route of ["/", "/workspace", "/guide", "/lab", "/setup"]) {
        await page.goto(route);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.locator("h1")).toBeVisible();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth + 1,
        );
        expect(overflow, route).toBe(false);
      }
      if (width === 375 || width === 1440) {
        await page.goto("/workspace");
        await page.screenshot({
          path: `test-results/workspace-${locale}-${width}.png`,
          fullPage: true,
        });
        await page.goto("/setup");
        await page.screenshot({
          path: `test-results/setup-${locale}-${width}.png`,
          fullPage: true,
        });
      }
    });
  }

test("budget validation never hides an already loaded position", async ({ page }) => {
  await page.goto("/workspace");
  await page.getByLabel("Ngân sách tối đa", { exact: false }).fill("-5");
  await expect(page.getByText("Vị thế giả định", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "Kiểm tra lại dữ liệu nhập" }),
  ).toBeVisible();
  await page.getByLabel("Ngân sách tối đa", { exact: false }).fill("100");
  await expect(page.getByText("Giảm một phần · chưa đạt mục tiêu", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Chuẩn bị giao dịch", exact: true })).toHaveCount(
    0,
  );
});

test("language persists across navigation and reload", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Ngôn ngữ").selectOption("en");
  await page.getByRole("link", { name: "Explore an example" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your loan, clearly.");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("mobile drawer traps focus, closes with Escape and returns focus", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/workspace");
  const trigger = page.getByRole("button", { name: "Mở điều hướng", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("lab never exposes signing, even in the verified fixture", async ({ page }) => {
  await page.goto("/lab");
  for (const state of ["error", "stale", "submitted", "confirmation_unknown", "verified"]) {
    await page.getByLabel("Tình huống cần kiểm tra").selectOption(state);
    await expect(page.getByRole("button", { name: /Ký giao dịch/ })).toBeDisabled();
    await expect(
      page.getByText("Toàn bộ trạng thái dưới đây là minh họa", { exact: true }),
    ).toBeVisible();
  }
});

test("missing Phantom is explained without pretending the wallet is connected", async ({
  page,
}) => {
  await page.goto("/workspace");
  await page.getByRole("button", { name: "Kết nối ví", exact: true }).click();
  await expect(page.getByText(/Chưa tìm thấy Phantom/)).toBeVisible();
});

for (const path of ["/", "/workspace", "/guide", "/lab", "/setup"])
  test(`accessibility ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
