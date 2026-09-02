export interface CartDesign {
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
}

export interface CartRequest {
  /** The receiver must deduplicate retries with this ID. */
  requestId: string;
  poster: Blob;
  design: CartDesign;
}

export interface CartReceipt {
  cartItemKey: string;
  cartUrl: string;
}

/** Implemented by the Posteroom host page after its WooCommerce endpoint is wired. */
export interface IPosterCart {
  addItem(request: CartRequest): Promise<CartReceipt>;
}
