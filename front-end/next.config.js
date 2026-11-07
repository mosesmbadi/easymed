/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // Browser tests build elsewhere, so they can't disturb a running `next start`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },

  // Proxy backend media files so the browser never hits the Docker-internal hostname
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
    return [
      {
        source: "/backend-media/:path*",
        destination: `${backendUrl}/images/:path*`,
      },
    ];
  },
}
module.exports = nextConfig
