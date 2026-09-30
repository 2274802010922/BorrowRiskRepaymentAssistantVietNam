"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Buffer } from "buffer";
import bs58 from "bs58";
import { VersionedTransaction } from "@solana/web3.js";
import { WorkspaceShell } from "../../components/layout/shell";
import { Notice, PageHeading, StatusBadge } from "../../components/feedback/states";
import { useLanguage } from "../../i18n/provider";
import { useWallet } from "../../components/wallet/provider";
import { postApi, errorMessage } from "../../lib/errors";
import { exactToken } from "../../../shared/format";
import type { DemoCheck, DemoPrepared, DemoRecord } from "../../../shared/demo";
import { ExecutionReadiness } from "../../components/feedback/readiness";
import { PreviewExpiry } from "../../components/feedback/preview-expiry";

const storageKey = "picachu-demo-pending";
function subscribe(fn: () => void) {
  window.addEventListener("storage", fn);
  window.addEventListener(storageKey, fn);
  return () => {
    window.removeEventListener("storage", fn);
    window.removeEventListener(storageKey, fn);
  };
}
function stored() {
  try {
    return localStorage.getItem(storageKey) ?? "{}";
  } catch {
    return "{}";
  }
}
function persist(record: DemoRecord | null, wallet: string) {
  const all = JSON.parse(stored());
  if (record) all[wallet] = record;
  else delete all[wallet];
  localStorage.setItem(storageKey, JSON.stringify(all));
  window.dispatchEvent(new Event(storageKey));
}
function parseAmount(value: string, decimals: number) {
  if (!/^\d+(\.\d+)?$/.test(value)) return undefined;
  const [whole, part = ""] = value.split(".");
  if (part.length > decimals || whole.length > 9) return undefined;
  return (BigInt(whole) * 10n ** BigInt(decimals) + BigInt(part.padEnd(decimals, "0"))).toString();
}
export function Setup() {
  const { wallet } = useWallet();
  return (
    <WorkspaceShell>
      <SetupContent key={wallet ?? "guest"} wallet={wallet} />
    </WorkspaceShell>
  );
}
function SetupContent({ wallet }: { wallet: string | null }) {
  const [demoSession, setDemoSession] = useState("legacy");
  const slot = (demoSession === "legacy" ? 201 : Number(demoSession)) as 201 | 202 | 203;
  const portfolioProfile = demoSession !== "legacy";
  const { t, locale } = useLanguage(),
    w = useWallet();
  const [check, setCheck] = useState<DemoCheck | null>(null);
  const [preview, setPreview] = useState<DemoPrepared | null>(null);
  const [deposit, setDeposit] = useState("0.1"),
    [borrow, setBorrow] = useState("1");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const raw = useSyncExternalStore(subscribe, stored, () => "{}");
  useEffect(() => {
    if (busy || !wallet) return;
    let record: DemoRecord | undefined;
    try {
      record = JSON.parse(raw)[wallet];
    } catch {
      return;
    }
    if (!record?.token || !record.signature) return;
    let stopped = false,
      attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (stopped || attempts++ >= 8) return;
      try {
        const response = await postApi<{ phase: string }>("/api/demo", {
          ...record,
          action: "status",
        });
        if (stopped) return;
        setResult(response.phase);
        if (["verified", "failed", "expired"].includes(response.phase)) {
          persist(null, wallet);
          return;
        }
      } catch (e) {
        if (!stopped) setError(e instanceof Error ? e.message : "SERVICE_UNAVAILABLE");
      }
      if (!stopped) timer = setTimeout(() => void poll(), Math.min(15000, 2000 * 2 ** attempts));
    };
    timer = setTimeout(() => void poll(), 2000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [raw, wallet, busy]);
  let pending: DemoRecord | null = null;
  try {
    const row = JSON.parse(raw)[wallet ?? ""];
    if (
      row?.wallet === wallet &&
      typeof row.token === "string" &&
      typeof row.signature === "string"
    )
      pending = row;
  } catch {
    /* ignore corrupted local data */
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "SERVICE_UNAVAILABLE");
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    setPreview(null);
    setCheck(null);
    const next = await postApi<DemoCheck>("/api/demo", {
      action: "check",
      wallet,
      slot,
      portfolioProfile,
    });
    setCheck(next);
    if (portfolioProfile) {
      setDeposit("0.1");
      if (next.profileBorrowAtomic)
        setBorrow(exactToken(next.profileBorrowAtomic, 6, "en").replaceAll(",", ""));
    }
  }
  async function verifyRecord(record: DemoRecord) {
    const response = await postApi<{ phase: string }>("/api/demo", { ...record, action: "status" });
    setResult(response.phase);
    if (["verified", "failed", "expired"].includes(response.phase)) {
      persist(null, record.wallet);
      await refresh();
    }
  }
  async function sign() {
    const p = preview,
      provider = w.provider();
    if (!p || !wallet || !provider) return;
    if (Date.now() >= p.expiresAt) {
      setPreview(null);
      throw new Error("PREVIEW_EXPIRED");
    }
    const unsigned = VersionedTransaction.deserialize(Buffer.from(p.transaction, "base64"));
    const originalMessage = Buffer.from(unsigned.message.serialize());
    let signed: VersionedTransaction;
    try {
      signed = await provider.signTransaction(unsigned);
    } catch {
      throw new Error("SIGNATURE_REJECTED");
    }
    if (
      provider.publicKey?.toBase58() !== wallet ||
      !Buffer.from(signed.message.serialize()).equals(originalMessage)
    )
      throw new Error("TRANSACTION_CHANGED");
    const record: DemoRecord = {
      wallet,
      token: p.token,
      stage: p.stage,
      signature: bs58.encode(signed.signatures[0]),
    };
    // Persist before sending. If storage is unavailable, stop here so recovery is not lost.
    try {
      persist(record, wallet);
    } catch {
      throw new Error("DEMO_STORAGE_REQUIRED");
    }
    setPreview(null);
    setResult("pending");
    await postApi("/api/demo", {
      ...record,
      action: "submit",
      transaction: Buffer.from(signed.serialize()).toString("base64"),
    });
    await verifyRecord(record);
  }
  const step = check?.stage === "ready" ? 4 : check?.stage === "borrow" ? 3 : check ? 2 : 1;
  return (
    <>
      <PageHeading
        index="DEVNET / SETUP"
        title={t("Tạo khoản vay thử.", "Create a test loan.")}
        description={t(
          "Thế chấp SOL, vay token thử nghiệm, rồi dùng picachu để lập phương án trả nợ.",
          "Deposit SOL, borrow test tokens, then plan your repayment with picachu.",
        )}
        action={<StatusBadge tone="info">Solana Devnet</StatusBadge>}
      />
      <ExecutionReadiness />
      <label className="setup-field">
        {t("Chọn phiên demo", "Choose demo session")}
        <select
          value={demoSession}
          disabled={busy || Boolean(pending)}
          onChange={(e) => {
            setDemoSession(e.target.value);
            setPreview(null);
            setCheck(null);
            setResult(null);
          }}
        >
          <option value="legacy">
            {t("Phiên đơn hiện có (201)", "Existing single session (201)")}
          </option>
          <option value="201">
            {t("Danh mục A · LTV mục tiêu 65%", "Portfolio A · target LTV 65%")}
          </option>
          <option value="202">
            {t("Danh mục B · LTV mục tiêu 55%", "Portfolio B · target LTV 55%")}
          </option>
          <option value="203">
            {t("Danh mục C · LTV mục tiêu 45%", "Portfolio C · target LTV 45%")}
          </option>
        </select>
      </label>
      {portfolioProfile && (
        <Notice title={t("Demo ba khoản vay thử nghiệm", "Three-loan test demo")} tone="warning">
          {t(
            "Tạo lần lượt A, B, C; mỗi khoản thế chấp 0,1 SOL Devnet và ký riêng bước vay. Tổng thế chấp 0,3 SOL, cần giữ thêm ít nhất 0,05 SOL cho phí/rent. Phiên A dùng slot 201 như phiên cũ; không thể vay lại nếu đã có marker. Profile bị chặn nếu market không hỗ trợ.",
            "Create A, B, then C; each deposits 0.1 Devnet SOL and requires a separate borrowing signature. Total collateral is 0.3 SOL; keep at least another 0.05 SOL for fees/rent. A shares slot 201 with the old session and cannot reborrow after its marker exists. Unsupported market profiles are blocked.",
          )}{" "}
          <Link href="/portfolio">{t("Xem phương án trả nợ", "View repayment planner")}</Link>
        </Notice>
      )}
      {check?.oracleInfo && (
        <div className="data-panel section-rail">
          <h2>{t("Nguồn giá đang dùng", "Current price sources")}</h2>
          {check.oracleInfo.map((info) => (
            <p key={info.symbol}>
              {info.symbol}: {t("cập nhật", "updated")}{" "}
              {new Date(info.updatedAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")} ·{" "}
              {t("giới hạn tuổi giá của market", "market price-age limit")}: {info.maxAgeSeconds}s
            </p>
          ))}
          {check.oracleInfo.some((info) => info.ageSeconds > 300) && (
            <Notice
              tone="warning"
              title={t("Có nguồn giá cũ hơn 5 phút", "A price feed is older than 5 minutes")}
            >
              {t(
                "Giá vẫn nằm trong giới hạn của reserve Devnet đã cấu hình. Xem thời điểm cập nhật trước khi ký; đây không phải dữ liệu thời gian thực.",
                "The price is still within the configured Devnet reserve limit. Review its timestamp before signing; this is not real-time data.",
              )}
            </Notice>
          )}
        </div>
      )}
      <ol className="journey-steps" aria-label={t("Tiến độ thiết lập", "Setup progress")}>
        {[
          t("Kiểm tra", "Check"),
          t("Thế chấp", "Deposit"),
          t("Vay thử", "Borrow"),
          t("Sẵn sàng", "Ready"),
        ].map((label, i) => (
          <li key={label} aria-current={step === i + 1 ? "step" : undefined}>
            <span>{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <Notice
        title={t("Giao dịch thật trên mạng thử nghiệm", "Real transactions on the test network")}
      >
        {t(
          "Dùng ví Phantom Devnet. Mỗi bước cần bạn ký; token không có giá trị tiền thật. Trang không yêu cầu private key.",
          "Use Phantom on Devnet. You sign each step; tokens have no real monetary value. This page never requests a private key.",
        )}
      </Notice>
      {(error || w.error) && (
        <Notice tone="danger" title={t("Chưa thể tiếp tục", "Unable to continue")}>
          {errorMessage(error ?? w.error!, locale)}
        </Notice>
      )}
      {result && (
        <Notice
          tone={result === "verified" ? "success" : "info"}
          title={t("Kết quả bước vừa thực hiện", "Latest step result")}
        >
          {result === "verified"
            ? t(
                "Đã xác minh trên Devnet. Tiếp tục bước tiếp theo bên dưới.",
                "Verified on Devnet. Continue with the next step below.",
              )
            : result === "failed"
              ? t(
                  "Giao dịch thất bại. Kiểm tra lại trước khi ký mới.",
                  "Transaction failed. Check again before signing.",
                )
              : result === "expired"
                ? t(
                    "Giao dịch hết hạn và chưa được tìm thấy. Có thể chuẩn bị lại.",
                    "Transaction expired and was not found. You can prepare again.",
                  )
                : t(
                    "Đang chờ xác nhận hoặc đối chiếu. Hãy kiểm tra lại, chưa tạo giao dịch mới.",
                    "Awaiting confirmation or verification. Check again before creating another transaction.",
                  )}
        </Notice>
      )}
      {pending && (
        <section className="data-panel section-rail">
          <h2>{t("Tiếp tục giao dịch đang chờ", "Resume your pending transaction")}</h2>
          <p className="small-note">
            {t(
              "Tiến độ đã lưu theo ví, kể cả sau khi tải lại trang.",
              "Progress is saved per wallet, including after a reload.",
            )}
          </p>
          <a
            className="text-link"
            href={`https://explorer.solana.com/tx/${encodeURIComponent(pending.signature)}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
          >
            Solana Explorer ↗
          </a>
          <div className="actions-row">
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() => void run(() => verifyRecord(pending!))}
            >
              {t("Kiểm tra kết quả", "Check result")}
            </button>
          </div>
        </section>
      )}
      <div className="setup-grid section-rail">
        <section className="data-panel">
          <h2>{t("Chuẩn bị ví và môi trường", "Prepare your wallet and environment")}</h2>
          <p>
            {t(
              "Cần SOL Devnet để thế chấp và giữ ít nhất 0,05 SOL ngoài số thế chấp cho phí và tạo tài khoản.",
              "You need Devnet SOL for collateral, plus at least 0.05 SOL reserved for fees and account creation.",
            )}
          </p>
          <a
            className="text-link"
            href="https://faucet.solana.com/"
            target="_blank"
            rel="noreferrer"
          >
            {t("Nhận SOL thử nghiệm ↗", "Get test SOL ↗")}
          </a>
          <div className="actions-row">
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (!wallet) {
                    await w.connect();
                    return;
                  }
                  await refresh();
                })
              }
            >
              {busy
                ? t("Đang kiểm tra…", "Checking…")
                : wallet
                  ? t("Kiểm tra điều kiện", "Check readiness")
                  : t("Kết nối ví", "Connect wallet")}
            </button>
          </div>
          <p className="small-note">
            {t(
              "Kiểm tra market, giá, thanh khoản và vị thế hiện có. Chỉ simulation thành công mới mở bước ký.",
              "Checks the market, prices, liquidity and existing position. Signing is enabled only after successful simulation.",
            )}
          </p>
          {check && (
            <p>
              {t("Số dư ví:", "Wallet balance:")}{" "}
              <strong>{exactToken(check.walletSol, 9, locale)} SOL</strong>
            </p>
          )}
        </section>
        <section className="data-panel">
          <h2>
            {check?.stage === "ready"
              ? t("Khoản vay đã sẵn sàng", "Your position is ready")
              : t("Tạo vị thế từng bước", "Build your position step by step")}
          </h2>
          {!check && (
            <p>
              {t(
                "Kết nối ví và kiểm tra điều kiện để bắt đầu.",
                "Connect your wallet and check readiness to begin.",
              )}
            </p>
          )}
          {check?.stage === "ready" && (
            <>
              <p>
                {t(
                  "Đọc lại khoản vay trong workspace để mô phỏng và trả nợ. Phiên demo đã vay sẽ không tự vay thêm.",
                  "Read your position in the workspace to simulate and repay. Completed demo sessions do not automatically borrow again.",
                )}
              </p>
              <Link
                className="button button-primary"
                href={`/workspace?position=${check.position}`}
              >
                {t("Mở khoản vay", "Open position")}
              </Link>
            </>
          )}
          {check?.stage === "closed" && (
            <Notice
              title={t("Phiên này không mở khoản vay mới", "This session cannot open another loan")}
            >
              {t(
                "Phiên đã kết thúc hoặc địa chỉ đánh dấu đã tồn tại. Điều này không tự chứng minh từng có khoản vay. Có thể rút thế chấp nếu không còn nợ; dùng ví Devnet riêng khác để tạo phiên thử mới.",
                "This session ended or its marker address exists. That alone does not prove a prior loan. Withdraw collateral if debt-free; use another dedicated Devnet wallet for a fresh test session.",
              )}
            </Notice>
          )}
          {check?.canWithdraw && !preview && (
            <div className="actions-row">
              <button
                className="button button-secondary"
                disabled={busy || Boolean(pending)}
                onClick={() =>
                  void run(async () =>
                    setPreview(
                      await postApi<DemoPrepared>("/api/demo", {
                        action: "prepare",
                        operation: "withdraw",
                        wallet,
                        slot,
                        portfolioProfile,
                      }),
                    ),
                  )
                }
              >
                {t("Xem trước rút toàn bộ thế chấp", "Preview full collateral withdrawal")}
              </button>
            </div>
          )}
          {check && ["deposit", "borrow"].includes(check.stage) && (
            <>
              <label className="setup-field">
                {check.stage === "deposit"
                  ? t("SOL muốn thế chấp (0,01–1)", "SOL to deposit (0.01–1)")
                  : t("Token muốn vay", "Tokens to borrow")}
                <input
                  inputMode="decimal"
                  value={check.stage === "deposit" ? deposit : borrow}
                  disabled={busy || Boolean(pending) || portfolioProfile}
                  onChange={(e) => {
                    setPreview(null);
                    if (check.stage === "deposit") setDeposit(e.target.value);
                    else setBorrow(e.target.value);
                  }}
                />
              </label>
              <p className="small-note">
                {check.stage === "deposit"
                  ? t(
                      "Bước này chỉ gửi thế chấp. Bạn sẽ ký vay ở bước tiếp theo.",
                      "This step only deposits collateral. Borrowing requires a separate signature.",
                    )
                  : t(
                      `Giới hạn demo hiện tại: ${exactToken(check.maxBorrowAtomic, 6, locale)} ${check.debtSymbol}. Dựa trên giá, ngưỡng vay và thanh khoản hiện tại.`,
                      `Current demo limit: ${exactToken(check.maxBorrowAtomic, 6, locale)} ${check.debtSymbol}, based on prices, borrow limits and liquidity.`,
                    )}
              </p>
              {!preview && (
                <button
                  className="button button-primary"
                  disabled={busy || Boolean(pending)}
                  onClick={() =>
                    void run(async () => {
                      const amount = parseAmount(
                        check.stage === "deposit" ? deposit : borrow,
                        check.stage === "deposit" ? 9 : 6,
                      );
                      if (!amount) throw new Error("INVALID_INPUT");
                      setPreview(
                        await postApi<DemoPrepared>("/api/demo", {
                          action: "prepare",
                          wallet,
                          slot,
                          portfolioProfile,
                          ...(check.stage === "deposit"
                            ? { depositAtomic: amount }
                            : { borrowAtomic: amount }),
                        }),
                      );
                    })
                  }
                >
                  {busy
                    ? t("Đang chuẩn bị…", "Preparing…")
                    : t("Xem trước giao dịch", "Preview transaction")}
                </button>
              )}
            </>
          )}
          {check && preview && (
            <div className="setup-preview">
              <StatusBadge tone="success">
                {t("Simulation thành công", "Simulation passed")}
              </StatusBadge>
              <p>
                <strong>
                  {preview.stage === "withdraw"
                    ? t("Rút thế chấp", "Withdraw collateral")
                    : preview.stage === "deposit"
                      ? t("Thế chấp", "Deposit")
                      : t("Vay", "Borrow")}{" "}
                  {exactToken(preview.amountAtomic, preview.stage !== "borrow" ? 9 : 6, locale)}{" "}
                  {preview.stage !== "borrow" ? "SOL" : check.debtSymbol}
                </strong>
              </p>
              {preview.totalSolDebitLamports && (
                <p>
                  {t(
                    "SOL giảm theo simulation (gồm phí/tạo tài khoản):",
                    "Simulated SOL debit (including fees/account creation):",
                  )}{" "}
                  {exactToken(preview.totalSolDebitLamports, 9, locale)} SOL
                </p>
              )}
              <PreviewExpiry expiresAt={preview.expiresAt} />
              <button
                className="button button-secondary"
                disabled={busy}
                onClick={() => setPreview(null)}
              >
                {t("Chuẩn bị lại", "Prepare again")}
              </button>
              <p>
                {t("Phí mạng dự kiến:", "Estimated network fee:")}{" "}
                {exactToken(preview.feeLamports, 9, locale)} SOL
              </p>
              <p className="small-note">
                {t(
                  "Có thể thêm tiền tạo tài khoản; xem tổng thay đổi trong ví. Preview hết hạn sau một phút.",
                  "Account creation may cost additional SOL; review changes in your wallet. Preview expires after one minute.",
                )}
              </p>
              <button
                className="button button-primary"
                disabled={busy || Boolean(pending)}
                onClick={() => void run(sign)}
              >
                {busy
                  ? t("Đang chờ ví hoặc mạng…", "Waiting for wallet or network…")
                  : t("Xác nhận trong ví", "Confirm in wallet")}
              </button>
            </div>
          )}
        </section>
      </div>
      {check && (
        <details className="data-panel section-rail">
          <summary>{t("Địa chỉ môi trường đã đọc", "Inspected environment addresses")}</summary>
          <p className="small-note">
            {t(
              "Địa chỉ đã đọc không đồng nghĩa khoản vay đã tạo thành công. Kết quả cần được xác minh sau ký.",
              "Read addresses do not prove a loan was created. Results must be verified after signing.",
            )}
          </p>
          <pre className="config-values">{`KAMINO_MARKET_ID=${check.config.market}\nKAMINO_COLLATERAL_RESERVE=${check.config.collateral}\nKAMINO_DEBT_RESERVE=${check.config.debt}`}</pre>
        </details>
      )}
    </>
  );
}
