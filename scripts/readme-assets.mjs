import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

// User-supplied logo, original banner layout and fresh app screenshots.
const logo =
  "data:image/jpeg;base64," +
  (await readFile(new URL("../public/brand/picachu-logo.jpg", import.meta.url))).toString("base64");
const directory = new URL("../docs/assets/readme/", import.meta.url);
const screenshots = new URL("../docs/assets/screenshots/", import.meta.url);
await mkdir(directory, { recursive: true });
await mkdir(screenshots, { recursive: true });
function banner(dark = false, social = false) {
  const bg = dark ? "#111b28" : "#f7f6f1",
    ink = dark ? "#f7f6f1" : "#091426";
  const muted = dark ? "#b7c1cf" : "#526174",
    line = dark ? "#354256" : "#d6dbe1";
  const width = social ? 1280 : 1600,
    height = social ? 640 : 460;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1600 460" role="img" aria-label="picachu — Goal-based repayment. Keep your reserve.">
  <rect width="1600" height="460" fill="${bg}"/>
  <path d="M0 400H1600 M1130 0V460" stroke="${line}" stroke-width="1"/>
  <image href="${logo}" x="70" y="48" width="128" height="96" preserveAspectRatio="xMidYMid meet"/>
  <text x="222" y="119" fill="${ink}" font-family="Arial,sans-serif" font-weight="700" font-size="66" letter-spacing="-3">picachu</text>
  <text x="72" y="235" fill="${ink}" font-family="Arial,sans-serif" font-weight="700" font-size="56" letter-spacing="-2">Repay with a goal.</text>
  <text x="72" y="302" fill="${ink}" font-family="Arial,sans-serif" font-weight="700" font-size="56" letter-spacing="-2">Keep your reserve.</text>
  <text x="74" y="354" fill="${muted}" font-family="Arial,sans-serif" font-size="23">Plan across loans. Review amounts. Sign with your wallet.</text>
  <text x="74" y="436" fill="${muted}" font-family="monospace" font-size="16" letter-spacing="2">VIETNAMESE FIRST  /  SOLANA DEVNET  /  MVP</text>
  <text x="1180" y="100" fill="${muted}" font-family="monospace" font-size="16" letter-spacing="2">ILLUSTRATIVE SCENARIO</text>
  <text x="1180" y="168" fill="${muted}" font-family="Arial,sans-serif" font-size="23">Repay</text>
  <text x="1180" y="229" fill="${ink}" font-family="Arial,sans-serif" font-size="62" font-weight="700">13.6 <tspan font-size="25">USDC</tspan></text>
  <rect x="1170" y="265" width="340" height="83" rx="10" fill="#b7f34d"/>
  <text x="1190" y="317" fill="#091426" font-family="Arial,sans-serif" font-size="30" font-weight="700">Keep 66.4 USDC</text>
  <text x="1180" y="436" fill="${muted}" font-family="monospace" font-size="16">YOUR WALLET. YOUR DECISION.</text>
  </svg>`;
}
await writeFile(new URL("hero-light.svg", directory), banner());
await writeFile(new URL("hero-dark.svg", directory), banner(true));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  for (const theme of ["light", "dark"]) {
    await page.setContent(banner(theme === "dark"));
    await page.addStyleTag({ content: "body { margin: 0; } svg { display:block; }" });
    await page.locator("svg image").evaluate((element) => {
      const img = new Image();
      img.src = element.getAttribute("href");
      return img.decode();
    });
    await page.locator("svg").screenshot({
      path: new URL(`hero-${theme}.png`, directory).pathname.replace(/^\/([A-Z]:)/, "$1"),
    });
  }
  await page.setContent(banner(false, true));
  await page.addStyleTag({
    content: "body { margin: 0; background: #f7f6f1; } svg { display:block; }",
  });
  await page.locator("svg").screenshot({
    path: new URL("social-preview.png", directory).pathname.replace(/^\/([A-Z]:)/, "$1"),
  });
  for (const locale of ["vi", "en"]) {
    await page.context().clearCookies();
    await page
      .context()
      .addCookies([{ name: "borrowrisk-locale", value: locale, domain: "127.0.0.1", path: "/" }]);
    await page.goto("http://127.0.0.1:3100/workspace");
    await page.evaluate(() => document.fonts.ready);
    const target = (name) => new URL(name, screenshots).pathname.replace(/^\/([A-Z]:)/, "$1");
    await page
      .locator("#repayment .two-column")
      .screenshot({ path: target(`product-${locale}.png`) });
    await page
      .getByRole("button", {
        name: locale === "vi" ? "Giải thích kết quả" : "Explain the results",
        exact: true,
      })
      .click();
    await page.locator(".explanation-brief").waitFor();
    await page
      .locator(".explanation-brief")
      .screenshot({ path: target(`explanation-${locale}.png`) });
    await page.goto("http://127.0.0.1:3100/setup");
    await page.locator("#main").screenshot({ path: target(`setup-${locale}.png`) });
    await page.goto("http://127.0.0.1:3100/portfolio");
    await page.evaluate(() => document.fonts.ready);
    await page.locator("#main").screenshot({ path: target(`portfolio-${locale}.png`) });
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.context().clearCookies();
  await page.goto("http://127.0.0.1:3100/portfolio");
  await page
    .getByRole("heading", { name: "3. Phương án của bạn", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: new URL("mobile-preview.png", screenshots).pathname.replace(/^\/([A-Z]:)/, "$1"),
  });
} finally {
  await browser.close();
}
console.log("README assets generated from original SVG and local app screenshots.");
