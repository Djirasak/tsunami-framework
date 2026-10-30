// Copy vendor/tinymce to dist/tinymce so dist/ is self-contained.
import { cpSync, rmSync } from "node:fs";

const root = new URL("..", import.meta.url).pathname;
rmSync(`${root}dist/tinymce`, { recursive: true, force: true });
cpSync(`${root}vendor/tinymce`, `${root}dist/tinymce`, { recursive: true });
