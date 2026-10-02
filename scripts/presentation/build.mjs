import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";
const repo = process.env.REPO_ROOT ?? process.cwd();
const skill = process.env.PRESENTATIONS_SKILL_DIR;
const python = process.env.RUNTIME_PYTHON;
if (!skill || !python)
  throw new Error("Set PRESENTATIONS_SKILL_DIR and RUNTIME_PYTHON to bundled runtime paths.");
const out = path.join(repo, "work/presentation/output"),
  build = path.join(repo, "work/presentation/build");
await fs.mkdir(out, { recursive: true });
const { finalizePresentation, resolvePresentationFont } = await import(
  pathToFileURL(path.join(skill, "container_tools/artifact_tool_utils.mjs")).href
);
const family = resolvePresentationFont({ fontFamily: "Arial", availableFonts: ["Arial"] });
const deck = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const ink = "#10213A",
  muted = "#526174",
  blue = "#2456E6",
  canvas = "#F7F6F1";
let n = 0;
function text(slide, value, x, y, w, h, size = 28, bold = false, color = ink) {
  const s = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { fill: "none", width: 0 },
  });
  s.text = value;
  s.text.style = { typeface: family, fontSize: size, bold, color, autoFit: "none" };
  return s;
}
function slide(title, notes) {
  const s = deck.slides.add();
  s.background.fill = canvas;
  n++;
  text(s, title, 64, 48, 1152, 94, 44, true);
  text(s, `picachu   ${String(n).padStart(2, "0")} / 12`, 64, 672, 550, 26, 18, false, muted);
  s.speakerNotes.textFrame.setText(notes);
  return s;
}
async function image(s, file, x, y, w, h, type = "image/png") {
  s.images.add({
    blob: new Uint8Array(await fs.readFile(path.join(repo, file))),
    contentType: type,
    fit: "contain",
    position: { left: x, top: y, width: w, height: h },
    alt: path.basename(file),
  });
}
function table(s, values, x, y, w, h, widths) {
  const t = s.tables.add({
    rows: values.length,
    columns: values[0].length,
    left: x,
    top: y,
    width: w,
    height: h,
    columnWidths: widths,
    values,
  });
  for (let r = 0; r < values.length; r++)
    for (let c = 0; c < values[0].length; c++) {
      const cell = t.getCell(r, c);
      cell.fill = r === 0 ? "#E8EEFC" : "#FFFFFF";
      cell.text.style = { typeface: family, fontSize: 24, color: ink, bold: r === 0 };
    }
  t.borders.assign({ fill: "#D6DBE1", width: 1, style: "solid" });
  return t;
}
const repoUrl = "https://github.com/2274802010922/picachu__",
  demo = "https://picachu-iota.vercel.app/portfolio";
