import { html } from "../../../_lib/content";
import { pageMetadata } from "../../../_lib/seo";

export const metadata = pageMetadata("workspace-full");

// A full-page example without the docs chrome: the content is the whole body.
export default function Page() {
  return (
    <div
      style={{ display: "contents" }}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html("workspace-full") }}
    />
  );
}
