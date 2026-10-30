import { lastModified, pages } from "./_lib/content";
import { examples } from "./_lib/examples";
import { SITE_URL, examplePath, pagePath } from "./_lib/seo";

export const dynamic = "force-static";

// Every indexable docs page. Pages marked noindex stay out.
export default function sitemap() {
  const landing = { url: SITE_URL, lastModified: new Date() };
  const docs = Object.keys(pages)
    .filter((slug) => !pages[slug].noindex)
    .map((slug) => ({
      url: `${SITE_URL}${pagePath(slug)}`,
      lastModified: lastModified(slug),
    }));
  const samples = Object.keys(examples).map((slug) => ({
    url: `${SITE_URL}${examplePath(slug)}`,
    lastModified: lastModified(`examples/${slug}`),
  }));
  return [landing, ...docs, ...samples];
}
