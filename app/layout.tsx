import type { Metadata } from "next";
import { cookies } from "next/headers";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "../frontend/styles/globals.css";
import { LanguageProvider } from "../frontend/i18n/provider";
import { WalletProvider } from "../frontend/components/wallet/provider";

export const metadata: Metadata = {
  metadataBase: new URL("https://picachu-iota.vercel.app"),
  title: "picachu — Hiểu khoản vay, chủ động trả nợ",
  description: "Mô phỏng rủi ro và lập phương án trả nợ theo ngân sách. Solana Devnet.",
  openGraph: {
    title: "picachu — Hiểu khoản vay, chủ động trả nợ",
    images: [
      { url: "/brand/picachu-logo.jpg", width: 1024, height: 765, alt: "Logo pixel picachu" },
    ],
  },
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const locale = store.get("borrowrisk-locale")?.value === "en" ? "en" : "vi";
  return (
    <html lang={locale}>
      <body>
        <LanguageProvider initialLocale={locale}>
          <WalletProvider>{children}</WalletProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
