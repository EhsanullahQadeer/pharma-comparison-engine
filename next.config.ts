import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["patchright", "patchright-core", "chromium-bidi"],
  // The old build-progress page became the all-pages site map.
  async redirects() {
    return [{ source: "/ed/roadmap", destination: "/ed/site-map", permanent: true }];
  },
};

export default nextConfig;
