import React from "react";
import ReactDOM from "react-dom/client";
import appCss from "./styles/index.css?inline";
import mapCss from "maplibre-gl/dist/maplibre-gl.css?inline";
import embeddedCss from "./styles/wordpress.css?inline";
import { scopeEmbeddedCss } from "@/shared/utils/embeddedStyles";
import { setEmbeddedSurface } from "@/core/embedding";
import { createWooCommerceCart } from "@/features/cart/infrastructure/woocommerceCart";

// Separate entry: never installs a service worker or changes the shop's body.
async function mount() {
  const host = document.querySelector<HTMLElement>("[data-posteroom-designer]");
  if (!host || host.shadowRoot) return;
  const endpoint = host.dataset.endpoint;
  const assetBase = host.dataset.assets;
  if (!endpoint || !assetBase) return;
  window.posteroomRuntime = { assetBase, sourceUrl: host.dataset.source };
  window.terraInkCart = createWooCommerceCart(endpoint);
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  // Global styles stay inside this shadow root. Map viewport units refer to
  // the designer's allocated height, not the whole WordPress page.
  style.textContent = scopeEmbeddedCss(mapCss + "\n" + appCss) + embeddedCss;
  const surface = document.createElement("div");
  surface.className = "posteroom-surface";
  surface.dataset.displayMode = "browser";
  const root = document.createElement("div");
  root.id = "root";
  surface.append(root);
  shadow.append(style, surface);
  setEmbeddedSurface(surface);
  // Import after runtime configuration: marker URLs are built at module load.
  const { default: App } = await import("./App");
  ReactDOM.createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
}

void mount().catch(() => {
  const host = document.querySelector<HTMLElement>("[data-posteroom-designer]");
  if (host) {
    const target = host.shadowRoot ?? host;
    target.textContent = "The map designer could not load. Please refresh this page.";
  }
});
