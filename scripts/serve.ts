// Local static server: 127.0.0.1 only, serves /demo /dist /fonts.
import { resolve, sep } from "node:path";

const root = resolve(import.meta.dir, "..");
const allowed = new Set(["demo", "dist", "fonts"]);
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
      return Response.redirect(new URL("/demo/", req.url).href, 302);
    if (path.includes("\0")) return notFound();
    if (path.endsWith("/")) path += "index.html";

    const file = resolve(root, "." + path);
    if (!file.startsWith(root + sep)) return notFound();
    if (!allowed.has(file.slice(root.length + 1).split(sep)[0]))
      return notFound();

    const f = Bun.file(file);
    return (await f.exists()) ? new Response(f) : notFound();
  },
});

console.log(`tsunami: ${server.url}`);
