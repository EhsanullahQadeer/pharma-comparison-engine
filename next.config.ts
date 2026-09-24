import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["patchright", "patchright-core", "chromium-bidi"],
};

export default nextConfig;
