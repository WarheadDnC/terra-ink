import { afterEach, expect, test } from "bun:test";
import { createWooCommerceCart } from "../src/features/cart/infrastructure/woocommerceCart";
import type { CartRequest } from "../src/features/cart/domain/ports";
const originalWindow = globalThis.window;
const originalFetch = globalThis.fetch;
const originalDocument = globalThis.document;
afterEach(() => { globalThis.window = originalWindow; globalThis.fetch = originalFetch; globalThis.document = originalDocument; });
function setup() {
  globalThis.window = { location: { href: "https://shop.example/designer/", origin: "https://shop.example" } } as Window & typeof globalThis;
  globalThis.document = { body: { dispatchEvent: () => true } } as unknown as Document;
}
const request: CartRequest = { requestId: "123e4567-e89b-12d3-a456-426614174000", poster: new Blob(["png"], { type: "image/png" }), design: { schemaVersion: 1, paperSize: "A4", orientation: "portrait", widthCm: 21, heightCm: 29.7, dpi: 300, title: "Thessaloniki", subtitle: "Greece", theme: "mono", latitude: 40.64, longitude: 22.94 } };
test("the Woo adapter sends a session token and PNG, never a client price or product", async () => {
  setup(); const actions: string[] = [];
  globalThis.fetch = (async (_url, options) => {
    const form = options!.body as FormData; const action = String(form.get("action")); actions.push(action);
    expect(options!.credentials).toBe("same-origin");
    expect((options!.headers as Record<string, string>)["X-Posteroom-Request"]).toBe("1");
    if (action === "posteroom_bootstrap") return Response.json({ success: true, data: { token: "session-only-token", offers: { print_a4_portrait: { label: "€16.90", available: true } } } });
    expect(form.get("token")).toBe("session-only-token");
    expect(form.get("request_id")).toBe(request.requestId);
    expect((form.get("poster") as File).type).toBe("image/png");
    expect(form.has("price")).toBe(false); expect(form.has("product_id")).toBe(false);
    return Response.json({ success: true, data: { cartItemKey: "cart-key", cartUrl: "/cart/" } });
  }) as typeof fetch;
  const cart = createWooCommerceCart("/wp-admin/admin-ajax.php");
  expect(await cart.getOffer!("print_a4_portrait")).toEqual({ label: "€16.90", available: true });
  expect(await cart.addItem(request)).toEqual({ cartItemKey: "cart-key", cartUrl: "/cart/" });
  expect(actions).toEqual(["posteroom_bootstrap", "posteroom_bootstrap", "posteroom_add_to_cart"]);
});
test("server rejection stays an error with its customer message", async () => {
  setup();globalThis.fetch = (async () => Response.json({ success: false, data: { message: "Ordering disabled" } }, { status: 403 })) as typeof fetch;
  await expect(createWooCommerceCart("/wp-admin/admin-ajax.php").addItem(request)).rejects.toThrow("Ordering disabled");
});
test("a different origin cannot receive artwork or session requests", () => {
  setup();expect(() => createWooCommerceCart("https://other.example/upload")).toThrow("same origin");
});
