# Posteroom cart integration

## Deployment

Install the complete `posteroom-map-designer.zip` and use `[posteroom_map_designer]` on one full-width Elementor page. See [installation instructions](../wordpress/posteroom-map-designer/README.md). The standalone Sites preview has no shop session or live cart connection.

`src/wordpress.tsx` is a separate build entry. It mounts the designer in Shadow DOM, keeps portals and offscreen map rendering in that boundary, resolves plugin assets and skips standalone service-worker installation. The PHP shortcode enqueues the module only where used. Full-page caches may cache the shortcode markup: customer-specific tokens and price quotes are fetched from an uncached AJAX bootstrap using same-origin credentials.

## Shop integration

The new `posteroom_bootstrap` and `posteroom_add_to_cart` AJAX actions serve authenticated and guest customers. The existing AI generator's `add_poster_to_cart` action remains separate. The supplied shop mapping is A3 → 4249 and A4 → 4250; both orientations share each size variation. The plugin resolves the parent and exact attributes from WooCommerce, validates availability and never accepts a client price or product ID.

The `IPosterCart` contract in `src/features/cart/domain/ports.ts` accepts a request ID, PNG Blob and validated paper/design metadata. An optional `getOffer(layout)` returns the current WooCommerce display price and availability. A receipt requires a real cart key and same-origin cart URL. Classic mini-cart fragments and the WooCommerce Blocks cart event refresh the page's cart indicators.

The receiver validates the session-bound token, custom same-origin request header, schema, size, orientation, coordinates, PNG type, exact 300 DPI dimensions and 32 MB limit. The client keeps the request and PNG for unconfirmed retries. A per-session file lock and fingerprint prevent repeated submissions from increasing quantity or changing the same request. Different designs have separate cart keys. Cart data is refreshed under the lock before insertion.

## Storage and orders

Print PNGs and 480px JPEG previews live in a configured writable directory outside the public web root. The browser generates the PNG; protected server storage does not hide the original from the browser during generation. The preview is accessible through an HMAC-signed bearer URL. Print downloads require `manage_woocommerce`, an order-item reference and a nonce.

Map metadata uses `posteroom_map`, never the old `posteroom_meta` key. Cart display, Blocks thumbnails and checkout order items preserve the map name, size, orientation, location and artwork reference. Order persistence uses WooCommerce APIs and supports HPOS. Unordered artwork expires after seven days; order-linked artwork is retained. Missing/expired print files prevent checkout.

Back up the private directory with the order database. If its setting changes, copy existing files before enabling the new location. Session lock files are small persistent synchronization files. Deactivation unschedules cleanup but preserves artwork and settings.

## Build and source

```bash
bun install --frozen-lockfile
bun run build:wordpress
python3 scripts/package-wordpress.py /absolute/path/posteroom-map-designer.zip
```

Package only a clean committed source tree and its matching successful build. The ZIP includes the original license/trademark notices and a source archive. The visible Source code link in the embedded designer points to that exact archive.

## Existing AI snippet findings

The owner-supplied legacy snippet accepts client `custom_price`; the new map endpoint does not. The last legacy admin-thumbnail filter must change its accepted argument count from `1` to `2` to match its callback. The new plugin does not rewrite or disable those snippets, and does not include the FAL credential.

## Validation boundary

See the PR for the completed checks. Local PHP/WooCommerce integration checks do not validate the production host, payment gateway, physical shipping rates, browser WebGL rendering or Elementor's visual layout. Complete a staging checkout and a real print proof before accepting customer orders.
