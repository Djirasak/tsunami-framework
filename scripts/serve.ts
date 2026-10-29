// Local static server: 127.0.0.1 only, serves /docs /dist /fonts.
import { resolve, sep } from "node:path";

const root = resolve(import.meta.dir, "..");
const allowed = new Set(["docs", "dist", "fonts"]);
const notFound = () => new Response("Not found", { status: 404 });

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: Number(Bun.env.PORT ?? 5477),
  async fetch(req) {
    let path: string;
    try {
      path = decodeURIComponent(new URL(req.url).pathname);
    } catch {
      return new Response("Bad request", { status: 400 });
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
    return (await f.exists()) ? new Response(f) : notFound();
  },
});

console.log(`tsunami: ${server.url}`);
