import { html, pages } from "../../../_lib/content";

export const metadata = { title: `${pages["workspace-full"].title} | Tsunami` };

// A full-page example without the docs chrome: the content is the whole body.
export default function Page() {
  return (
    <div
      style={{ display: "contents" }}
      dangerouslySetInnerHTML={{ __html: html("workspace-full") }}
    />
  );
}
