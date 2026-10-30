import LandingScript from "../_components/LandingScript";
import { version } from "../_lib/content";
import { HOME_TITLE, SITE_NAME } from "../_lib/seo";

const description =
  "Tsunami is a quiet UI framework: semantic HTML, data attributes and a little vanilla JS, 64 components, and a core with no dependencies.";

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
    title: "A light core",
    text: "Two files, CSS and vanilla JS, with no dependencies. The editor, chart, date picker and drag and drop each load a library, only on the pages that use them.",
  },
];

const orders = [
  ["#1042", "Emma Wilson", "Paid", "ok", "$74.00"],
  ["#1041", "Noah Brown", "Pending", "warning", "$129.50"],
  ["#1040", "Mia Chen", "Shipped", "info", "$48.00"],
  ["#1039", "Lucas Meyer", "Refunded", "danger", "$215.00"],
];

const samples = [
  {
    slug: "dashboard",
    title: "Dashboard",
    text: "Stats, charts and recent orders.",
  },
  {
    slug: "orders",
    title: "Orders",
    text: "A table with filters and bulk actions.",
  },
  {
    slug: "settings",
    title: "Settings",
    text: "A multi-step form with validation.",
  },
  {
    slug: "login",
    title: "Sign in",
    text: "Email, password and a one-time code.",
  },
];

export default function Landing() {
  return (
    <>
      <LandingScript />
      <section className="landing-stage">
        <canvas className="landing-sea" aria-hidden="true"></canvas>
        <span className="landing-kanji" aria-hidden="true">
          津波
        </span>

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

        <div className="landing-hero">
          <span className="badge landing-rise" style={{ "--i": 0 }}>
            64 components
          </span>
          <h1>
            <span className="landing-rise" style={{ "--i": 1 }}>
              A quiet UI framework
            </span>
          </h1>
          <p className="landing-lead landing-rise" style={{ "--i": 3 }}>
            Semantic HTML, <code>data-*</code> attributes and a little vanilla
            JS. One class names the component, one attribute picks the variant.
          </p>
          <div className="landing-actions landing-rise" style={{ "--i": 4 }}>
            <a className="btn" data-variant="primary" data-size="xl" href="/docs">
              Read the docs
              <i className="icon icon-arrow-right" aria-hidden="true"></i>
            </a>
          </div>
        </div>
      </section>

      <main className="landing">
        <div className="landing-device" aria-hidden="true">
          <div className="landing-device-bar">
            <i></i>
            <i></i>
            <i></i>
            <span>tsunami.zercoms.com / orders</span>
          </div>
          <div className="landing-device-body">
            <dl className="stat">
              <div>
                <dt>Revenue</dt>
                <dd>$12,840</dd>
                <dd data-variant="ok">+12.4% from last month</dd>
              </div>
              <div>
                <dt>Orders</dt>
                <dd>1,284</dd>
                <dd>+3.1%</dd>
              </div>
              <div>
                <dt>Refunds</dt>
                <dd>18</dd>
                <dd data-variant="danger">+2 orders</dd>
              </div>
            </dl>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Status</th>
                  <th scope="col" data-align="end">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map(([id, name, status, variant, total]) => (
                  <tr key={id}>
                    <th scope="row">{id}</th>
                    <td>{name}</td>
                    <td>
                      <span className="badge" data-variant={variant}>
                        {status}
                      </span>
                    </td>
                    <td data-align="end">{total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="landing-device-note alert" data-variant="ok">
            <i className="icon icon-circle-check" aria-hidden="true"></i>
            <strong>Payment captured</strong>
            <p>$74.00 for order #1042</p>
          </div>
        </div>

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
          <p className="landing-samples-lead">
            Full pages built only from Tsunami components, nothing else. Open
            one and read its HTML.
          </p>
          <div className="landing-samples-grid">
            {samples.map((x) => (
              <a className="landing-sample" href={`/examples/${x.slug}`} key={x.slug}>
                <span className="landing-sample-shot">
                  <img
                    className="landing-shot-light"
                    src={`/examples/${x.slug}-light.jpg`}
                    alt=""
                    width="640"
                    height="400"
                    loading="lazy"
                  />
                  <img
                    className="landing-shot-dark"
                    src={`/examples/${x.slug}-dark.jpg`}
                    alt=""
                    width="640"
                    height="400"
                    loading="lazy"
                  />
                </span>
                <strong>{x.title}</strong>
                <span>{x.text}</span>
              </a>
            ))}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <span>
          Tsunami 津波 <span className="landing-version">v{version()}</span>
        </span>
        <a className="link" data-variant="muted" href={REPO}>
          github.com/Djirasak/tsunami-framework
        </a>
      </footer>
    </>
  );
}
