"use client";
import { useEffect } from "react";

// docs.js adds the search palette to <body> and decorates the code blocks.
// It starts after React has hydrated, so it never meets a tree it would
// change under React's feet.
export default function DocsScript() {
  useEffect(() => {
    if (document.getElementById("docs-palette")) return;
    const script = document.createElement("script");
    script.type = "module";
    script.src = "/docs/docs.js";
    document.body.append(script);
  }, []);
  return null;
}
