/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
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
