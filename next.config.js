/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "ipecc.org.br" }],
        destination: "https://www.ipecc.org.br/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "site-ipecc.vercel.app" }],
        destination: "https://www.ipecc.org.br/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "site-ipecc-7hrx.vercel.app" }],
        destination: "https://www.ipecc.org.br/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;
