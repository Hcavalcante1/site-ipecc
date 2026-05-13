/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/login",
        destination: "/api/admin/login",
      },
    ];
  },
};

module.exports = nextConfig;
