"use client";
import { useEffect } from "react";

// landing.js draws the sea on the canvas. It starts after React has
// hydrated, so it never meets a tree it would change under React's feet.
export default function LandingScript() {
  useEffect(() => {
    if (document.getElementById("landing-script")) return;
    const script = document.createElement("script");
    script.id = "landing-script";
    script.src = "/landing.js";
    document.body.append(script);
  }, []);
  return null;
}
