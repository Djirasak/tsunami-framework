// Structured data (schema.org JSON-LD) for a docs page: the site and the
// source code on the home page, a breadcrumb trail and a TechArticle on the
// other pages.
import { describe, nav, pages } from "./content";
import { SITE_NAME, SITE_URL, pagePath } from "./seo";

const REPO = "https://github.com/Djirasak/tsunami-framework";
const SITE_ID = `${SITE_URL}/docs#website`;
const abs = (slug) => `${SITE_URL}${pagePath(slug)}`;

export function jsonLd(slug) {
  const { title } = pages[slug];
  const description = describe(pages[slug].description);
  if (slug === "index") {
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": SITE_ID,
          name: SITE_NAME,
          alternateName: "Tsunami 津波",
          url: abs("index"),
          description,
          inLanguage: "en",
        },
        {
          "@type": "SoftwareSourceCode",
          name: SITE_NAME,
          description,
          url: abs("index"),
          codeRepository: REPO,
          programmingLanguage: ["CSS", "JavaScript"],
        },
      ],
    };
  }
  const group = nav.find((g) =>
    g.items.some((item) => item.href === pagePath(slug)),
  )?.title;
  const crumbs = [
    ["Docs", abs("index")],
    ...(group ? [[group, null]] : []),
    [title, abs(slug)],
  ];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map(([name, item], i) => ({
          "@type": "ListItem",
          position: i + 1,
          name,
          ...(item && { item }),
        })),
      },
      {
        "@type": "TechArticle",
        headline: `${title} – ${SITE_NAME}`,
        description,
        url: abs(slug),
        mainEntityOfPage: abs(slug),
        inLanguage: "en",
        isPartOf: { "@id": SITE_ID },
        publisher: { "@type": "Organization", name: SITE_NAME, url: abs("index") },
      },
    ],
  };
}

// JSON for a script element: "<" is escaped so the text cannot close it.
export const jsonLdText = (slug) =>
  JSON.stringify(jsonLd(slug)).replace(/</g, "\\u003c");
