"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, Wallet, BookOpen, FlaskConical, LayoutDashboard } from "lucide-react";
import { LanguageSwitcher, useLanguage } from "../../i18n/provider";
import { useWallet } from "../wallet/provider";
import { errorMessage } from "../../lib/errors";

export function Brand() {
  const { t } = useLanguage();
  return (
    <Link className="brand" href="/" aria-label="picachu">
      <Image
        className="brand-symbol"
        src="/brand/picachu-logo.jpg"
        alt=""
        width={48}
        height={36}
        priority
      />
      <span>
        picachu
        <span className="brand-country">{t("HIỂU RÕ KHOẢN VAY", "BORROW WITH CLARITY")}</span>
      </span>
    </Link>
  );
}
function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname(),
    { t } = useLanguage();
  const items = [
    { href: "/portfolio", label: t("Phương án trả nợ", "Repayment plan"), icon: Wallet },
    { href: "/setup", label: t("Thiết lập demo", "Demo setup"), icon: FlaskConical },
    { href: "/guide", label: t("Cách sử dụng", "How it works"), icon: BookOpen },
  ];
  return (
    <>
      <p className="eyebrow">{t("KHÔNG GIAN NGƯỜI VAY", "BORROWER WORKSPACE")}</p>
      <nav aria-label={t("Điều hướng chính", "Main navigation")}>
        {items.map((item) => (
          <Link
            onClick={onNavigate}
            aria-current={path === item.href ? "page" : undefined}
            key={item.href}
            href={item.href}
          >
            <item.icon size={18} aria-hidden="true" />
            {item.label}
          </Link>
        ))}
        <details open={path === "/lab" || path === "/workspace" || undefined}>
          <summary>{t("Nâng cao", "Advanced")}</summary>
          <Link
            href="/workspace"
            aria-current={path === "/workspace" ? "page" : undefined}
            onClick={onNavigate}
          >
            <LayoutDashboard size={18} aria-hidden="true" />
            {t("Khoản vay đơn và lịch sử", "Single loan and history")}
          </Link>
          <Link
            href="/lab"
            aria-current={path === "/lab" ? "page" : undefined}
            onClick={onNavigate}
          >
            <FlaskConical size={18} aria-hidden="true" />
            {t("Phòng kiểm thử UI", "UI state lab")}
          </Link>
        </details>
      </nav>
      <div className="sidebar-note">
        <span className="network-dot" /> Solana Devnet
        <p>
          {t(
            "Môi trường thử nghiệm. Token không có giá trị tiền thật.",
            "Test environment. Tokens have no real monetary value.",
          )}
        </p>
      </div>
    </>
  );
}
export function AppHeader({ workspace = false }: { workspace?: boolean }) {
  const { t, locale } = useLanguage(),
    w = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) {
      el.close();
      trigger.current?.focus();
    }
    if (!open) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, [open]);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <>
      <a className="skip-link" href="#main">
        {t("Đến nội dung chính", "Skip to content")}
      </a>
      <header className="app-header">
        <div className="header-inner">
          <Brand />
          <div className="header-actions">
            {!workspace && (
              <Link className="header-link" href="/guide">
                {t("Cách sử dụng", "How it works")}
              </Link>
            )}
            {w.wallet ? (
              <details className="wallet-menu">
                <summary className="button button-secondary">
                  {w.wallet.slice(0, 4)}…{w.wallet.slice(-4)}
                </summary>
                <div className="wallet-menu-content">
                  <strong>Phantom</strong>
                  <code>{w.wallet}</code>
                  <p className="small-note">
                    {t("RPC ứng dụng: Solana Devnet", "App RPC: Solana Devnet")}
                  </p>
                  <button
                    className="button button-secondary"
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(w.wallet!)
                        .then(() => setCopied(true))
                        .catch(() => setCopied(false));
                    }}
                  >
                    {copied ? t("Đã sao chép", "Copied") : t("Sao chép địa chỉ", "Copy address")}
                  </button>
                  <a
                    className="text-link"
                    target="_blank"
                    rel="noreferrer"
                    href={`https://explorer.solana.com/address/${w.wallet}?cluster=devnet`}
                  >
                    Solana Explorer ↗
                  </a>
                  <button
                    className="button button-secondary"
                    disabled={w.busy}
                    onClick={() => void w.disconnect()}
                  >
                    {t("Ngắt kết nối", "Disconnect")}
                  </button>
                </div>
              </details>
            ) : (
              <button
                className="button button-secondary account-button"
                type="button"
                aria-busy={w.busy}
                title={
                  w.wallet
                    ? t("Ngắt kết nối ví", "Disconnect wallet")
                    : t("Kết nối ví · Phantom", "Connect wallet · Phantom")
                }
                disabled={w.busy}
                onClick={() => void w.connect()}
              >
                <Wallet size={16} aria-hidden="true" />
                <span>
                  {w.wallet
                    ? `${w.wallet.slice(0, 4)}…${w.wallet.slice(-4)}`
                    : t("Kết nối ví", "Connect wallet")}
                </span>
              </button>
            )}
            <LanguageSwitcher />
            {workspace && (
              <button
                ref={trigger}
                className="icon-button mobile-nav-button"
                type="button"
                aria-label={t("Mở điều hướng", "Open navigation")}
                aria-expanded={open}
                aria-controls="mobile-navigation"
                onClick={() => setOpen(true)}
              >
                <Menu aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </header>
      {!workspace && w.error && (
        <div role="alert" className="page-shell setup-entry">
          {errorMessage(w.error, locale)}
        </div>
      )}
      {workspace && (
        <dialog
          ref={dialog}
          id="mobile-navigation"
          className="mobile-drawer"
          aria-label={t("Điều hướng", "Navigation")}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>(
                "a[href], button:not([disabled]), select, input, summary",
              ),
            ).filter((item) => item.checkVisibility() && item.tabIndex >= 0);
            const first = items[0],
              last = items.at(-1);
            if (!first || !last) return;
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            }
            if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }}
          onCancel={(e) => {
            e.preventDefault();
            close();
          }}
          onClick={(e) => {
            if (e.target === dialog.current) close();
          }}
        >
          <div className="drawer-inner">
            <div className="drawer-top">
              <Brand />
              <button
                className="icon-button"
                onClick={close}
                aria-label={t("Đóng điều hướng", "Close navigation")}
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <Navigation onNavigate={close} />
          </div>
        </dialog>
      )}
    </>
  );
}
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader workspace />
      <div className="workspace-shell">
        <aside className="sidebar">
          <Navigation />
        </aside>
        <main id="main" className="workspace-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </>
  );
}
