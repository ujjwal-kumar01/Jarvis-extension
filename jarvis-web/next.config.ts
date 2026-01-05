import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // 👉 Separate backend (Express / Node)
      {
        source: "/backend/:path*",
        destination: "http://localhost:8000/:path*",
      },
      // ❗ DO NOT rewrite /api — Next.js uses it internally
    ];
  },
};

export default nextConfig;
