import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

/** @type {import("next").NextConfig} */
export default {
  reactStrictMode: true,
  // The repo root has its own lockfile: keep Next.js inside site/.
  turbopack: { root: import.meta.dirname },
  async redirects() {
    return [{ source: "/", destination: "/docs", permanent: false }];
  },
};
