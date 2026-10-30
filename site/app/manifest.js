// The web app manifest, served at /manifest.webmanifest.
export default function manifest() {
  return {
    name: "Tsunami",
    short_name: "Tsunami",
    description: "A quiet UI framework for back-office apps.",
    start_url: "/docs",
    display: "browser",
    background_color: "#fcfcfc",
    theme_color: "#2b7f93",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/docs/favicon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
