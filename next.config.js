/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Pin the tracing root to this project so `.next/standalone/server.js` lands at
  // the root (otherwise Next infers a parent dir and nests it under the full path).
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.reuters.com",
      },
      {
        protocol: "https",
        hostname: "**.ft.com",
      },
      {
        protocol: "https",
        hostname: "**.bloomberg.com",
      },
    ],
  },
  serverExternalPackages: ["rss-parser"],
  experimental: {
    // rss-parser uses dynamic require — load at runtime instead of bundling
  },
};

module.exports = nextConfig;
