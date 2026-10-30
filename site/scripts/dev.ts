// Docs dev server: builds the framework into public/dist, starts `next dev`,
// and rebuilds public/dist whenever a file in ../src changes, so a fix in a
// component shows up in the docs and the examples after a page refresh.
// `--sync-only` skips Next (for testing the watcher).
import { watch } from "node:fs";
import { resolve } from "node:path";

const site = resolve(import.meta.dir, "..");
const root = resolve(site, "..");
const syncOnly = process.argv.includes("--sync-only");

const sync = (quiet: boolean) =>
  Bun.spawn(["bun", "scripts/sync.ts", "--build"], {
    cwd: site,
    stdout: quiet ? "ignore" : "inherit",
    stderr: "inherit",
  }).exited;

if ((await sync(false)) !== 0) process.exit(1);

const next = syncOnly
  ? null
  : Bun.spawn([`${site}/node_modules/.bin/next`, "dev", "--port", "5477"], {
      cwd: site,
      stdio: ["inherit", "inherit", "inherit"],
    });

let timer: ReturnType<typeof setTimeout> | undefined;
let running = false;
let again = false;
async function rebuild() {
  if (running) return void (again = true);
  running = true;
  const t = performance.now();
  const code = await sync(true);
  const s = ((performance.now() - t) / 1000).toFixed(1);
  console.log(
    code === 0
      ? `[dist] rebuilt in ${s}s: refresh the page`
      : `[dist] the build failed (see above)`,
  );
  running = false;
  if (again) {
    again = false;
    rebuild();
  }
}

watch(`${root}/src`, { recursive: true }, () => {
  clearTimeout(timer);
  timer = setTimeout(rebuild, 300);
});

const stop = () => {
  next?.kill();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
await (next?.exited ?? new Promise(() => {}));
