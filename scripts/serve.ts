// Static server on 0.0.0.0 (this machine and the local network), serves /docs /dist /fonts /flags.
import { networkInterfaces } from "node:os";
import { resolve, sep } from "node:path";

const root = resolve(import.meta.dir, "..");
const allowed = new Set(["docs", "dist", "fonts", "flags"]);
const notFound = () => new Response("Not found", { status: 404 });

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
    // no-cache: the browser always revalidates, so a rebuilt dist/ shows at once.
    return (await f.exists())
      ? new Response(f, { headers: { "Cache-Control": "no-cache" } })
      : notFound();
  },
});

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: number) => (text: string) =>
  color ? `\x1b[${code}m${text}\x1b[0m` : text;
const [bold, dim, green, cyan] = [1, 2, 32, 36].map(paint);

const lan = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i?.family === "IPv4" && !i.internal)
  .map((i) => i!.address);
const link = (host: string) => cyan(`http://${host}:${server.port}/docs/`);

console.log(`  ${green("➜")}  ${bold("Local")}    ${link("localhost")}`);
for (const address of lan)
  console.log(`  ${green("➜")}  ${bold("Network")}  ${link(address)}`);
console.log(`\n     ${dim("Press Ctrl+C to stop")}\n`);
