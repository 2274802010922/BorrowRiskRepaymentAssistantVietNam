import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve("work/bilingual-demo");
const script = JSON.parse(await readFile(path.join(root, "script.json"), "utf8"));
const locale = process.argv[2] || "vi";
const t = (vi, en) => (locale === "vi" ? vi : en);
await mkdir(path.join(root, "raw", locale), { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: path.join(root, "raw", locale), size: { width: 1280, height: 720 } },
});
await context.addCookies([{ name: "borrowrisk-locale", value: locale, url: script.base }]);
const page = await context.newPage();
const video = page.video();
const origin = performance.now();
const events = [];
const responses = [];
page.on("response", async (response) => {
  if (
    response.url().includes("/api/portfolio/allocate") ||
    response.url().includes("/api/goals/draft")
  ) {
    responses.push({
      url: response.url(),
      status: response.status(),
      body: await response.json().catch(() => null),
    });
  }
});
const wait = (seconds) => page.waitForTimeout(Math.max(0, seconds * 1000));
const shot = async (id, actions) => {
  const scene = script.scenes.find((s) => s.id === id);
  const audio = JSON.parse(await readFile(path.join(root, "audio", locale, id + ".json"), "utf8"));
  const start = (performance.now() - origin) / 1000;
  const desired = (audio.duration + 0.4) * scene.speed;
  console.log("START", locale, id, desired.toFixed(2));
  await actions(desired);
  await wait(desired - ((performance.now() - origin) / 1000 - start));
  const end = (performance.now() - origin) / 1000;
  await page.screenshot({ path: path.join(root, "raw", locale, id + ".png") });
  events.push({ id, start, end, speed: scene.speed, audioDuration: audio.duration });
  console.log("DONE", locale, id, (end - start).toFixed(2));
};
async function focus(locator, offset = 100) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (box) await page.mouse.wheel(0, box.y - offset);
  await wait(0.7);
}
async function point(locator) {
  const box = await locator.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 });
}
try {
  await page.goto(script.base, { waitUntil: "networkidle" });
  await page
    .getByRole("link", { name: t("Thử với dữ liệu minh họa", "Explore an example"), exact: true })
    .waitFor();
  await shot("intro", async () => {
    await wait(4);
    await point(
      page.getByRole("link", {
        name: t("Thử với dữ liệu minh họa", "Explore an example"),
        exact: true,
      }),
    );
  });
  await shot("loans", async (duration) => {
    await page
      .getByRole("link", { name: t("Thử với dữ liệu minh họa", "Explore an example"), exact: true })
      .click();
    await page
      .getByRole("heading", { name: t("1. Chọn khoản vay", "1. Choose loans"), exact: true })
      .waitFor();
    await focus(
      page.getByRole("heading", { name: t("1. Chọn khoản vay", "1. Choose loans"), exact: true }),
      190,
    );
    await wait(duration * 0.32);
    // Real checkbox selection demonstrates that the plan reacts to the chosen loans.
    const boxes = page.getByRole("checkbox");
    await boxes.nth(2).uncheck();
    await wait(1.1);
    await boxes.nth(2).check();
    await wait(duration * 0.23);
    await focus(
      page.getByRole("heading", { name: t("2. Đặt mục tiêu", "2. Set your goal"), exact: true }),
    );
  });
  await shot("goals", async (duration) => {
    await page
      .getByLabel(t("Tiền muốn giữ lại (USDC)", "Keep in wallet (USDC)"), { exact: true })
      .fill("20");
    await page
      .getByLabel(t("Trả tối đa (USDC)", "Maximum repayment (USDC)"), { exact: true })
      .fill("30");
    await page.getByLabel(t("Nếu giá SOL giảm (%)", "If SOL price falls (%)")).selectOption("30");
    await wait(duration * 0.35);
    await page.getByText(t("Điều chỉnh mục tiêu", "Adjust goal"), { exact: true }).click();
    await page
      .getByLabel(
        t(
          "Dư địa giảm giá thêm sau kịch bản (%)",
          "Additional price buffer after the scenario (%)",
        ),
        { exact: true },
      )
      .fill("5");
    await point(
      page.getByLabel(
        t(
          "Dư địa giảm giá thêm sau kịch bản (%)",
          "Additional price buffer after the scenario (%)",
        ),
        { exact: true },
      ),
    );
    await wait(duration * 0.24);
    await page.getByText(t("Điều chỉnh mục tiêu", "Adjust goal"), { exact: true }).click();
  });
  await shot("full-result", async (duration) => {
    await focus(
      page.getByRole("heading", { name: t("3. Phương án của bạn", "3. Your plan"), exact: true }),
    );
    await page
      .getByText(t("Có thể đạt mục tiêu", "The goal is achievable"), { exact: true })
      .waitFor();
    await wait(duration * 0.35);
    await point(page.locator(".goal-result").first());
    await wait(duration * 0.2);
    await point(page.locator(".goal-result").nth(1));
  });
  await shot("draft", async (duration) => {
    await page
      .getByText(t("Nhập mục tiêu bằng câu ngắn", "Describe your goal"), { exact: true })
      .click();
    await focus(page.getByLabel(t("Mục tiêu của bạn", "Your goal"), { exact: true }), 145);
    await page
      .getByLabel(t("Mục tiêu của bạn", "Your goal"), { exact: true })
      .pressSequentially(
        t(
          "Trả tối đa 10 USDC, giữ 20 USDC, nếu SOL giảm 30%",
          "Repay up to 10 USDC, keep 20 USDC, if SOL falls 30%",
        ),
        { delay: 50 },
      );
    await page
      .getByRole("button", { name: t("Tạo bản nháp", "Create draft"), exact: true })
      .click();
    await page
      .getByText(t("Xem lại bản nháp trước khi áp dụng", "Review the draft before applying"), {
        exact: true,
      })
      .waitFor({ timeout: 60000 });
    await focus(
      page.getByText(t("Xem lại bản nháp trước khi áp dụng", "Review the draft before applying"), {
        exact: true,
      }),
      330,
    );
    await wait(Math.min(8, duration * 0.25));
    await page
      .getByRole("button", { name: t("Áp dụng mục tiêu này", "Apply this goal"), exact: true })
      .click();
    await page
      .getByText(t("Nhập mục tiêu bằng câu ngắn", "Describe your goal"), { exact: true })
      .click();
  });
  await shot("shortfall", async () => {
    await focus(
      page.getByRole("heading", { name: t("3. Phương án của bạn", "3. Your plan"), exact: true }),
    );
    await page
      .getByText(t("Chưa đủ ngân sách", "Budget is insufficient"), { exact: true })
      .waitFor();
    await wait(4);
    await point(
      page.getByRole("button", {
        name: t("Xem cách phân bổ tiền", "Explore repayment allocation"),
        exact: true,
      }),
    );
  });
  await shot("allocation", async () => {
    await page
      .getByRole("button", {
        name: t("Xem cách phân bổ tiền", "Explore repayment allocation"),
        exact: true,
      })
      .click();
    await page
      .getByText(t("Cải thiện một phần", "Partial improvement"), { exact: true })
      .waitFor({ timeout: 45000 });
    await focus(
      page.getByRole("heading", { name: t("3. Phương án của bạn", "3. Your plan"), exact: true }),
    );
    await wait(5);
    await focus(
      page.getByText(t("Vì sao phân bổ như vậy?", "Why this allocation?"), { exact: true }),
      280,
    );
    await wait(5);
    await page
      .getByText(t("So sánh cách trả", "Compare repayment approaches"), { exact: true })
      .click();
    await focus(page.getByRole("table"), 380);
    await wait(7);
    await page.getByText(t("Chi tiết tính toán", "Calculation details"), { exact: true }).click();
    await focus(
      page.getByText(t("Chi tiết tính toán", "Calculation details"), { exact: true }),
      435,
    );
  });
  await shot("execution", async () => {
    await page.goto(pathToFileURL(path.join(root, "workflow-" + locale + ".html")).href);
    await wait(4);
    await page.locator("#step-2").hover();
    await wait(5);
    await page.locator("#step-3").hover();
    await wait(5);
    await page.locator("#step-4").hover();
  });
  await shot("receipt", async (duration) => {
    await page.goto(pathToFileURL(path.join(root, "receipt-" + locale + ".html")).href);
    await wait(duration * 0.5);
    await page.goto("https://explorer.solana.com/tx/" + script.receipt + "?cluster=devnet", {
      waitUntil: "domcontentloaded",
    });
    await page.getByText("Success", { exact: true }).first().waitFor({ timeout: 30000 });
    await page.locator("body").click({ position: { x: 30, y: 350 } });
  });
  await shot("close", async (duration) => {
    await page.goto(pathToFileURL(path.join(root, "scope-" + locale + ".html")).href);
    await wait(duration * 0.65);
    await page.locator("a").first().hover();
  });
} finally {
  await context.close();
  await copyFile(await video.path(), path.join(root, "raw", locale, "master.webm"));
  await writeFile(
    path.join(root, "raw", locale, "capture.json"),
    JSON.stringify(
      {
        locale,
        base: script.base,
        recordedAt: new Date().toISOString(),
        events,
        responses,
        scope:
          "Fresh UI footage with synthetic figures. Workflow and proof cards are explicitly labeled explanatory material. Explorer shows the historical receipt from the separate API test; no wallet is connected or transaction sent during recording.",
      },
      null,
      2,
    ),
  );
  await browser.close();
}
