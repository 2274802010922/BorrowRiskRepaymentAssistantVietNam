import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir("work/final-demo", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:3100/portfolio");
await page.evaluate(() => document.fonts.ready);
const result = page.locator(".panel.goal-section").nth(2);
await result.scrollIntoViewIfNeeded();
const box = await result.boundingBox();
await page.screenshot({
  path: "work/final-demo/goal-result-focus.png",
  clip: { x: box.x, y: box.y, width: box.width, height: Math.min(290, box.height) },
});
await page.getByText("Nhập mục tiêu bằng câu ngắn", { exact: true }).click();
await page
  .getByLabel("Mục tiêu của bạn", { exact: true })
  .fill("Trả tối đa 10 USDC, giữ 1 USDC, nếu SOL giảm 30%");
await page.getByRole("button", { name: "Tạo bản nháp", exact: true }).click();
await page.getByText("Xem lại bản nháp trước khi áp dụng", { exact: true }).waitFor();
await page
  .locator("details.goal-section")
  .filter({ hasText: "Nhập mục tiêu bằng câu ngắn" })
  .screenshot({ path: "work/final-demo/goal-draft.png" });
await browser.close();
