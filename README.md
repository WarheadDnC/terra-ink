# Terra Ink by Posteroom

A custom map poster designer for Posteroom, based on the [Terraink source code](https://github.com/rw3-io/terraink).

This is an independent downstream fork. It is not affiliated with or endorsed by the original Terraink project.

## Current stage

This first Posteroom adaptation changes application branding, icons, metadata and source-code links, and removes upstream donation prompts. Location search, map styling, markers and PNG/PDF/SVG exports are retained for development.

Poster sizes are restricted to A3 and A4, each in portrait and landscape orientation, with A4 portrait selected by default. The custom width/height editor and all other size presets have been removed.

WooCommerce integration and the purchase flow are not implemented yet. The app is not ready to mount in WordPress: its global CSS, root-relative assets and root-scoped service worker must be adapted first. Do not copy the standalone service worker into the WordPress root.

## Develop and build

```bash
bun install --frozen-lockfile
bun run dev
bun run build
bun run typecheck
```

Optional settings are documented in [`.env.example`](.env.example). Leave contact and social settings empty until the Posteroom destinations are confirmed. The source link defaults to this fork; set `VITE_REPO_URL` to the corresponding source of the deployed version.

Development metadata uses `noindex, nofollow`, and the upstream sitemap and canonical URLs have been removed. Configure production indexing, canonical URLs and sharing metadata as part of deployment.

## Changes in this fork

Posteroom modifications began on 2026-09-02. The current version is `0.4.2-posteroom.2`, adding the A3/A4 paper-size restriction after the initial branding changes. Git history records the modified files and dates.

The new TI monogram and generated application icons are Posteroom additions. The original upstream banner and screenshots remain only as provenance assets for the [archived upstream README](docs/UPSTREAM_README.md); they are not used by the application interface or metadata.

Regenerate the PNG application icons from `public/assets/logo.svg` with:

```bash
node scripts/generate-brand-icons.mjs
```

## License and attribution

Original software copyright © 2026 Yousuf Amanuel. The original [LICENSE](LICENSE), [LICENSE-OLD](LICENSE-OLD) and [TRADEMARK.md](TRADEMARK.md) are retained unchanged. Posteroom modifications are provided under the GNU AGPL-3.0 terms of the fork. This program is provided without warranty; see the license notices.

The application provides a visible Source link and an About panel with original software credits, license notices and map-provider attribution. When deploying modifications, provide the corresponding source for that deployed version.

- Map data: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL.
- Tile schema: [OpenMapTiles](https://openmaptiles.org/).
- Tile hosting: [OpenFreeMap](https://openfreemap.org/).
- Geocoding: [Nominatim](https://nominatim.openstreetmap.org/).
- Map renderer: [MapLibre GL JS](https://maplibre.org/), BSD-3-Clause.

The upstream contribution workflow and CLA files remain for provenance. Work on this downstream fork is not an upstream contribution or a CLA acceptance.
