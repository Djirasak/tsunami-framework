// Types for window.tsunami and the tsunami:* events. Each part below adds its
// modules to the Tsunami interface and its events to TsunamiEventMap.
/// <reference path="./parts/a.d.ts" />
/// <reference path="./parts/b.d.ts" />
/// <reference path="./parts/c.d.ts" />

interface Window {
  tsunami: Tsunami;
}

// The tsunami:* custom events, so addEventListener("tsunami:toastclose", e => e.detail.reason) is typed.
interface HTMLElementEventMap extends TsunamiEventMap {}
interface DocumentEventMap extends TsunamiEventMap {}

// import "@djirasak/tsunami-ui/css" is a side-effect import of a stylesheet: without this
// TypeScript 6 and 7 report TS2882 for it.
declare module "@djirasak/tsunami-ui/css";
