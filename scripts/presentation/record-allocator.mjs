import { chromium } from "@playwright/test";
import { mkdir, copyFile, writeFile } from "node:fs/promises";
const root = "work/allocator-video";
await mkdir(root + "/raw", { recursive: true });
const browser = await chromium.launch(),
  context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: root + "/raw", size: { width: 1280, height: 720 } },
  }),
  page = await context.newPage(),
  video = page.video(),
  start = performance.now(),
  events = [];
const mark = (name) => {
  const seconds = (performance.now() - start) / 1000;
  events.push({ name, seconds });
  console.log(name, seconds.toFixed(1));
};
try {
  mark("Giao diện thật trên Vercel. Các số liệu đầu video là minh họa.");
  await page.goto("https://picachu-iota.vercel.app/portfolio", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4500);
  await page
    .getByRole("heading", { name: "2. Đặt mục tiêu", exact: true })
    .scrollIntoViewIfNeeded();
  mark("Số dư dùng chung, ngân sách và tiền muốn giữ lại.");
  await page.waitForTimeout(6500);
  await page.getByLabel("Trả tối đa (USDC)").fill("10");
  await page
    .getByRole("heading", { name: "3. Phương án của bạn", exact: true })
    .scrollIntoViewIfNeeded();
  mark("10 USDC chưa đủ để đạt tất cả mục tiêu. Còn thiếu 3,6 USDC.");
  await page.waitForTimeout(6500);
  await page.getByRole("button", { name: "Xem cách phân bổ tiền", exact: true }).click();
  await page.getByText("Cải thiện một phần", { exact: true }).waitFor({ timeout: 25000 });
  mark("Phân bổ theo mô hình một lượt thanh lý. Chưa đạt mọi mục tiêu.");
  await page.waitForTimeout(8500);
  await page.getByText("Vì sao phân bổ như vậy?", { exact: true }).scrollIntoViewIfNeeded();
  mark("Core tính số tiền và tổn thất. Phí được tính riêng, giữ tiền chưa dùng.");
  await page.waitForTimeout(7000);
  await page.getByText("So sánh cách trả", { exact: true }).click();
  await page.getByRole("table").scrollIntoViewIfNeeded();
  mark("So với không trả, chia đều và ưu tiên rủi ro trên cùng dữ liệu.");
  await page.waitForTimeout(7500);
  await page.getByText("Chi tiết tính toán", { exact: true }).click();
  await page.getByText("Chi tiết tính toán", { exact: true }).scrollIntoViewIfNeeded();
  mark("Tốt nhất trong lưới hữu hạn. Không dự báo xác suất hay thanh lý dây chuyền.");
  await page.waitForTimeout(6500);
  await page.goto(
    "https://explorer.solana.com/tx/2HL9xJn4h59Z5gUxfDmJDUVedVpbjQYpKx8MWrTcZu3T5sWUbto1K5boayZz2L1PTjrfon39kLb8MXw4znYUosPB?cluster=devnet",
    { waitUntil: "domcontentloaded" },
  );
  await page.getByText("Success", { exact: true }).first().waitFor({ timeout: 25000 });
  mark("Receipt riêng: ví test ký qua API, trả 0,780982 USDC. Không quay popup Phantom.");
  await page.waitForTimeout(10500);
} finally {
  await context.close();
  await copyFile(await video.path(), root + "/live-capture.webm");
  await writeFile(
    root + "/capture-events.json",
    JSON.stringify(
      {
        base: "https://picachu-iota.vercel.app",
        events,
        scope:
          "Actual Vercel UI with clearly synthetic figures, then a real verified Devnet receipt from the separately executed dedicated API test signer. No wallet signing footage, no transaction sent by this recording.",
      },
      null,
      2,
    ),
  );
  await browser.close();
}
