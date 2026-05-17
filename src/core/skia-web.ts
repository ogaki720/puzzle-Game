/**
 * Start loading Skia CanvasKit WASM as early as possible (module-eval time).
 * Import this module at the top of _layout.web.tsx so the promise fires
 * before any React component mounts.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { LoadSkiaWeb } = require("@shopify/react-native-skia/lib/module/web") as {
  LoadSkiaWeb: (opts?: { locateFile?: (file: string) => string }) => Promise<void>;
};

// Kick off loading at module-eval time (before React mounts)
export const skiaReadyPromise: Promise<void> =
  typeof window !== "undefined"
    ? LoadSkiaWeb({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.40.0/bin/full/${file}`,
      }).catch(() => {
        // Fallback: try bundled path
        return LoadSkiaWeb();
      })
    : Promise.resolve();

export function isSkiaReady(): boolean {
  if (typeof window === "undefined") return false;
  // @ts-expect-error — CanvasKit is set on globalThis by LoadSkiaWeb
  return typeof globalThis.CanvasKit !== "undefined";
}
