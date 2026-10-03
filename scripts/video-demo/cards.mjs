// Clearly marked editorial cards, never injected into the application's DOM.
import { readFile, writeFile, copyFile } from "node:fs/promises";
const root = "work/bilingual-demo";
const proof = JSON.parse(
  await readFile("docs/evidence/devnet/allocator-cycle-2026-10-03.json", "utf8"),
);
if (proof.status.phase !== "verified" || proof.steps[0].verified !== true)
  throw new Error("Historical receipt has not been verified");
await copyFile("public/brand/picachu-logo.jpg", root + "/logo.jpg");
const shell = (
  locale,
  eyebrow,
  title,
  subtitle,
  content,
) => `<!doctype html><html lang="${locale}"><meta charset="utf-8"><title>Picachu • ${title}</title><style>
*{box-sizing:border-box}body{margin:0;background:#f7f6f0;color:#092137;font:20px Arial,sans-serif}header{height:88px;padding:20px 56px;border-bottom:1px solid #d3dae0;display:flex;align-items:center;gap:14px}header img{width:48px;height:40px;border-radius:4px}header strong{font-size:28px}header span{margin-left:auto;font:14px monospace;letter-spacing:1px;color:#45647a}main{padding:30px 56px}small{font:14px monospace;letter-spacing:1px;color:#476078}h1{font-size:36px;margin:12px 0}p{line-height:1.5;margin:10px 0}.lede{color:#425b70;font-size:19px;margin-bottom:24px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.card{padding:22px;border:1px solid #ccd5dd;background:white;border-radius:9px;min-height:225px;transition:border-color .15s}.card:hover{border:2px solid #2957ed;padding:21px}.num{color:#2957ed;font:22px monospace;margin-bottom:18px}h2{font-size:22px;margin:12px 0}.card p{font-size:18px}.note{margin-top:22px;background:#edf2ff;border:1px solid #2957ed;padding:18px;border-radius:9px;font-size:18px}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.metric{background:white;border:1px solid #cbd4dd;border-radius:8px;padding:22px}.metric span{display:block;font-size:18px;color:#4f6779}.metric strong{display:block;font-size:31px;margin-top:16px}.receipt{font:15px monospace;overflow-wrap:anywhere;padding:18px;background:white;border:1px solid #cbd4dd;border-radius:8px;line-height:1.45}a{color:#2453db}.links{display:flex;gap:24px;margin-top:25px;font-size:22px}.limits{display:grid;grid-template-columns:1fr 1fr;gap:18px}.limits .card{min-height:175px}ul{padding-left:22px;line-height:1.7;margin:10px 0;font-size:18px}
</style><header><img src="logo.jpg" alt="picachu"><strong>picachu</strong><span>${eyebrow}</span></header><main><small>${locale === "vi" ? "TÀI LIỆU GIẢI THÍCH • KHÔNG PHẢI MÀN HÌNH ỨNG DỤNG" : "EXPLANATORY MATERIAL • NOT AN APPLICATION SCREEN"}</small><h1>${title}</h1><p class="lede">${subtitle}</p>${content}</main></html>`;
for (const locale of ["vi", "en"]) {
  const t = (vi, en) => (locale === "vi" ? vi : en);
  const workflow = [
    [
      t("Xem trước", "Preview"),
      t(
        "Kiểm số tiền, phí và hạn dùng. Phương án thay đổi cần duyệt lại.",
        "Check the amount, fee and expiry. A changed plan needs a fresh review.",
      ),
    ],
    [
      t("Tự ký bằng ví", "Sign with your wallet"),
      t(
        "Ví giữ khóa bí mật. AI không quyết định hoặc ký giao dịch.",
        "The wallet keeps the private key. AI cannot decide or sign a transaction.",
      ),
    ],
    [
      t("Xác minh biên nhận", "Verify the receipt"),
      t(
        "Đối chiếu khoản đã trả trước khi mở bước tiếp theo.",
        "Confirm the completed repayment before opening the next step.",
      ),
    ],
    [
      t("Đọc lại dữ liệu", "Read fresh data"),
      t(
        "Nhật ký giữ tiến độ. Giá và lãi mới có thể làm đổi mục tiêu.",
        "The journal preserves progress. New prices or interest can change the goal.",
      ),
    ],
  ];
  await writeFile(
    `${root}/workflow-${locale}.html`,
    shell(
      locale,
      t("QUY TRÌNH THỰC THI", "EXECUTION WORKFLOW"),
      t("Bạn kiểm tra và giữ quyền ký", "You review and retain signing control"),
      t(
        "Sơ đồ giải thích quy trình; không mô phỏng popup Phantom.",
        "A workflow diagram, without a simulated Phantom popup.",
      ),
      `<div class="grid">${workflow.map(([a, b], i) => `<section class="card" id="step-${i + 1}"><div class="num">0${i + 1}</div><h2>${a}</h2><p>${b}</p></section>`).join("")}</div><p class="note">${t("Trạng thái chưa rõ → chặn gửi tiếp, kiểm tra biên nhận; không gửi lại mù.", "Uncertain status → block further sending and check the receipt; no blind retries.")}</p>`,
    ),
  );
  // Assertions tie the editorial numbers to the committed acceptance proof.
  // Actual schema is checked by the build before publishing the cards.
  const all = JSON.stringify(proof);
  for (const expected of ["780982", "16620792", "17401774", "6000"])
    if (!all.includes('"' + expected + '"')) throw new Error("Missing verified value " + expected);
  const signature =
    "2HL9xJn4h59Z5gUxfDmJDUVedVpbjQYpKx8MWrTcZu3T5sWUbto1K5boayZz2L1PTjrfon39kLb8MXw4znYUosPB";
  if (!all.includes(signature)) throw new Error("Receipt mismatch");
  const money = (v) => (locale === "vi" ? v.replace(".", ",") : v);
  await writeFile(
    `${root}/receipt-${locale}.html`,
    shell(
      locale,
      t("BẰNG CHỨNG DEVNET", "DEVNET EVIDENCE"),
      t("Khoản trả đã được xác minh", "A verified repayment"),
      t(
        "Vòng API test riêng • 03/10/2026 (giờ Việt Nam) • số liệu lịch sử, không phải giao dịch vừa quay.",
        "Separate API test • 3 October 2026 (Vietnam time) • historical values, not a transaction sent during filming.",
      ),
      `<div class="metrics"><section class="metric"><span>${t("Đã trả", "Repaid")}</span><strong>${money("0.780982")} USDC</strong></section><section class="metric"><span>${t("Số dư ví sau trả", "Wallet after repayment")}</span><strong>${money("16.620792")} USDC</strong></section><section class="metric"><span>${t("Phí giao dịch", "Transaction fee")}</span><strong>${money("0.000006")} SOL</strong></section></div><p>${t("Ngân sách 1 USDC · Giữ 1 USDC · SOL −45% · Nhật ký: verified", "Budget 1 USDC · Keep 1 USDC · SOL −45% · Journal: verified")}</p><div class="receipt">${signature}<br><a href="https://explorer.solana.com/tx/${signature}?cluster=devnet">${t("Mở giao dịch trên Solana Explorer →", "Open transaction on Solana Explorer →")}</a></div><p class="note">${t("Biên nhận thành công ≠ mọi mục tiêu đã đạt. Cần đọc lại giá, nợ và số dư để đánh giá tiếp.", "A successful receipt ≠ every goal achieved. Read fresh prices, debt and balance for the next assessment.")}</p>`,
    ),
  );
  await writeFile(
    `${root}/scope-${locale}.html`,
    shell(
      locale,
      t("PHẠM VI HIỆN TẠI", "CURRENT SCOPE"),
      t("Thử mục tiêu, kiểm tra bằng chứng", "Try a goal and inspect the evidence"),
      t(
        "Vercel + Kamino Solana Devnet • Token thử nghiệm không có giá trị tiền thật.",
        "Vercel + Kamino Solana Devnet • Test tokens have no real monetary value.",
      ),
      `<div class="limits"><section class="card"><h2>${t("Đối chứng mô hình", "Model verification")}</h2><p>${t("25 ca khớp executable Kamino Devnet trong VM. Chưa xác minh bản build từ mã nguồn.", "25 cases matched the Kamino Devnet executable in a VM. No reproducible source-build match.")}</p><p>${t("Phiên bản hoặc cấu hình ngoài phạm vi sẽ chặn allocator.", "Unsupported versions or configurations disable allocation.")}</p></section><section class="card"><h2>${t("Giới hạn rõ ràng", "Explicit limits")}</h2><ul><li>${t("Một ví, tối đa 3 khoản SOL/USDC", "One wallet, up to 3 SOL/USDC loans")}</li><li>${t("Một lượt thanh lý, lưới ứng viên hữu hạn", "One liquidation event, finite candidate grid")}</li><li>${t("Không dự đoán xác suất hoặc dây chuyền", "No probability or cascading-event prediction")}</li></ul></section></div><div class="links"><a href="https://picachu-iota.vercel.app">picachu-iota.vercel.app →</a><a href="https://github.com/2274802010922/picachu__">GitHub · source & evidence →</a></div><p class="note">${t("Lập phương án theo mục tiêu. Giữ tiền cần dùng. Bạn quyết định và tự ký.", "Plan repayment around your goal. Preserve the funds you need. You decide and sign.")}</p>`,
    ),
  );
}
