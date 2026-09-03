import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/apple-touch-icon.png", destination: "/apple-icon" },
    ];
  },
};

export default nextConfig;
