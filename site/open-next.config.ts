import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Every docs page is prerendered at build time, so the prerendered output is
// served from the static assets: no R2 bucket or KV namespace is needed.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
