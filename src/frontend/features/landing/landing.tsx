"use client";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, MoveDown } from "lucide-react";
import { AppHeader, Brand } from "../../components/layout/shell";
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
              <span className="network-dot" /> SOLANA DEVNET / PICACHU
            </p>
            <h1>
              {t("Trả bao nhiêu,", "How much to repay,")}
              <br />
              <span>{t("giữ lại bao nhiêu?", "how much to keep?")}</span>
            </h1>
            <p className="hero-lede">
              {t(
                "Nếu giá SOL giảm, khoản vay của bạn sẽ ra sao? Thử kịch bản, cân đối ngân sách và xem kết quả trước khi tự xác nhận bằng ví.",
                "What happens to your loan if SOL falls? Explore a scenario, set your budget, and see the outcome before approving with your wallet.",
              )}
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/portfolio">
                {t("Thử với dữ liệu minh họa", "Explore an example")}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link className="button button-secondary" href="/setup">
                {t("Tạo khoản vay Devnet", "Create a Devnet loan")}
              </Link>
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
                −30<span>%</span>
              </strong>
            </div>
            <div className="terminal-comparison">
              <div>
                <span>{t("Nợ hiện tại", "Current debt")}</span>
                <strong>
                  165 <small>USDC</small>
                </strong>
              </div>
              <ArrowRight size={22} aria-hidden="true" />
              <div>
                <span>{t("Nếu trả 13,6 USDC", "After a 13.6 USDC repayment")}</span>
                <strong>
                  {t("151,4", "151.4")} <small>USDC</small>
                </strong>
              </div>
            </div>
            <div className="terminal-row">
              <span>{t("Tiền muốn giữ lại", "Reserve to keep")}</span>
              <strong>20 USDC</strong>
            </div>
            <div className="terminal-row">
              <span>{t("Dư địa mục tiêu sau kịch bản", "Target buffer after the scenario")}</span>
              <strong>5%</strong>
            </div>
            <div className="terminal-note">
              <Check size={17} aria-hidden="true" />
              <span>
                {t(
                  "Chỉ trả 13,6 USDC, còn 66,4 USDC trong ví.",
                  "Repay only 13.6 USDC and keep 66.4 USDC in the wallet.",
                )}
              </span>
            </div>
            <p className="terminal-caption">
              {t(
                "Ba khoản nợ 65/55/45 USDC, mỗi khoản 1 SOL × 100 USD, threshold 80%, factor 1. Dữ liệu giả định, chưa gồm lãi và phí.",
                "Debts of 65/55/45 USDC, each backed by 1 SOL at 100 USD, threshold 80%, factor 1. Synthetic data, excluding interest and fees.",
              )}
            </p>
          </div>
        </section>
        <section
          className="product-strip page-shell"
          aria-label={t("Bạn có thể làm gì", "What you can do")}
        >
          <div>
            <span className="eyebrow">01 / {t("HIỂU", "UNDERSTAND")}</span>
            <strong>{t("Nợ và thế chấp", "Debt and collateral")}</strong>
            <p>
              {t(
                "Biết vị thế hiện tại trước khi thay đổi.",
                "Know your position before making a change.",
              )}
            </p>
          </div>
          <div>
            <span className="eyebrow">02 / {t("CÂN ĐỐI", "BALANCE")}</span>
            <strong>{t("Ngân sách và dự trữ", "Budget and reserve")}</strong>
            <p>
              {t(
                "Xem tác động của số tiền bạn có thể trả.",
                "See what your available repayment changes.",
              )}
            </p>
          </div>
          <div>
            <span className="eyebrow">03 / {t("XÁC NHẬN", "VERIFY")}</span>
            <strong>{t("Bạn giữ quyền ký", "You control signing")}</strong>
            <p>
              {t("Đối chiếu kết quả trên Solana Devnet.", "Verify the result on Solana Devnet.")}
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
          <Brand />
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
