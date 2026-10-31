// Metadata shared by every page: the site-wide defaults for each root layout
// and the per-page metadata built from pages.json.
import { describe, pages } from "./content";

export const SITE_URL = "https://tsunami.zercoms.com";
export const SITE_NAME = "Tsunami";
export const HOME_TITLE = "Tsunami – a quiet UI framework";
const IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "Tsunami 津波, a quiet UI framework",
};

export const pagePath = (slug) => (slug === "index" ? "/docs" : `/docs/${slug}`);

// Site-wide defaults, exported as `metadata` from each root layout. A page's
// own openGraph and twitter objects replace these whole, so pageMetadata
// builds them in full.
export const siteMetadata = {
  metadataBase: new URL(SITE_URL),
  title: { template: `%s – ${SITE_NAME}`, default: HOME_TITLE },
  applicationName: SITE_NAME,
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/docs/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  manifest: "/manifest.webmanifest",
};

// Exported as `viewport` from each root layout.
export const siteViewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfc" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1316" },
  ],
};

// Page metadata from its own fields: title, description, path and flags.
function metadataFor({ title, description, path, noindex, home }) {
  const shown = home ? HOME_TITLE : `${title} – ${SITE_NAME}`;
  return {
    title: home ? { absolute: HOME_TITLE } : title,
    description,
    alternates: { canonical: path },
    ...(noindex && { robots: { index: false, follow: true } }),
    openGraph: {
      type: home ? "website" : "article",
      siteName: SITE_NAME,
      url: path,
      title: shown,
      description,
      locale: "en_US",
      images: [IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: shown,
      description,
      images: [IMAGE.url],
    },
  };
}

// The metadata of one docs page.
export function pageMetadata(slug) {
  const { title, description, noindex } = pages[slug];
  return metadataFor({
    title,
    description: describe(description),
    noindex,
    home: slug === "index",
    path: pagePath(slug),
  });
}

export const examplePath = (slug) => `/examples/${slug}`;

// The metadata of one full-page example.
export function exampleMetadata(slug, { title, description }) {
  return metadataFor({ title, description, path: examplePath(slug) });
}
