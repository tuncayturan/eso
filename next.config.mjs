import withPWA from "next-pwa";

const isProd = process.env.NODE_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  turbopack: {},
  experimental: { 
    serverActions: { bodySizeLimit: "2mb" },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
  output: "standalone",
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: !isProd,
  buildExcludes: [/middleware-manifest.json$/],
})(nextConfig);
