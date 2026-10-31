import LandingScript from "../_components/LandingScript";
import { bundleSizes, componentCount, version } from "../_lib/content";
import { highlightHtml } from "../_lib/highlight";
import { HOME_TITLE, SITE_NAME } from "../_lib/seo";

const description = `Tsunami is a quiet UI framework: semantic HTML, data attributes and a little vanilla JS, ${componentCount()} components, and a core with no dependencies.`;

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

const CDN = `<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Djirasak/tsunami-framework@v${version()}/dist/tsunami.min.css">
<script src="https://cdn.jsdelivr.net/gh/Djirasak/tsunami-framework@v${version()}/dist/tsunami.min.js"></script>`;

const NPM = `npm install @djirasak/tsunami-ui

import "@djirasak/tsunami-ui/css";
import "@djirasak/tsunami-ui";`;

const EXAMPLE = `<article class="card">
  <section>
    <p>Ready to ship?</p>
    <button class="btn" data-variant="primary">Deploy</button>
  </section>
</article>`;

const comparisons = [
  {
    name: "Pico",
    text: "Pico styles plain HTML with almost no classes, which suits a document or a small form. Tsunami keeps that idea and goes further into app UI: tables, dialogs, a command palette, a date picker, tabs.",
    when: "you are building a content site or a few forms and want the least CSS.",
  },
  {
    name: "Bootstrap",
    text: "Bootstrap is the widely known choice, with a large ecosystem and themes. Its variants are class names like btn-primary, and its modal, dropdown and tooltip run on its JavaScript. Tsunami picks a variant with one attribute and uses native dialog and popover.",
    when: "you want the ecosystem, ready-made themes or a team that already knows it.",
  },
  {
    name: "Tailwind",
    text: "Tailwind gives you utility classes and no components, so you design every button yourself. Tsunami gives you finished components and you restyle them with CSS variables. They mix: your utilities win, because Tsunami's rules have zero specificity.",
    when: "you have a designer and a bespoke design system to build.",
  },
];

