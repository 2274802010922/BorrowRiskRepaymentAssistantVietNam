"use client";
import { useEffect, useState } from "react";
import { Notice } from "./states";
import { useLanguage } from "../../i18n/provider";
export function ExecutionReadiness() {
  const { t } = useLanguage();
  const [state, setState] = useState<"loading" | "configured" | "missing" | "unavailable">(
    "loading",
  );
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/health", { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const data = await r.json();
        setState(data.executionConfigured ? "configured" : "missing");
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("unavailable");
      });
    return () => controller.abort();
  }, []);
  if (state === "configured")
    return (
      <p className="small-note">
        {t(
          "RPC mục tiêu: Solana Devnet. Market và oracle sẽ được kiểm tra trước mỗi giao dịch.",
          "Target RPC: Solana Devnet. Market and oracle checks run before each transaction.",
        )}
      </p>
    );
  return (
    <Notice
      tone={state === "loading" ? "info" : "warning"}
      title={t("Khả năng giao dịch Devnet", "Devnet execution readiness")}
    >
      {state === "loading"
        ? t("Đang kiểm tra cấu hình…", "Checking configuration…")
        : state === "missing"
          ? t(
              "Bản triển khai chưa đủ cấu hình để vay/trả thật. Bạn vẫn có thể kết nối ví và dùng minh họa. Người vận hành cần cấu hình market, reserves và secret rồi kiểm tra market.",
              "This deployment is not configured for borrowing or repayment. Wallet connection and examples remain available. The operator must configure the market, reserves and secret, then validate the market.",
            )
          : t(
              "Chưa kiểm tra được backend. Không coi đây là ví không có khoản vay; thử lại sau.",
              "Backend readiness could not be checked. This does not mean the wallet has no positions; try again later.",
            )}
    </Notice>
  );
}
