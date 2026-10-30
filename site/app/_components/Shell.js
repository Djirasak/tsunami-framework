import { html, nav, pages } from "../_lib/content";
import { jsonLdText } from "../_lib/jsonld";

// Links are full page loads, so the sidebar would start from the top on every
// page. This keeps its scroll position between pages and makes sure the
// current page is in view. It runs right after the sidebar, before first paint.
const KEEP_SCROLL = `(() => {
  const nav = document.getElementById("docs-nav");
  const key = "docs-nav-scroll";
  try { nav.scrollTop = Number(sessionStorage.getItem(key)) || 0; } catch {}
  nav.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest" });
  nav.addEventListener("scroll", () => {
    try { sessionStorage.setItem(key, nav.scrollTop); } catch {}
  }, { passive: true });
})();`;

const id = (title) => `nav-${title.toLowerCase().replace(/\W+/g, "-")}`;

// The docs chrome: sidebar built from content/nav.json, top bar with the
// theme switcher, and the page content as the inner HTML of <main>.
export default function Shell({ slug }) {
  const href = slug === "index" ? "/docs" : `/docs/${slug}`;
  return (
    <div className="docs">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdText(slug) }}
      />
      <aside className="sidebar" id="docs-nav" popover="">
        <a className="docs-brand" href="/docs">
          <svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true">
            <rect x="1" y="1" width="30" height="30" rx="7" />
            <path d="M5.5 21c3 0 5-2 6.5-5.2C14 11 17.2 7 22 7c3 0 4.8 2.2 4.8 4.5 0 2-1.6 3.5-3.5 3.5-1.8 0-3-1.3-3-2.9" />
            <path d="M5.5 26c2.2-2.2 4.4-2.2 6.6 0s4.4 2.2 6.6 0 4.4-2.2 6.6 0" />
          </svg>
          Tsunami <span>津波</span>
        </a>
        <button
          type="button"
          className="btn docs-search"
          commandfor="docs-palette"
          command="show-modal"
        >
          <i className="icon icon-search" aria-hidden="true"></i>
          <span>Search</span>
          <kbd>Ctrl K</kbd>
        </button>
        <nav aria-label="Docs">
          <section>
            {nav.map((group) => (
              <div
                role="group"
                key={group.title ?? "start"}
                aria-labelledby={group.title ? id(group.title) : undefined}
              >
                {group.title && <h3 id={id(group.title)}>{group.title}</h3>}
                <ul>
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        data-label={item.label}
                        data-keywords={item.keywords}
                        aria-current={item.href === href ? "page" : undefined}
                      >
                        <i
                          className={`icon icon-${item.icon}`}
                          aria-hidden="true"
                        ></i>
                        <span>{item.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </nav>
      </aside>
      <script dangerouslySetInnerHTML={{ __html: KEEP_SCROLL }} />
      <div className="docs-body">
        <header className="docs-top">
          <button
            type="button"
            className="btn sidebar-toggle"
            data-variant="ghost"
            data-size="icon"
            popoverTarget="docs-nav"
            aria-label="Open menu"
          >
            <i className="icon icon-menu" aria-hidden="true"></i>
          </button>
          <span>{pages[slug].title}</span>
          <div className="theme-switcher" role="group" aria-label="Theme">
            {[
              ["light", "Light", "sun"],
              ["dark", "Dark", "moon"],
              ["system", "System", "monitor"],
            ].map(([value, label, icon]) => (
              <button
                type="button"
                key={value}
                data-theme-toggle={value}
                suppressHydrationWarning /* tsunami sets aria-pressed first */
                aria-label={label}
              >
                <i className={`icon icon-${icon}`} aria-hidden="true"></i>
              </button>
            ))}
          </div>
        </header>
        {/* tsunami.js upgrades this markup before React hydrates it. */}
        <main
          className="docs-main"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: html(slug) }}
        />
      </div>
    </div>
  );
}
