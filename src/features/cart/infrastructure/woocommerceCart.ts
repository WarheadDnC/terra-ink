import type { CartOffer, CartRequest, IPosterCart } from "../domain/ports";

interface ShopConfig { token: string; offers: Record<string, CartOffer>; }

export function createWooCommerceCart(endpoint: string): IPosterCart {
  const url = new URL(endpoint, window.location.href);
  if (url.origin !== window.location.origin) throw new Error("The shop endpoint must use the same origin.");
  async function send(action: string, data = new FormData()) {
    data.set("action", action);
    const response = await fetch(url.href, {
      method: "POST", credentials: "same-origin", cache: "no-store",
      headers: { "X-Posteroom-Request": "1" }, body: data,
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      const error = new Error(result?.data?.message || "The shop could not accept this poster.");
      error.name = "ShopCartError";
      throw error;
    }
    return result.data;
  }
  let config: Promise<ShopConfig> | null = null;
  function bootstrap(): Promise<ShopConfig> {
    return config ??= send("posteroom_bootstrap").catch(error => { config = null; throw error; });
  }
  return {
    async getOffer(layout: string) {
      const shop = await bootstrap();
      return shop.offers[layout] ?? { label: "Currently unavailable", available: false };
    },
    async addItem(request: CartRequest) {
      // Fresh token supports long-lived pages and a login in another tab.
      config = null;
      const shop = await bootstrap();
      const data = new FormData();
      data.set("token", shop.token);
      data.set("request_id", request.requestId);
      data.set("design", JSON.stringify(request.design));
      data.set("poster", request.poster, "poster.png");
      const receipt = await send("posteroom_add_to_cart", data);
      // Classic mini-cart fragments; Blocks refetch on the native event.
      const jq = (window as unknown as { jQuery?: (arg: unknown) => { trigger: (name: string) => void } }).jQuery;
      jq?.(document.body).trigger("wc_fragment_refresh");
      document.body.dispatchEvent(new CustomEvent("wc-blocks_added_to_cart", { bubbles: true, detail: { preserveCartData: false } }));
      return receipt;
    },
  };
}
