import { useCallback, useRef, useState } from "react";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import { CM_PER_INCH } from "@/core/config";
import {
  createCartRequestId, ensureGoogleFont, getAllMarkerIcons,
  getLayoutOption, getPosterCart, renderPosterPng,
} from "@/core/services";
import type { CartReceipt, CartRequest } from "../domain/ports";

export function useAddToCart() {
  const { state, dispatch, effectiveTheme, mapRef } = usePosterContext();
  const busy = useRef(false);
  const pending = useRef<{ designKey: string; request: CartRequest } | null>(null);
  const [phase, setPhase] = useState<"idle" | "preparing" | "adding" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<CartReceipt | null>(null);

  const addToCart = useCallback(async () => {
    if (busy.current || state.isExporting) return;
    const cart = getPosterCart();
    setReceipt(null);
    if (!cart) {
      setMessage("Ordering is not available in this preview yet.");
      setPhase("error");
      return;
    }
    const map = mapRef.current;
    if (!map) {
      setMessage("The map is still loading. Please try again in a moment.");
      setPhase("error");
      return;
    }

    busy.current = true;
    dispatch({ type: "SET_EXPORT_STATUS", exporting: true });
    setMessage("");
    setPhase("preparing");
    let sentToShop = false;
    try {
      const { form } = state;
      const layout = getLayoutOption(form.layout);
      const match = /^print_(a3|a4)_(portrait|landscape)$/.exec(form.layout);
      if (!layout || !match || layout.id !== form.layout ||
          Number(form.width) !== layout.widthCm || Number(form.height) !== layout.heightCm) {
        throw new Error("Choose an A3 or A4 poster size before adding it to your cart.");
      }
      const center = map.getCenter();
      const designKey = JSON.stringify({ form, theme: effectiveTheme, markers: state.markers,
        icons: state.customMarkerIcons, center, zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() });
      if (pending.current?.designKey !== designKey) {
        pending.current = null;
        if (form.showPosterText && form.fontFamily.trim()) {
          await ensureGoogleFont(form.fontFamily.trim());
        }
        const hasMarkers = form.showMarkers && state.markers.length > 0;
        const poster = await renderPosterPng(map, {
          theme: effectiveTheme,
          center: { lat: center.lat, lon: center.lng },
          widthInches: layout.widthCm / CM_PER_INCH,
          heightInches: layout.heightCm / CM_PER_INCH,
          displayCity: form.displayCity || form.location || "",
          displayCountry: form.displayCountry || "",
          fontFamily: form.fontFamily.trim(),
          showPosterText: form.showPosterText,
          showOverlay: form.showMarkers,
          includeCredits: true,
          markers: hasMarkers ? state.markers : [],
          markerIcons: hasMarkers ? getAllMarkerIcons(state.customMarkerIcons) : [],
        });
        pending.current = { designKey, request: {
          requestId: createCartRequestId(),
          poster,
          design: {
            schemaVersion: 1,
            paperSize: match[1] === "a3" ? "A3" : "A4",
            orientation: match[2] === "portrait" ? "portrait" : "landscape",
            widthCm: layout.widthCm,
            heightCm: layout.heightCm,
            dpi: 300,
            title: form.displayCity || form.location || "",
            subtitle: form.displayCountry || "",
            theme: form.theme,
            latitude: center.lat,
            longitude: center.lng,
          },
        } };
      }
      setPhase("adding");
      sentToShop = true;
      const result = await cart.addItem(pending.current.request);
      pending.current = null;
      setReceipt(result);
      setMessage("Your poster has been added to your cart.");
      setPhase("success");
    } catch (error) {
      setMessage(sentToShop
        ? "We could not confirm your cart. Check your cart before trying again."
        : error instanceof Error ? error.message : "Your poster could not be prepared. Please try again.");
      setPhase("error");
    } finally {
      busy.current = false;
      dispatch({ type: "SET_EXPORT_STATUS", exporting: false });
    }
  }, [state, dispatch, effectiveTheme, mapRef]);

  return { addToCart, phase, message, receipt, reset: () => setPhase("idle") };
}
