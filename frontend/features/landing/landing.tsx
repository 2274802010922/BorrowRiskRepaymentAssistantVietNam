"use client";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, MoveDown } from "lucide-react";
import { AppHeader } from "../../components/layout/shell";
import { useLanguage } from "../../i18n/provider";

export function Landing() {
  const { t } = useLanguage();
  return (
    <>
      <AppHeader />
      <main id="main" tabIndex={-1}>
        <section className="landing-hero page-shell">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="network-dot" /> SOLANA DEVNET / BORROWRISK
            </p>
            <h1>
              {t("Hiểu khoản vay.", "Understand your loan.")}
              <br />
              <span>{t("Chủ động bước tiếp.", "Choose your next step.")}</span>
            </h1>
            <p className="hero-lede">
              {t(
                "Nếu giá SOL giảm, khoản vay của bạn sẽ ra sao? Thử kịch bản, cân đối ngân sách và xem kết quả trước khi tự xác nhận bằng ví.",
                "What happens to your loan if SOL falls? Explore a scenario, set your budget, and see the outcome before approving with your wallet.",
              )}
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/workspace">
                {t("Thử với dữ liệu minh họa", "Explore an example")}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a className="text-link" href="#how">
                {t("Xem cách hoạt động", "See how it works")}
              </a>
            </div>
            <p className="hero-footnote">
              {t(
                "Bạn tự giữ ví và quyết định. Bản minh họa không yêu cầu kết nối ví.",
                "Your wallet. Your decision. No wallet needed to explore the example.",
              )}
            </p>
          </div>
          <div className="terminal-preview">
            <div className="terminal-top">
              <span className="eyebrow">
                {t("MỘT KỊCH BẢN, HAI KẾT QUẢ", "ONE SCENARIO, TWO OUTCOMES")}
              </span>
              <span className="demo-tag">{t("MINH HỌA", "EXAMPLE")}</span>
            </div>
            <div className="terminal-intro">
              <span>{t("Giả sử SOL giảm", "If SOL falls")}</span>
              <strong>
                −20<span>%</span>
              </strong>
            </div>
            <div className="terminal-comparison">
              <div>
                <span>{t("Nợ hiện tại", "Current debt")}</span>
                <strong>
                  600 <small>USDC</small>
                </strong>
              </div>
              <ArrowRight size={22} aria-hidden="true" />
              <div>
                <span>{t("Nếu trả 100 USDC", "After a 100 USDC repayment")}</span>
                <strong>
                  500 <small>USDC</small>
                </strong>
              </div>
            </div>
            <div className="terminal-row">
              <span>{t("Tiền muốn giữ lại", "Reserve to keep")}</span>
              <strong>50 USDC</strong>
            </div>
            <div className="terminal-row">
              <span>{t("LTV trong kịch bản", "Scenario LTV")}</span>
              <strong>{t("75% → 62,5%", "75% → 62.5%")}</strong>
            </div>
            <div className="terminal-note">
              <Check size={17} aria-hidden="true" />
              <span>
                {t(
                  "Giữ đủ dự trữ. Chưa đạt mục tiêu LTV 60%.",
                  "Reserve preserved. The 60% LTV target is not reached.",
                )}
              </span>
            </div>
            <p className="terminal-caption">
              {t(
                "Dữ liệu giả định, bỏ qua lãi và phí. Không phải số dư ví thật.",
                "Hypothetical data, excluding interest and fees. Not a real wallet balance.",
              )}
            </p>
          </div>
        </section>
        <section id="how" className="flow-section page-shell">
          <div className="section-heading">
            <p className="eyebrow">01 / {t("QUY TRÌNH", "THE WORKFLOW")}</p>
            <h2>
              {t("Từ dữ liệu đến một quyết định rõ ràng.", "From numbers to a clearer decision.")}
            </h2>
          </div>
          <div className="flow-grid">
            {[
              [
                "01",
                t("Đọc khoản vay", "Read the position"),
                t(
                  "Xem nợ, tài sản thế chấp và nguồn dữ liệu.",
                  "See debt, collateral, and where the data comes from.",
                ),
              ],
              [
                "02",
                t("Thử biến động", "Explore a scenario"),
                t(
                  "Hiểu điều gì thay đổi nếu giá tài sản giảm.",
                  "Understand what changes when collateral prices fall.",
                ),
              ],
              [
                "03",
                t("Cân đối khả năng", "Set your limits"),
                t(
                  "Chọn ngân sách và khoản dự trữ cần giữ.",
                  "Choose your budget and the balance you want to keep.",
                ),
              ],
              [
                "04",
                t("Tự xác nhận", "Approve yourself"),
                t(
                  "Xem trước, ký bằng ví và đối chiếu kết quả.",
                  "Preview, sign with your wallet, and verify the outcome.",
                ),
              ],
            ].map(([n, title, body]) => (
              <article className="flow-item" key={n}>
                <span className="step-index">{n}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="trust-section page-shell">
          <div>
            <p className="eyebrow">02 / {t("PHẠM VI RÕ RÀNG", "CLEAR BOUNDARIES")}</p>
            <h2>{t("Quyền quyết định\nvẫn ở bạn.", "The decision\nstays with you.")}</h2>
          </div>
          <div className="trust-list">
            <p>
              <Check size={18} aria-hidden="true" />
              {t(
                "Ứng dụng không yêu cầu seed phrase hoặc khóa bí mật.",
                "The app never asks for a seed phrase or private key.",
              )}
            </p>
            <p>
              <Check size={18} aria-hidden="true" />
              {t(
                "Phép tính có giả định; kịch bản không phải dự báo giá.",
                "Calculations disclose assumptions; scenarios are not predictions.",
              )}
            </p>
            <p>
              <Check size={18} aria-hidden="true" />
              {t(
                "Dữ liệu minh họa và trạng thái Devnet được ghi nhãn riêng.",
                "Illustrative data and Devnet state are labelled separately.",
              )}
            </p>
            <Link className="text-link" href="/guide">
              {t("Đọc hướng dẫn và giới hạn", "Read the guide and limitations")}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
        <footer className="page-shell site-footer">
          <span>BorrowRisk Vietnam</span>
          <span className="eyebrow">
            {t("HIỂU TRƯỚC KHI HÀNH ĐỘNG", "UNDERSTAND BEFORE ACTING")}
          </span>
          <Link href="/workspace">
            {t("Bắt đầu", "Get started")}
            <MoveDown size={14} aria-hidden="true" />
          </Link>
        </footer>
      </main>
    </>
  );
}
