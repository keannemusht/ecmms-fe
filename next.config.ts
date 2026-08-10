import type { NextConfig } from "next";

function normalizeBackendUrl(url: string | undefined): string {
  if (!url) return "http://localhost:8000";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = normalizeBackendUrl(process.env.BACKEND_URL);
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