const channels = [
  ["Online store", 62],
  ["Marketplace", 24],
  ["Social", 14],
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
  const sizes = bundleSizes();
  return (
    <>
      <LandingScript />
      <section className="landing-stage">
        <canvas className="landing-sea" aria-hidden="true"></canvas>
        <span className="landing-kanji" aria-hidden="true">
          津波
        </span>

        <header className="landing-header" role="banner">
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

        <section className="landing-hero" aria-label="Introduction">
          <span className="badge landing-rise" style={{ "--i": 0 }}>
            {componentCount()} components
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
        </section>
      </section>

      <main className="landing">
        <div className="landing-device" aria-hidden="true" inert>
          <div className="landing-device-bar">
            <i></i>
            <i></i>
            <i></i>
            <span>Harbor &amp; Mill / Sales</span>
          </div>
          <div className="landing-device-body">
            <div className="landing-device-main">
              <dl className="stat">
                <div>
                  <dt>Today</dt>
                  <dd>$4,280</dd>
                  <dd data-variant="ok">+8.2% vs yesterday</dd>
                </div>
                <div>
                  <dt>Orders</dt>
                  <dd>64</dd>
                  <dd>+5 since noon</dd>
                </div>
                <div>
                  <dt>Conversion</dt>
                  <dd>3.4%</dd>
                  <dd data-variant="danger">-0.3 pt</dd>
                </div>
              </dl>
              <div className="item-group">
                <article className="item">
                  <figure>
                    <i className="icon icon-shirt" aria-hidden="true"></i>
                  </figure>
                  <section>
                    <h3>Linen shirt</h3>
                    <p>212 sold this week</p>
                  </section>
                  <aside>
                    <span className="badge" data-variant="ok">
                      In stock
                    </span>
                  </aside>
                </article>
                <article className="item">
                  <figure>
                    <i className="icon icon-shopping-bag" aria-hidden="true"></i>
                  </figure>
                  <section>
                    <h3>Canvas tote</h3>
                    <p>148 sold this week</p>
                  </section>
                  <aside>
                    <span className="badge" data-variant="ok">
                      In stock
                    </span>
                  </aside>
                </article>
                <article className="item">
                  <figure>
                    <i className="icon icon-coffee" aria-hidden="true"></i>
                  </figure>
                  <section>
                    <h3>Ceramic mug</h3>
                    <p>97 sold this week</p>
                  </section>
                  <aside>
                    <span className="badge" data-variant="warning">
                      3 left
                    </span>
                  </aside>
                </article>
              </div>
            </div>
            <div className="landing-device-side">
              <h3>Sales by channel</h3>
              {channels.map(([name, pct]) => (
                <div className="landing-channel" key={name}>
                  <span>
                    {name} <strong>{pct}%</strong>
                  </span>
                  <div
                    className="progress"
                    data-size="sm"
                    role="progressbar"
                    aria-label={name}
                    aria-valuenow={pct}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                    <span style={{ width: `${pct}%` }}></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="landing-device-note alert" data-variant="ok">
            <i className="icon icon-circle-check" aria-hidden="true"></i>
            <strong>New order #1043</strong>
            <p>$74.00 from Chiang Mai</p>
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

        <section className="landing-block" aria-labelledby="numbers">
          <h2 id="numbers">Light, and it shows</h2>
          <dl className="stat">
            <div>
              <dt>JavaScript, gzip</dt>
              <dd>{sizes.js}</dd>
              <dd>every component</dd>
            </div>
            <div>
              <dt>CSS, gzip</dt>
              <dd>{sizes.css}</dd>
              <dd>every component</dd>
            </div>
            <div>
              <dt>Dependencies</dt>
              <dd>0</dd>
              <dd>in the core</dd>
            </div>
            <div>
              <dt>Licence</dt>
              <dd>MIT</dd>
              <dd>free to use</dd>
            </div>
          </dl>
        </section>

        <section className="landing-block" aria-labelledby="start">
          <h2 id="start">Get started</h2>
          <p className="landing-lead-muted">
            Two tags from a CDN, and no build step. Put the script in{" "}
            <code>&lt;head&gt;</code> as a plain script so the saved theme
            applies before the first paint.
          </p>
          <div className="code-block">
            <pre suppressHydrationWarning>
              <code id="landing-cdn" dangerouslySetInnerHTML={{ __html: highlightHtml(CDN) }} />
            </pre>
            <button
              type="button"
              className="btn"
              data-variant="ghost"
              data-size="icon-sm"
              data-copy-target="#landing-cdn"
              aria-label="Copy the code"
              suppressHydrationWarning
            >
              <i className="icon icon-copy" data-idle="" aria-hidden="true"></i>
              <i className="icon icon-check" data-done="" aria-hidden="true"></i>
            </button>
          </div>
          <p className="landing-lead-muted">
            Or from npm, for an app with a bundler:
          </p>
          <div className="code-block">
            <pre suppressHydrationWarning>
              <code id="landing-npm">{NPM}</code>
            </pre>
            <button
              type="button"
              className="btn"
              data-variant="ghost"
              data-size="icon-sm"
              data-copy-target="#landing-npm"
              aria-label="Copy the code"
              suppressHydrationWarning
            >
              <i className="icon icon-copy" data-idle="" aria-hidden="true"></i>
              <i className="icon icon-check" data-done="" aria-hidden="true"></i>
            </button>
          </div>
          <p className="landing-lead-muted">Then write HTML:</p>
          <div className="landing-example">
            <div className="code-block">
              <pre suppressHydrationWarning>
                <code id="landing-html" dangerouslySetInnerHTML={{ __html: highlightHtml(EXAMPLE) }} />
              </pre>
              <button
                type="button"
                className="btn"
                data-variant="ghost"
                data-size="icon-sm"
                data-copy-target="#landing-html"
                aria-label="Copy the code"
                suppressHydrationWarning
              >
                <i className="icon icon-copy" data-idle="" aria-hidden="true"></i>
                <i className="icon icon-check" data-done="" aria-hidden="true"></i>
              </button>
            </div>
            <article className="card">
              <section>
                <p>Ready to ship?</p>
                <button type="button" className="btn" data-variant="primary">
                  Deploy
                </button>
              </section>
            </article>
          </div>
        </section>

        <section className="landing-block" aria-labelledby="why">
          <h2 id="why">Why not Pico, Bootstrap or Tailwind?</h2>
          <p className="landing-lead-muted">
            They are good tools. Here is where Tsunami sits next to each, and
            when to pick them instead.
          </p>
          <div className="landing-grid landing-grid-3">
            {comparisons.map((c) => (
              <article className="card" key={c.name}>
                <section>
                  <h3>{c.name}</h3>
                  <p>{c.text}</p>
                  <p>
                    <strong>Pick {c.name} when</strong> {c.when}
                  </p>
                </section>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-block" aria-labelledby="trust">
          <h2 id="trust">Accessibility and browsers</h2>
          <div className="landing-grid landing-grid-2">
            <article className="card">
              <section>
                <h3>Accessibility</h3>
                <p>
                  Built on native elements (<code>dialog</code>,{" "}
                  <code>popover</code>, <code>details</code>,{" "}
                  <code>button</code>, <code>input</code>), which bring
                  keyboard and focus behaviour with them. The interactive
                  components add ARIA and arrow-key support on top, and motion
                  stops when the reader asks for less of it.
                </p>
                <p>
                  Every docs page is scanned with axe-core in light and dark
                  with no serious or critical issues, text colours meet WCAG AA
                  contrast, and a browser test suite covers keyboard use. It has
                  not yet been tested by people who use screen readers.
                </p>
              </section>
            </article>
            <article className="card">
              <section>
                <h3>Browser support</h3>
                <p>
                  Current evergreen browsers: Chrome and Edge 135, Firefox 144,
                  Safari 26.2 or later. Cascade layers, <code>:where()</code>,{" "}
                  <code>:has()</code>, <code>popover</code> and{" "}
                  <code>dialog</code> are all there; the newest piece,{" "}
                  <code>commandfor</code>, sets that floor.
                </p>
                <p>
                  Click outside to close a dialog (<code>closedby</code>) works
                  in Chrome and Firefox. Safari does not have it yet, so a
                  dialog there closes with Esc or its Close button.
                </p>
              </section>
            </article>
          </div>
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
        <span>
          <a className="link" data-variant="muted" href={`${REPO}/blob/main/LICENSE`}>
            MIT License
          </a>
          {" · "}
          <a className="link" data-variant="muted" href={REPO}>
            github.com/Djirasak/tsunami-framework
          </a>
        </span>
      </footer>
    </>
  );
}
