# Terra Ink by Posteroom

A custom map poster designer for Posteroom, based on the [Terraink source code](https://github.com/rw3-io/terraink).

This is an independent downstream fork. It is not affiliated with or endorsed by the original Terraink project.

## Current stage

This first Posteroom adaptation changes application branding, icons, metadata and source-code links, and removes upstream donation prompts. Location search, map styling and markers are retained. The customer-facing download action and format picker have been replaced with **Add to cart** on desktop and mobile.

Poster sizes are restricted to A3 and A4, each in portrait and landscape orientation, with A4 portrait selected by default. The custom width/height editor and all other size presets have been removed.

The cart action prepares a full-resolution PNG and submits it through the included WordPress/WooCommerce plugin. The standalone preview keeps ordering unavailable. The WordPress build mounts in an isolated shadow root, resolves plugin-relative assets and never installs a service worker. See [WordPress installation](wordpress/posteroom-map-designer/README.md) and [Cart integration](docs/CART_INTEGRATION.md).

The plugin uses the existing shop's A3/A4 variation mapping (4249/4250), with editable settings and ordering disabled until configured. Prices and availability come from WooCommerce. Map artwork uses separate metadata from the existing AI generator, protected print storage, cart previews and order downloads.

The inactive Settings buttons and their unused styles are removed from desktop and mobile navigation. The install banner and automatic browser install prompt are disabled. The footer reads “Adapted and integrated by Reckoning Web for Posteroom” and explicitly credits Terraink, with AGPL-3.0 and Source code links. Original software credits remain in About and the license files.

## Develop and build

```bash
bun install --frozen-lockfile
bun run dev
bun run build
bun run build:wordpress
bun run typecheck
```

Optional settings are documented in [`.env.example`](.env.example). Leave contact and social settings empty until the Posteroom destinations are confirmed. The source link defaults to this fork; set `VITE_REPO_URL` to the corresponding source of the deployed version.

Development metadata uses `noindex, nofollow`, and the upstream sitemap and canonical URLs have been removed. Configure production indexing, canonical URLs and sharing metadata as part of deployment.

## Changes in this fork

Posteroom modifications began on 2026-09-02. The current version is `0.4.2-posteroom.9` (WordPress plugin `0.1.1`), clarifying adaptation credits and adding the complete AGPL text and working license links after the WooCommerce artwork integration. Git history records the modified files and dates.

The desktop/mobile header and startup location screen use the owner-supplied `public/assets/posteroom-logo.png`, preserved unchanged with its white background. The startup screen displays POSTEROOM beneath the logo. The TI monogram and generated application icons from the initial adaptation remain in the other application assets. The original upstream banner and screenshots remain only as provenance assets for the [archived upstream README](docs/UPSTREAM_README.md); they are not used by the application interface or metadata.

Regenerate the PNG application icons from `public/assets/logo.svg` with:

```bash
node scripts/generate-brand-icons.mjs
```

## License and attribution

Original software copyright © 2026 Yousuf Amanuel. The original [LICENSE](LICENSE), [LICENSE-OLD](LICENSE-OLD) and [TRADEMARK.md](TRADEMARK.md) are retained unchanged. Posteroom modifications are provided under the GNU AGPL-3.0 terms of the fork. This program is provided without warranty; see the license notices.

The complete, unmodified AGPL version 3 text is included in [COPYING](COPYING), obtained from the SPDX license-list-data `text/AGPL-3.0-or-later.txt` reference. Each production build emits a self-contained `legal/index.html` page and copies of those notices. License links use the asset base, independently of the source archive URL.

The application provides a visible Source link and an About panel with original software credits, license notices and map-provider attribution. When deploying modifications, provide the corresponding source for that deployed version.

- Map data: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL.
- Tile schema: [OpenMapTiles](https://openmaptiles.org/).
- Tile hosting: [OpenFreeMap](https://openfreemap.org/).
- Geocoding: [Nominatim](https://nominatim.openstreetmap.org/).
- Map renderer: [MapLibre GL JS](https://maplibre.org/), BSD-3-Clause.

The upstream contribution workflow and CLA files remain for provenance. Work on this downstream fork is not an upstream contribution or a CLA acceptance.
