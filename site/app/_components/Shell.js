import { html, nav, pages } from "../_lib/content";

const id = (title) => `nav-${title.toLowerCase().replace(/\W+/g, "-")}`;

// The docs chrome: sidebar built from content/nav.json, top bar with the
// theme switcher, and the page content as the inner HTML of <main>.
export default function Shell({ slug }) {
  const href = slug === "index" ? "/docs" : `/docs/${slug}`;
  return (
    <div className="docs">
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
          commandFor="docs-palette"
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
                aria-label={label}
              >
                <i className={`icon icon-${icon}`} aria-hidden="true"></i>
              </button>
            ))}
          </div>
        </header>
        <main
          className="docs-main"
          dangerouslySetInnerHTML={{ __html: html(slug) }}
        />
      </div>
    </div>
  );
}
