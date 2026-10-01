"use client";
import { useLanguage } from "../../frontend/i18n/provider";
export default function ErrorBoundary({ reset }: { reset: () => void }) {
  const { t } = useLanguage();
  return (
    <main className="page-shell section-rail" id="main">
      <h1>{t("Chưa tải được không gian khoản vay", "Workspace could not be loaded")}</h1>
      <p role="alert">
        {t(
          "Dữ liệu chưa tải không được xem là dữ liệu trống. Hãy thử lại.",
          "Unloaded data is not empty data. Please try again.",
        )}
      </p>
      <button className="button button-primary" onClick={reset}>
        {t("Thử lại", "Try again")}
      </button>
    </main>
  );
}
