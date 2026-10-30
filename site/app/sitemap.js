import { lastModified, pages } from "./_lib/content";
import { SITE_URL, pagePath } from "./_lib/seo";

export const dynamic = "force-static";

// Every indexable docs page. Pages marked noindex stay out.
export default function sitemap() {
  return Object.keys(pages)
    .filter((slug) => !pages[slug].noindex)
    .map((slug) => ({
      url: `${SITE_URL}${pagePath(slug)}`,
      lastModified: lastModified(slug),
    }));
}
