# WordPress/WooCommerce integration checks

This fixture starts its own disposable WordPress Playground, activates WooCommerce and the local plugin, and creates test variations with the same A3/A4 structure. It uses synthetic full-resolution PNGs and makes real HTTP uploads, cart and order calls. It never connects to Posteroom, FAL, a payment provider or customer data.

Install `@wp-playground/cli` in a separate tooling directory and extract the official WooCommerce plugin ZIP. Then run:

```bash
WP_PLAYGROUND_CLI=/absolute/path/to/wp-playground-cli \
WOOCOMMERCE_DIR=/absolute/path/to/woocommerce \
python3 tests/wordpress/integration.py
```

The test-only PHP inspector is mounted into the disposable local WordPress and protected with a random per-run token. Never copy it into a real shop. The plugin package contains only `wordpress/posteroom-map-designer`, the build, license notices and an inert source archive.

Checks cover guest session/token isolation, server prices, image rejection, full A3/A4 orientations, retry idempotency, separate designs, signed thumbnails, the Store API cart, WooCommerce order creation, private print download and disabling misconfigured ordering. Browser rendering, concurrency stress, physical shipping and payment processing are outside this fixture.
