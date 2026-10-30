import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

/** @type {import("next").NextConfig} */
export default {
  reactStrictMode: true,
  async redirects() {
    return [{ source: "/", destination: "/docs", permanent: false }];
  },
};
