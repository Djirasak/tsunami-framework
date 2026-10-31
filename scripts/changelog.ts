// CHANGELOG.md helpers for scripts/release.ts.
// stamp() turns the "## [Unreleased]" section into "## [X.Y.Z] - date", opens a
// fresh empty Unreleased above it and moves the compare links at the foot.
export const HEADING = "## [Unreleased]";

// The text between the Unreleased heading and the next "## " heading.
export function unreleased(text: string): string {
  const start = text.indexOf(HEADING);
  if (start < 0) return "";
  const rest = text.slice(start + HEADING.length);
  const end = rest.search(/^## /m);
  return (end < 0 ? rest : rest.slice(0, end)).trim();
}

export function stamp(
  text: string,
  version: string,
  last: string,
  repo: string,
  date: string,
): string {
  if (!text.includes(HEADING)) throw new Error(`CHANGELOG.md has no "${HEADING}" heading`);
  const url = `https://github.com/${repo}`;
  let out = text.replace(HEADING, `${HEADING}\n\n## [${version}] - ${date}`);
  // [Unreleased] now compares from the new tag; the new version compares from the last one.
  const unreleasedLink = `[Unreleased]: ${url}/compare/v${version}...HEAD`;
  const versionLink = last
    ? `[${version}]: ${url}/compare/${last}...v${version}`
    : `[${version}]: ${url}/releases/tag/v${version}`;
  if (/^\[Unreleased\]: .*$/m.test(out))
    out = out.replace(/^\[Unreleased\]: .*$/m, `${unreleasedLink}\n${versionLink}`);
  else out = `${out.trimEnd()}\n\n${unreleasedLink}\n${versionLink}\n`;
  return out;
}
