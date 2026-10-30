import { SITE_URL } from "./_lib/seo";

export const dynamic = "force-static";

export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
