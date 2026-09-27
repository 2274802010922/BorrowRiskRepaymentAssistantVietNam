"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { Locale } from "../../shared/types";

const LanguageContext = createContext<{
  locale: Locale;
  setLocale: (v: Locale) => void;
  t: (vi: string, en: string) => string;
}>({ locale: "vi", setLocale: () => {}, t: (vi) => vi });
export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  const [locale, update] = useState(initialLocale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  function setLocale(value: Locale) {
    update(value);
    try {
      document.cookie = `borrowrisk-locale=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
    } catch {
      /* A language preference is optional storage. */
    }
  }
  return (
    <LanguageContext.Provider
      value={{ locale, setLocale, t: (vi, en) => (locale === "vi" ? vi : en) }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
export const useLanguage = () => useContext(LanguageContext);
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();
  return (
    <label className="language-select">
      <span className="sr-only">{t("Ngôn ngữ", "Language")}</span>
      <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
        <option value="vi">VI</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
}
