/** @type {import('next').NextConfig} */
const nextConfig = {
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
