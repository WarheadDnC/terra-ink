/** DOM boundary for the standalone app and the WordPress shadow root. */
let surface: HTMLElement | null = null;

export function setEmbeddedSurface(element: HTMLElement) { surface = element; }
export function getPortalContainer(): HTMLElement { return surface ?? document.body; }
export function getScrollRoots(): HTMLElement[] {
  return surface ? [surface] : [document.body, document.documentElement];
}
