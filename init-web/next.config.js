/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",                    // toutes les requêtes /api/...
        destination: "http://init_api:3000/api/:path*", // vers le backend Docker
      },
    ];
  },
};

module.exports = nextConfig;

