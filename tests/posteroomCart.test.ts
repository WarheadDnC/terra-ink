import { afterEach, describe, expect, test } from "bun:test";
import { getPosterCart } from "../src/features/cart/infrastructure/posteroomCart";
import type { CartRequest, IPosterCart } from "../src/features/cart/domain/ports";

const originalWindow = globalThis.window;
const request: CartRequest = {
  requestId: "same-design-retry-id",
  poster: new Blob(["test-png"], { type: "image/png" }),
  design: { schemaVersion: 1, paperSize: "A4", orientation: "portrait", widthCm: 21,
    heightCm: 29.7, dpi: 300, title: "Thessaloniki", subtitle: "Greece", theme: "test", latitude: 40.64, longitude: 22.94 },
};
function installBridge(bridge?: IPosterCart) {
  globalThis.window = { terraInkCart: bridge,
    location: { href: "https://shop.example/terra-ink/", origin: "https://shop.example" },
  } as unknown as Window & typeof globalThis;
}
afterEach(() => { globalThis.window = originalWindow; });

describe("Posteroom cart adapter", () => {
  test("an unconnected preview has no cart adapter", () => {
    installBridge();
    expect(getPosterCart()).toBeNull();
  });
  test("passes the PNG and request ID unchanged, and waits for confirmation", async () => {
    let received: CartRequest | undefined;
    let resolve!: (value: { cartItemKey: string; cartUrl: string }) => void;
    installBridge({ addItem: value => { received = value; return new Promise(done => { resolve = done; }); } });
    let confirmed = false;
    const result = getPosterCart()!.addItem(request).then(value => { confirmed = true; return value; });
    await Promise.resolve();
    expect(received).toBe(request);
    expect(confirmed).toBe(false);
    resolve({ cartItemKey: "wc-cart-key", cartUrl: "/cart/" });
    expect(await result).toEqual({ cartItemKey: "wc-cart-key", cartUrl: "https://shop.example/cart/" });
  });
  test("does not turn a rejected shop request into success", async () => {
    installBridge({ addItem: async () => { throw new Error("Upload rejected"); } });
    await expect(getPosterCart()!.addItem(request)).rejects.toThrow("Upload rejected");
  });
  test("an upload-only receipt cannot confirm a cart item", async () => {
    installBridge({ addItem: async () => ({ cartItemKey: "", cartUrl: "/cart/" }) });
    await expect(getPosterCart()!.addItem(request)).rejects.toThrow("did not confirm");
  });
  for (const cartUrl of ["https://external.example/cart/", "javascript:alert(1)", "https://user:pass@shop.example/cart/"]) {
    test(`rejects unsafe cart URL ${cartUrl}`, async () => {
      installBridge({ addItem: async () => ({ cartItemKey: "wc-key", cartUrl }) });
      await expect(getPosterCart()!.addItem(request)).rejects.toThrow("invalid cart link");
    });
  }
});
