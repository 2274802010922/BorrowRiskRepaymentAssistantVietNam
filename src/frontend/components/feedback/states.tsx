"use client";
import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Clock3, Info } from "lucide-react";
import { useLanguage } from "../../i18n/provider";

export type Tone = "neutral" | "info" | "warning" | "danger" | "success";
export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`status-badge tone-${tone}`}>{children}</span>;
}
export function Notice({
  title,
  children,
  tone = "info",
}: {
  title: string;
  children?: ReactNode;
  tone?: Tone;
}) {
  const Icon =
    tone === "danger"
      ? AlertCircle
      : tone === "success"
        ? CheckCircle2
        : tone === "warning"
          ? Clock3
          : Info;
  return (
    <div className={`notice tone-${tone}`} role={tone === "danger" ? "alert" : "status"}>
      <Icon size={19} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {children && <div className="notice-detail">{children}</div>}
      </div>
    </div>
  );
}
export function ContentSkeleton() {
  const { t } = useLanguage();
  return (
    <div role="status" aria-busy="true" className="content-skeleton">
      <span className="sr-only">{t("Đang tải khoản vay", "Loading positions")}</span>
      <div aria-hidden="true">
        <div className="skeleton-line" />
        <div className="skeleton-line short" />
        <div className="skeleton-panel" />
      </div>
    </div>
  );
}
export function PageHeading({
  index,
  title,
  description,
  action,
}: {
  index: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{index}</p>
        <h1>{title}</h1>
        <p className="lede">{description}</p>
      </div>
      {action}
    </div>
  );
}