let s = slide(
  "picachu",
  "Mở đầu: picachu giúp người đã có khoản vay biết số cần trả để đạt mục tiêu trong một kịch bản giá, đồng thời giữ lại tiền dự trữ. Một người phát triển với Codex hỗ trợ, không phải team nhiều người được khảo sát. Demo chỉ Devnet. Nguồn: " +
    repoUrl +
    "; https://unihackfest.vn/vi/learn/",
);
await image(s, "public/brand/picachu-logo.jpg", 850, 220, 290, 220, "image/jpeg");
text(s, "Trả nợ theo mục tiêu\nGiữ tiền dự trữ", 64, 205, 760, 185, 57, true);
text(s, "SOL/USDC trên Kamino Devnet", 64, 426, 780, 48, 28, false, blue);
text(
  s,
  "Một người phát triển với Codex hỗ trợ\nGitHub: 2274802010922",
  64,
  518,
  850,
  84,
  25,
  false,
  muted,
);
s = slide(
  "Một ngân sách cho nhiều khoản vay",
  "Persona là tình huống mục tiêu, chưa có interviews hoặc willingness-to-pay được xác minh. Bài toán: người vay đã dùng lending protocol, muốn giữ USDC cho nhu cầu khác và quyết định khoản nào cần trả. Không coi sinh viên nói thích sản phẩm là validation thị trường.",
);
text(
  s,
  "Người đã vay SOL/USDC cần quyết định\nsố tiền trả khi giá thế chấp giảm",
  64,
  190,
  1090,
  106,
  34,
  true,
);
text(s, "Có tiền trong ví không có nghĩa muốn dùng hết để trả nợ", 64, 346, 1100, 70, 30);
text(
  s,
  "Một chỉ số health chưa cho biết phương án nào\nđáp ứng cả mục tiêu và tiền cần giữ",
  64,
  454,
  1100,
  106,
  30,
);
text(
  s,
  "Tình huống người dùng mục tiêu, chưa phải kết quả phỏng vấn",
  64,
  604,
  1140,
  40,
  20,
  false,
  muted,
);
s = slide(
  "Ba bước để thấy số tiền cần trả",
  "Luồng chính /portfolio: chọn vị thế, đặt budget/reserve/shock, xem phương án. Synthetic không cho ký. Preset Devnet chỉ áp dụng khi người dùng chọn, không tự đổi mục tiêu khi refresh. Screenshot từ bản app đã build.",
);
text(s, "Chọn khoản vay", 64, 178, 340, 55, 28, true);
text(s, "Đặt mục tiêu", 450, 178, 340, 55, 28, true);
text(s, "Xem phương án", 855, 178, 345, 55, 28, true);
await image(s, "docs/assets/slides/goal-result-focus.png", 64, 246, 1152, 350);
text(s, "Ảnh kết quả trong ứng dụng, dữ liệu minh họa", 64, 619, 1150, 38, 22, false, muted);
s = slide(
  "13,6 USDC để đạt mục tiêu trong ví dụ",
  "Dữ liệu synthetic: mỗi khoản collateral1 SOL ×100 USD, USDC1 USD, threshold80%, factor1, wallet80. Shock30%, buffer5%, budget30, reserve20. Core computes ceil amount atomic. 11.8+1.8+0=13.6,80-13.6=66.4. Không dự báo giá và không bảo đảm tránh thanh lý. Nguồn: src/shared/examples/portfolio.ts và tests/unit/portfolio.test.ts.",
);
table(
  s,
  [
    ["Khoản", "Nợ ban đầu (USDC)", "Cần trả (USDC)"],
    ["A", "65", "11,8"],
    ["B", "55", "1,8"],
    ["C", "45", "0"],
    ["Tổng", "165", "13,6"],
  ],
  64,
  174,
  1152,
  298,
  [230, 460, 462],
);
text(s, "Ngân sách 30 USDC, còn 66,4 USDC trong ví", 64, 511, 1150, 56, 34, true, blue);
text(
  s,
  "Giả định: mỗi khoản 1 SOL ở 100 USD, threshold 80%, factor 1\nSOL giảm 30%, buffer 5%, balance 80, reserve 20. Chưa gồm lãi và phí.",
  64,
  587,
  1150,
  68,
  21,
  false,
  muted,
);
s = slide(
  "Giao dịch có biên nhận trên Devnet",
  "Bằng chứng lịch sử ngày01/10 qua Vercel API với signer test riêng:3deposit+3borrow+2repay verified. Repay B0.602589+A1.804167=2.406756; wallet17.401774 >reserve1. Không gọi là số dư hiện tại. Source: " +
    repoUrl +
    "/blob/main/docs/testing/live-devnet-cycle.md. Owner báo test ví thủ công ổn, chưa có clip popup agent-recorded.",
);
table(
  s,
  [
    ["Bước", "Số liệu lịch sử"],
    ["Tạo khoản vay", "3 deposit và 3 borrow"],
    ["Trả B", "0,602589 USDC"],
    ["Trả A", "1,804167 USDC"],
    ["Tổng đã trả", "2,406756 USDC"],
  ],
  64,
  178,
  790,
  322,
  [295, 495],
);
text(s, "17,401774\nUSDC còn lại", 912, 220, 300, 146, 36, true, blue);
text(s, "Reserve đã chọn\n1 USDC", 912, 433, 298, 90, 27);
text(
  s,
  "Test ngày 01/10/2026, token Devnet. API signer riêng, số liệu không phải hiện tại.",
  64,
  579,
  1150,
  65,
  22,
  false,
  muted,
);
s = slide(
  "Preview mới cần được xem lại trước khi ký",
  "Source: src/backend/services/plans.ts, src/solana/transactions/repay.ts, wallet-signing.ts. Fresh quote within original budget/reserve requires review if changed. Ed25519,messagehash,expiry; Redis CAS +pending +receipt. Unknown stops next, not blind resend. Historical receipt separate fresh oracle check.",
);
text(s, "Giá hoặc lãi đổi: cập nhật quote trong giới hạn đã chọn", 64, 191, 1110, 86, 32, true);
text(
  s,
  "Ví ký đúng nội dung đã xem\nServer kiểm chữ ký, message và hạn dùng",
  64,
  331,
  1110,
  114,
  31,
);
text(
  s,
  "Chờ biên nhận verified trước bước tiếp\nUnknown giữ lại tiến độ để kiểm tra",
  64,
  490,
  1110,
  114,
  31,
);
s = slide(
  "Core tính tiền, ví quyết định ký",
  "Kiến trúc: UI/Core off-chain, API prepare/simulate/bind, Phantom holds private key. Kamino deployed program executes lending. AI has no signing permission. Redis journal offchain not protocol-wide wallet lock. Reserve checked snapshot/simulation/submit, no Picachu onchain guard claimed. Source: docs/architecture/goal-portfolio.md.",
);
table(
  s,
  [
    ["Thành phần", "Trách nhiệm"],
    ["Core", "Atomic/Decimal, budget, reserve và kịch bản"],
    ["API và Redis", "Prepare, simulation, binding và journal"],
    ["Ví", "Giữ khóa, người dùng xác nhận ký"],
    ["Kamino trên Solana", "Thực thi khoản vay và trả nợ"],
    ["AI", "Đọc mục tiêu, hỗ trợ giải thích"],
  ],
  64,
  168,
  1152,
  387,
  [350, 802],
);
text(
  s,
  "picachu tích hợp contract Kamino. Không nhận công xây protocol.",
  64,
  590,
  1140,
  50,
  23,
  false,
  muted,
);
s = slide(
  "AI đọc mục tiêu thành bản nháp",
  "Feature new: goals/draft uses provider if configured, bounded explicit values validated by deterministic core. Missing/ambiguous/wallet addresses blocked. Preview and apply explicit, no auto-sign. Template fallback remains. Output numbers come from core; screenshot may show rules fallback and is not proof a live model ran. Source: tests/unit/goal-assistance.test.ts.",
);
text(s, "“Trả tối đa 10 USDC, giữ 1 USDC,\nnếu SOL giảm 30%”", 64, 198, 1120, 107, 38, true);
text(s, "Bản nháp có schema, người dùng xem lại trước khi áp dụng", 64, 356, 1140, 78, 29);
text(s, "Số tiền do core kiểm tra\nProvider lỗi vẫn có form và fallback", 64, 478, 1130, 103, 29);
text(s, "AI không chọn allocation và không có quyền ký", 64, 620, 1130, 34, 22, false, muted);
s = slide(
  "Khác biệt ở ngân sách chung và thực thi",
  "Comparison based on vendor primary docs and GitHub readme, not audited competitors. Kamino/OneKey already provide borrow/repay/health; monitor repo scenarios+target repay. No claim no competitors. Picachu chosen focus sharedbudget/reserve and staged execution. Sources: https://github.com/csacanam/kamino-positions-monitor ; https://help.onekey.so/en/articles/13434810-how-to-borrow-cryptos-in-onekey-app",
);
table(
  s,
  [
    ["Giải pháp", "Trọng tâm được mô tả"],
    ["Kamino / OneKey", "Borrow, repay và health của khoản vay"],
    ["Positions Monitor", "Kịch bản giá, báo cáo và gợi ý repay"],
    ["picachu", "Goal, budget/reserve chung và staged receipts"],
  ],
  64,
  183,
  1152,
  280,
  [375, 777],
);
text(s, "Allocator theo tổn thất còn tắt", 64, 512, 1130, 56, 34, true, blue);
text(
  s,
  "Chỉ đưa vào sản phẩm sau khi model khớp protocol và có benchmark",
  64,
  595,
  1140,
  53,
  24,
  false,
  muted,
);
s = slide(
  "Kinh doanh là giả thuyết cần kiểm chứng",
  "No interviews per user scope, no revenue/traction/WTP declared. Potential buyer borrower wanting reliable scenario planning or wallet integrating APIs. Hypothesis free goal planner then premium monitoring/API. No payment integration built. First go-to-market targeted DeFi communities/integration, not claiming signed partners.",
);
text(s, "Bản cơ bản: người vay thử phương án theo mục tiêu", 64, 190, 1130, 77, 32, true);
text(s, "Giả thuyết trả tiền: theo dõi hoặc tích hợp API\ncho ví và dApp", 64, 331, 1130, 113, 31);
text(
  s,
  "Kênh thử ban đầu: cộng đồng DeFi và đối tác tích hợp\nChưa có doanh thu hoặc pilot được xác minh",
  64,
  489,
  1130,
  112,
  29,
);
s = slide(
  "Đã chạy được và bước tiếp theo",
  "Verified current features vs roadmap: goal planner, wallet guards/receipt cycle, draft/provider fallback unit/e2e, responsive VI/EN. Model parity incomplete; no fabricated globaloptimal loss, no mainnet. Next modelreference/benchmark before allocator. No interviews in current sprint. Evidence counts final report can differ from baseline87/32.",
);
table(
  s,
  [
    ["Đã có bằng chứng", "Bước phát triển tiếp"],
    ["Goal planner và số dư chung", "Liquidation reference đúng phiên bản"],
    ["Vòng Devnet có receipt", "Benchmark allocator trên cùng snapshot"],
    ["Draft cần xác nhận, fallback", "Kiểm chứng nhu cầu sau cuộc thi"],
    ["VI/EN và quality gates", "Mở phạm vi sau khi có dữ liệu"],
  ],
  64,
  184,
  1152,
  306,
  [565, 587],
);
text(
  s,
  "MVP: một ví, tối đa ba khoản SOL/USDC, Kamino Devnet",
  64,
  560,
  1130,
  83,
  28,
  false,
  muted,
);
s = slide(
  "picachu",
  "Closing: invite judge to demo and check proof. For5-minute pitch cover andproblem~40sec, product/math~70sec, live demo~60sec, architecture/AI~45sec, comparison/business~35sec,roadmap/closing~30sec. Adjust content for track. Links: " +
    demo +
    " ; https://www.youtube.com/watch?v=Uw-04c9cROQ ; " +
    repoUrl,
);
text(s, "Trả vừa đủ theo mục tiêu đã chọn", 64, 210, 1135, 88, 51, true);
text(s, "Dùng thử và đối chiếu bằng chứng", 64, 364, 1100, 70, 32);
const demoLink = text(s, "picachu-iota.vercel.app/portfolio", 64, 465, 1130, 53, 29, false, blue);
demoLink.text = [
  [{ run: "picachu-iota.vercel.app/portfolio", link: { uri: demo, isExternal: true } }],
];
const repoLink = text(s, "github.com/2274802010922/picachu__", 64, 541, 1130, 53, 27, false, blue);
repoLink.text = [
  [{ run: "github.com/2274802010922/picachu__", link: { uri: repoUrl, isExternal: true } }],
];
const candidate = path.join(build, `candidate-${process.env.DECK_REVISION ?? "r1"}.pptx`);
await (await PresentationFile.exportPptx(deck)).save(candidate);
const final = path.join(out, `picachu-final-${process.env.DECK_REVISION ?? "r1"}.pptx`);
await finalizePresentation({
  workspaceDir: repo,
  candidatePath: candidate,
  finalPath: final,
  pythonExecutable: python,
  integrityValidatorPath: path.join(
    skill,
    "container_tools/inspect_presentation_package_integrity.py",
  ),
  layoutValidatorPath: path.join(skill, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: [
    "--expected-slide-size-emu",
    "12192000,6858000",
    "--validate-bullet-geometry",
    "--validate-heading-fit",
    ...[4, 5, 7, 9, 11].flatMap((n) => ["--require-native-table-slide", String(n)]),
  ],
  explicitTotalSlideCount: 12,
  requiredNativeTableOwnerSlides: [4, 5, 7, 9, 11],
  fontPolicy: { basis: "design", families: [family] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(build, "validation-" + (process.env.DECK_REVISION ?? "r1") + ".json"),
});
const renderDir = path.join(build, "rendered-" + (process.env.DECK_REVISION ?? "r1"));
await fs.mkdir(renderDir, { recursive: true });
for (let i = 0; i < deck.slides.count; i++) {
  const preview = await deck.export({ slide: deck.slides.getItem(i), format: "png", scale: 1 });
  await fs.writeFile(
    path.join(renderDir, `slide-${i + 1}.png`),
    new Uint8Array(await preview.arrayBuffer()),
  );
}
console.log("FINAL_DECK", final);
