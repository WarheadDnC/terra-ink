# Posteroom cart integration

## Current state

The Download action and PNG/PDF/SVG picker are replaced by Add to cart on mobile and desktop. Until Posteroom supplies a cart adapter, pressing the button reports that ordering is unavailable. It does not generate files, send requests, invent prices or claim an item was added.

Once configured, the app prepares an A3/A4 PNG at 300 DPI with the current map, theme, text and markers, and retained map attribution. It passes the in-memory PNG and paper metadata to the adapter. The confirmation and View cart link appear only after the adapter returns a valid cart item key and same-origin cart URL.

The PNG is rendered **in the browser**. Removing the download action does not make the print file inaccessible to browser users. Server-side rendering is separate work if the print master must never reach the customer browser.

## Host-page adapter contract

The WordPress host page must supply `window.terraInkCart` before the customer submits a design. Its `addItem` method implements `IPosterCart` from `src/features/cart/domain/ports.ts`:

```ts
interface IPosterCart {
  addItem(request: {
    requestId: string;
    poster: Blob; // image/png
    design: {
      schemaVersion: 1;
      paperSize: "A3" | "A4";
      orientation: "portrait" | "landscape";
      widthCm: number;
      heightCm: number;
      dpi: 300;
      title: string;
      subtitle: string;
      theme: string;
      latitude: number;
      longitude: number;
    };
  }): Promise<{ cartItemKey: string; cartUrl: string }>;
}
```

This is a new integration contract, **not an existing Posteroom endpoint**. No endpoint, product ID, variation ID, nonce or price has been guessed. Adapt the existing AI poster generator's AJAX handler to this contract once its source and product mapping are available. Keep secrets out of browser code. The supplied adapter must upload the PNG and await WooCommerce confirmation before resolving; it must not resolve on upload alone.

The intended deployment is the designer mounted on the Posteroom origin, sharing the WooCommerce browser session. Returned cart links must resolve to the page's origin. A standalone preview on another origin does not create a Posteroom cart. Global CSS, asset paths and service-worker scope still need adaptation for a WordPress mount.

## Receiver requirements before enabling orders

- Validate the session and request token using the existing shop integration. Resolve the A3/A4 product or variation and price on the server.
- Validate the uploaded PNG, byte and pixel limits, paper dimensions and metadata. Restrict accepted paper/orientation combinations; never trust client prices or product IDs.
- Store the print asset and generate a cart thumbnail, then keep their references and design metadata on the cart item and order. Apply access control and retention appropriate to the shop.
- Deduplicate `requestId` per customer session atomically. A retry of the same design reuses the same request ID and PNG after an unconfirmed response. A successful add or a changed design uses a new ID. Requests are never retried automatically.
- Return an actual WooCommerce cart item key and cart URL only after the add succeeds. On an error, reject the adapter promise. Client confirmation times out after one minute; an upload may still finish on the server, so the UI asks the customer to check the cart before retrying.

Double clicks are blocked while preparing/uploading. A modal keeps the design controls unavailable during submission and provides progress and confirmation. No real WooCommerce submission has been tested or enabled yet.
