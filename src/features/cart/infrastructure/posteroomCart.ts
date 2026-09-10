import type { CartReceipt, CartRequest, IPosterCart } from "../domain/ports";

declare global {
  interface Window {
    terraInkCart?: IPosterCart;
  }
}

export function getPosterCart(): IPosterCart | null {
  const bridge = window.terraInkCart;
  if (!bridge || typeof bridge.addItem !== "function") return null;

  return {
    getOffer: bridge.getOffer?.bind(bridge),
    async addItem(request: CartRequest): Promise<CartReceipt> {
      let timeout: ReturnType<typeof setTimeout>;
      let receipt: CartReceipt;
      try {
        receipt = await Promise.race([
          bridge.addItem(request),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error("Cart confirmation timed out.")), 60_000);
          }),
        ]);
      } finally {
        clearTimeout(timeout);
      }
      if (
        !receipt ||
        typeof receipt.cartItemKey !== "string" ||
        !receipt.cartItemKey.trim() ||
        typeof receipt.cartUrl !== "string" ||
        !receipt.cartUrl.trim()
      ) {
        throw new Error("The shop did not confirm the cart item.");
      }
      const cartUrl = new URL(receipt.cartUrl, window.location.href);
      if (
        cartUrl.origin !== window.location.origin ||
        !["http:", "https:"].includes(cartUrl.protocol) ||
        cartUrl.username || cartUrl.password
      ) {
        throw new Error("The shop returned an invalid cart link.");
      }
      return { cartItemKey: receipt.cartItemKey, cartUrl: cartUrl.href };
    },
  };
}

export function createCartRequestId(): string {
  return crypto.randomUUID();
}
