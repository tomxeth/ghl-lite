import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: ["@prisma/client", "bcrypt", "twilio", "mailgun.js"],
};

export default nextConfig;
