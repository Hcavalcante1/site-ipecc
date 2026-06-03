/** @type {import('next').NextConfig} */
const nextConfig = {
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
