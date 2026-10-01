"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "../../i18n/provider";
export function PreviewExpiry({ expiresAt }: { expiresAt: number }) {
  const { t } = useLanguage();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const seconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  return (
    <p className="small-note">
      {seconds
        ? t(
            `Preview còn ${seconds} giây. Kiểm tra số tiền trước khi ký.`,
            `Preview expires in ${seconds}s. Review the amount before signing.`,
          )
        : t(
            "Preview đã hết hạn. Hãy chuẩn bị lại giao dịch.",
            "Preview expired. Prepare a fresh transaction.",
          )}
    </p>
  );
}
