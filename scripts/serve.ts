// Static server on 0.0.0.0 (this machine and the local network), serves /docs /dist /fonts /flags.
// Live reload: a change in src/ rebuilds the minified CSS or JS the docs load,
// a change in docs/ needs no build; then every open page reloads (an
// EventSource on /__reload, added to each HTML page). Press r to rebuild and
// reload by hand.
import { $ } from "bun";
import { watch } from "node:fs";
import { networkInterfaces } from "node:os";
import { resolve, sep } from "node:path";

const root = resolve(import.meta.dir, "..");
const allowed = new Set(["docs", "dist", "fonts", "flags"]);
const notFound = () => new Response("Not found", { status: 404 });

const clients = new Set<ReadableStreamDefaultController>();
const RELOAD = `<script>new EventSource("/__reload").onmessage = () => location.reload();</script>`;

const server = Bun.serve({
  hostname: "0.0.0.0",
  port: Number(Bun.env.PORT ?? 5477),
  async fetch(req) {
    let path: string;
    try {
      path = decodeURIComponent(new URL(req.url).pathname);
    } catch {
      return new Response("Bad request", { status: 400 });
    }
    if (path === "/__reload") {
      let self: ReadableStreamDefaultController;
      const stream = new ReadableStream({
        start(controller) {
          self = controller;
          clients.add(controller);
        },
        cancel() {
          clients.delete(self);
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    }
    if (path === "/")
      return Response.redirect(new URL("/docs/", req.url).href, 302);
    if (path.includes("\0")) return notFound();
    // Clean URLs: /docs/btn serves docs/btn.html; the .html form redirects.
    if (path === "/docs")
      return Response.redirect(new URL("/docs/", req.url).href, 301);
    if (path.endsWith(".html")) {
      const clean = path.replace(/(?:index)?\.html$/, "");
      return Response.redirect(new URL(clean, req.url).href, 301);
    }
    if (path.endsWith("/")) path += "index.html";
    else if (!path.split("/").pop()!.includes(".")) path += ".html";

    const file = resolve(root, "." + path);
    if (!file.startsWith(root + sep)) return notFound();
    if (!allowed.has(file.slice(root.length + 1).split(sep)[0]))
      return notFound();

    const f = Bun.file(file);
    if (!(await f.exists())) return notFound();
    // no-cache: the browser always revalidates, so a rebuilt dist/ shows at once.
    const headers = { "Cache-Control": "no-cache" };
    if (!file.endsWith(".html")) return new Response(f, { headers });
    const html = (await f.text()).replace("</body>", `${RELOAD}</body>`);
    return new Response(html, {
      headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
    });
  },
  // The reload streams stay open while the page is.
  idleTimeout: 0,
});

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: number) => (text: string) =>
  color ? `\x1b[${code}m${text}\x1b[0m` : text;
const [bold, dim, red, green, cyan] = [1, 2, 31, 32, 36].map(paint);

const lan = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i?.family === "IPv4" && !i.internal)
  .map((i) => i!.address);
const link = (host: string) => cyan(`http://${host}:${server.port}/docs/`);

console.log(`  ${green("➜")}  ${bold("Local")}    ${link("localhost")}`);
for (const address of lan)
  console.log(`  ${green("➜")}  ${bold("Network")}  ${link(address)}`);
console.log(
  `\n     ${dim("Edits in src/ and docs/ reload the page. Press r to rebuild, Ctrl+C to stop")}\n`,
);

// Live reload.
const encoder = new TextEncoder();
function reload() {
  for (const client of clients) {
    try {
      client.enqueue(encoder.encode("data: reload\n\n"));
    } catch {
      clients.delete(client);
    }
  }
}

const time = () => new Date().toLocaleTimeString("en-GB");
let pending = new Set<string>();
let timer: Timer | undefined;
let building = Promise.resolve();

function changed(kind: string) {
  pending.add(kind);
  clearTimeout(timer);
  timer = setTimeout(() => {
    const kinds = pending;
    pending = new Set();
    building = building.then(() => rebuild(kinds));
  }, 120);
}

async function rebuild(kinds: Set<string>) {
  const start = performance.now();
  try {
    if (kinds.has("css"))
      await $`${root}/node_modules/.bin/sass --style=compressed --no-source-map src/index.scss dist/tsunami.min.css`.quiet();
    if (kinds.has("js"))
      await $`bun build src/js/index.js --minify --outfile dist/tsunami.min.js`.quiet();
    if (kinds.has("css") || kinds.has("js"))
      await $`bun scripts/stamp-version.ts`.quiet();
  } catch (error) {
    console.log(`  ${red("✗")}  ${dim(time())}  build failed`);
    console.error(String(error.stderr ?? error));
    return;
  }
  const what = [...kinds].join(", ");
  const ms = (performance.now() - start).toFixed(0);
  console.log(`  ${cyan("↻")}  ${dim(time())}  ${what}  ${dim(`${ms} ms`)}`);
  reload();
}

watch(`${root}/src`, { recursive: true }, (_, name) => {
  if (name?.endsWith(".scss")) changed("css");
  else if (name?.endsWith(".js")) changed("js");
});
watch(`${root}/docs`, { recursive: true }, () => changed("docs"));

// r rebuilds and reloads; Ctrl+C stops (raw mode turns the signal off).
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.on("data", (key) => {
    const k = key.toString();
    if (k === "\x03") process.exit(0);
    if (k === "r") (changed("css"), changed("js"));
  });
}
