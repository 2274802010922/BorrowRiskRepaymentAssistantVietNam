import type { NextConfig } from "next";

const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER;
if (cluster && cluster !== "devnet") {
  throw new Error("BorrowRisk foundation supports Solana Devnet only.");
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["@kamino-finance/klend-sdk", "@solana/kit"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
