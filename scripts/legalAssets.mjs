import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const documents = ["LICENSE", "LICENSE-OLD", "TRADEMARK.md", "COPYING"];
const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

// Emit the same notices alongside both app builds. URLs are relative to this
// page, so WordPress subdirectories and custom plugin locations work as well.
export function legalAssets({ wordpress = false } = {}) {
  return {
    name: "posteroom-license-notices",
    generateBundle() {
      for (const name of documents) {
        this.emitFile({ type: "asset", fileName: `legal/${name}.txt`, source: fs.readFileSync(path.join(root, name)) });
      }
      const originalNotice = escapeHtml(fs.readFileSync(path.join(root, "LICENSE"), "utf8"));
      const sourceUrl = wordpress
        ? "../../source/terra-ink-source.zip"
        : "https://github.com/WarheadDnC/terra-ink/tree/feat/terra-ink-branding";
      this.emitFile({ type: "asset", fileName: "legal/index.html", source: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Software licenses and credits — Posteroom</title>
  <style>
    body { margin: 0; background: #fff; color: #17212b; font: 16px/1.6 system-ui, sans-serif; }
    main { max-width: 760px; margin: auto; padding: 32px 20px; }
    h1, h2 { line-height: 1.25; }
    h2 { margin-top: 32px; }
    a { color: #075c99; text-underline-offset: 3px; overflow-wrap: anywhere; }
    a:focus-visible { outline: 3px solid #075c99; outline-offset: 3px; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; font: 14px/1.6 monospace; padding: 16px; background: #f0f4f7; }
  </style>
</head>
<body><main>
  <h1>Software licenses and credits</h1>
  <p>Adapted and integrated by Reckoning Web for Posteroom.</p>
  <p>Based on <a href="https://github.com/rw3-io/terraink">Terraink source code</a>.
  Original software copyright © 2026 Yousuf Amanuel. This is an independent adaptation,
  with no affiliation with or endorsement by the original project.</p>
  <p>Posteroom modifications began on 2026-09-02 and include branding, the A3/A4 interface,
  WordPress integration and the WooCommerce artwork workflow.</p>
  <h2>Your rights and source code</h2>
  <p>This software is provided under the GNU Affero General Public License, version 3,
  subject to the retained upstream notices below. You may redistribute and modify it
  under those terms. It is provided without any warranty, including the implied
  warranties of merchantability and fitness for a particular purpose.</p>
  <p><a href="${sourceUrl}">Get the corresponding source code</a> at no charge,
  including the Posteroom modifications and build instructions.</p>
  <ul>
    <li><a href="COPYING.txt">Full GNU AGPL version 3 license text</a></li>
    <li><a href="LICENSE.txt">Original copyright, license notice and additional terms</a></li>
    <li><a href="LICENSE-OLD.txt">Historical upstream license notice</a></li>
    <li><a href="TRADEMARK.md.txt">Terraink trademark policy</a></li>
  </ul>
  <h2>Original software notice</h2>
  <pre>${originalNotice}</pre>
  <h2>Map credits</h2>
  <p>Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, ODbL.
  Tiles/schema: <a href="https://openmaptiles.org/">OpenMapTiles</a>.
  Map services and rendering: <a href="https://openfreemap.org/">OpenFreeMap</a>,
  <a href="https://nominatim.openstreetmap.org/">Nominatim</a> and
  <a href="https://maplibre.org/">MapLibre</a>.</p>
</main></body>
</html>` });
    },
  };
}
