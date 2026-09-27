"use client";
import Link from "next/link";
import { useLanguage } from "../frontend/i18n/provider";
export default function NotFound() {
  const { t } = useLanguage();
  return (
    <main id="main" className="page-shell section-rail">
      <h1>404</h1>
      <p>{t("Trang này không tồn tại.", "This page does not exist.")}</p>
      <Link href="/" className="button button-primary">
        BorrowRisk →
      </Link>
    </main>
  );
}
