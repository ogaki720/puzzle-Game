/**
 * Skia web guard utilities.
 *
 * NOTE: We no longer use Skia on web — board-canvas.web.tsx handles web
 * rendering with plain RN Views. This file is kept for native-side utilities
 * and the isSkiaReady() export used in board-canvas.tsx (native only).
 */

export function isSkiaReady(): boolean {
  if (typeof window === "undefined") return true; // native — Skia always available
  // @ts-expect-error — CanvasKit is set on globalThis by LoadSkiaWeb
  return typeof globalThis.CanvasKit !== "undefined";
}
