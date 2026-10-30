import { HOME_TITLE, SITE_NAME } from "../_lib/seo";

const description =
  "Tsunami is a quiet UI framework for back-office apps: semantic HTML, data attributes and a little vanilla JS, 53 components, no dependencies.";

export const metadata = {
  title: { absolute: HOME_TITLE },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: "/",
    title: HOME_TITLE,
    description,
    locale: "en_US",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description,
    images: ["/og.png"],
  },
};

const REPO = "https://github.com/Djirasak/tsunami-framework";

// A flat wave band: `period` is one wave, 2400 / period of them fill the
// viewBox, and half of the band is a whole number of waves, so the CSS slide
// of -50% loops without a jump.
function wave(period, amplitude, base) {
  let d = `M0,${base}`;
  for (let x = 0; x < 2400; x += period)
    d += x === 0
      ? ` Q${period / 4},${base - amplitude} ${period / 2},${base} T${period},${base}`
      : ` T${x + period / 2},${base} T${x + period},${base}`;
  return `${d} L2400,200 L0,200 Z`;
}

const waves = [
  { name: "back", d: wave(600, 46, 90) },
  { name: "mid", d: wave(400, 34, 120) },
  { name: "front", d: wave(300, 22, 150) },
];

const features = [
  {
    icon: "layers",
    title: "Native first",
    text: "dialog, popover, details and button do the work. JavaScript only where HTML can't.",
  },
  {
    icon: "sliders-horizontal",
    title: "Zero specificity",
    text: "Every rule sits in a cascade layer inside :where(), so your own CSS always wins.",
  },
  {
    icon: "moon",
    title: "Light and dark",
    text: "35 CSS variables switch the whole theme at runtime, with no flash on load.",
  },
  {
    icon: "package",
    title: "No dependencies",
    text: "Plain CSS and vanilla JS from one CDN link. Heavy parts such as the editor load only when used.",
  },
];

export default function Landing() {
  return (
    <>
      <header className="landing-header">
        <a href="/" className="landing-brand">
          <img src="/docs/favicon.svg" alt="" width="28" height="28" />
          <span>Tsunami</span>
        </a>
        <nav aria-label="Main">
          <a href="/docs" className="link" data-variant="muted">
            Docs
          </a>
          <a href={REPO} className="link" data-variant="muted">
            GitHub
          </a>
          <div className="theme-switcher" role="group" aria-label="Theme">
            <button
              type="button"
              data-theme-toggle="light"
              aria-label="Light"
              suppressHydrationWarning
            >
              <i className="icon icon-sun" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              data-theme-toggle="dark"
              aria-label="Dark"
              suppressHydrationWarning
            >
              <i className="icon icon-moon" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              data-theme-toggle="system"
              aria-label="System"
              suppressHydrationWarning
            >
              <i className="icon icon-monitor" aria-hidden="true"></i>
            </button>
          </div>
        </nav>
      </header>

      <div className="landing-sea" aria-hidden="true">
        {waves.map((w) => (
          <svg
            key={w.name}
            className={`wave wave-${w.name}`}
            viewBox="0 0 2400 200"
            preserveAspectRatio="none"
          >
            <path d={w.d} />
          </svg>
        ))}
      </div>

      <main className="landing">
        <section className="landing-hero">
          <span className="badge">53 components</span>
          <h1>
            A quiet UI framework
            <br />
            for back-office apps
          </h1>
          <p className="landing-lead">
            Semantic HTML, <code>data-*</code> attributes and a little vanilla
            JS. One class names the component, one attribute picks the variant.
          </p>
          <div className="landing-actions">
            <a className="btn" data-variant="primary" data-size="lg" href="/docs">
              Read the docs
              <i className="icon icon-arrow-right" aria-hidden="true"></i>
            </a>
            <a className="btn" data-size="lg" href={REPO}>
              GitHub
            </a>
          </div>
        </section>

        <section className="landing-grid" aria-label="Features">
          {features.map((f) => (
            <article className="card" key={f.title}>
              <section>
                <i className={`icon icon-${f.icon}`} aria-hidden="true"></i>
                <h2>{f.title}</h2>
                <p>{f.text}</p>
              </section>
            </article>
          ))}
        </section>

        <section className="landing-samples" aria-labelledby="samples">
          <h2 id="samples">Sample pages</h2>
          <div className="empty">
            <header>
              <figure>
                <i className="icon icon-layout-dashboard" aria-hidden="true"></i>
              </figure>
              <h3>Full-page samples are coming</h3>
              <p>
                Dashboards, tables, forms and settings screens built with
                Tsunami. Until then every component has a live example in the
                docs.
              </p>
            </header>
            <footer>
              <div>
                <a className="btn" href="/docs">
                  Browse the components
                </a>
              </div>
            </footer>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <span>Tsunami 津波</span>
        <a className="link" data-variant="muted" href={REPO}>
          github.com/Djirasak/tsunami-framework
        </a>
      </footer>
    </>
  );
}
