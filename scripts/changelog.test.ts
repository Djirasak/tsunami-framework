import { describe, expect, test } from "bun:test";
import { stamp, unreleased } from "./changelog";

const sample = `# Changelog

## [Unreleased]

### Added

- A new thing.

## [1.0.0] - 2026-01-01

### Added

- First.

[Unreleased]: https://github.com/o/r/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/o/r/releases/tag/v1.0.0
`;

describe("unreleased", () => {
  test("returns the text under the heading, not the older versions", () => {
    expect(unreleased(sample)).toBe("### Added\n\n- A new thing.");
  });
  test("is empty when the section has no text", () => {
    expect(unreleased("## [Unreleased]\n\n## [1.0.0] - 2026-01-01\n- x")).toBe("");
  });
  test("is empty when there is no heading", () => {
    expect(unreleased("# Changelog")).toBe("");
  });
});

describe("stamp", () => {
  const out = stamp(sample, "1.1.0", "v1.0.0", "o/r", "2026-02-02");
  test("names the new version and keeps an empty Unreleased above it", () => {
    expect(out).toContain("## [Unreleased]\n\n## [1.1.0] - 2026-02-02\n\n### Added");
    expect(unreleased(out)).toBe("");
  });
  test("moves the compare links", () => {
    expect(out).toContain("[Unreleased]: https://github.com/o/r/compare/v1.1.0...HEAD");
    expect(out).toContain("[1.1.0]: https://github.com/o/r/compare/v1.0.0...v1.1.0");
    expect(out).toContain("[1.0.0]: https://github.com/o/r/releases/tag/v1.0.0");
  });
  test("links the first release to its tag when there is no earlier one", () => {
    const first = stamp("## [Unreleased]\n\n- x\n", "0.1.0", "", "o/r", "2026-01-01");
    expect(first).toContain("[0.1.0]: https://github.com/o/r/releases/tag/v0.1.0");
  });
  test("refuses a file without the Unreleased heading", () => {
    expect(() => stamp("# Changelog", "1.0.0", "", "o/r", "2026-01-01")).toThrow();
  });
});
