import { useEffect, useRef } from "react";
import { useAddToCart } from "../application/useAddToCart";
import { CartIcon, LoaderIcon } from "@/shared/ui/Icons";

export default function AddToCartButton({ isMobile }: { isMobile: boolean }) {
  const { addToCart, phase, message, receipt, offer, reset } = useAddToCart();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isBusy = phase === "preparing" || phase === "adding";
  const isOpen = phase !== "idle";
  const progressLabel = phase === "preparing" ? "Preparing your poster…" : "Adding to cart…";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && !dialog?.open) dialog?.showModal();
    if (!isOpen && dialog?.open) dialog.close();
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        className={`${isMobile ? "mobile-export-fab-trigger" : "export-fab-trigger-desktop"} cart-trigger`}
        onClick={() => void addToCart()}
        disabled={isBusy || (offer !== null && !offer.available)}
        aria-haspopup="dialog"
      >
        <CartIcon aria-hidden="true" />
        <span>{offer ? (offer.available ? `Add to cart — ${offer.label}` : offer.label) : "Add to cart"}</span>
      </button>
      <dialog
        ref={dialogRef}
        className="cart-dialog"
        aria-labelledby="cart-dialog-title"
        aria-describedby="cart-dialog-message"
        onCancel={(event) => { if (isBusy) event.preventDefault(); else reset(); }}
        onClose={() => { if (!isBusy) reset(); }}
      >
        <h2 id="cart-dialog-title">{phase === "success" ? "Added to cart" : "Add to cart"}</h2>
        <p id="cart-dialog-message" role="status" aria-live="polite">
          {isBusy && <LoaderIcon className="cart-spinner" aria-hidden="true" />}
          {isBusy ? progressLabel : message}
        </p>
        {!isBusy && (
          <div className="cart-dialog-actions">
            {receipt && <a href={receipt.cartUrl} className="cart-view-link">View cart</a>}
            <button type="button" onClick={reset} autoFocus>
              {receipt ? "Continue designing" : "Back to design"}
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
