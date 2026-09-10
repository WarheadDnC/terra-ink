import { describe, expect, mock, test } from "bun:test";
import type { ExportOptions } from "../src/features/poster/domain/types";

const capture = mock(async () => ({ canvas: { width: 1, height: 1 }, markerProjection: {},
  markerScaleX: 1, markerScaleY: 1, markerSizeScale: 1 }));
const composedCanvas = { width: 1, height: 1 };
const composite = mock(async () => ({ canvas: composedCanvas }));
const png = new Blob(["encoded-png"], { type: "image/png" });
const encode = mock(async () => png);
mock.module("../src/features/export/infrastructure/mapExporter", () => ({ captureMapAsCanvas: capture }));
mock.module("../src/features/poster/infrastructure/renderer", () => ({ compositeExport: composite }));
mock.module("../src/features/export/infrastructure/pngExporter", () => ({ createPngBlob: encode }));
const { renderPosterPng } = await import("../src/features/export/infrastructure/renderPosterPng");

describe("Cart PNG preparation", () => {
  for (const [widthCm, heightCm, widthPx, heightPx] of [
    [29.7, 42, 3508, 4961], [42, 29.7, 4961, 3508],
    [21, 29.7, 2480, 3508], [29.7, 21, 3508, 2480],
  ]) {
    test(`${widthCm} × ${heightCm} cm retains full 300 DPI resolution`, async () => {
      const map = {} as Parameters<typeof renderPosterPng>[0];
      const options = { widthInches: widthCm / 2.54, heightInches: heightCm / 2.54 } as ExportOptions;
      expect(await renderPosterPng(map, options)).toBe(png);
      expect(capture).toHaveBeenLastCalledWith(map, widthPx, heightPx, true);
      expect(encode).toHaveBeenLastCalledWith(composedCanvas, 300);
      expect(composedCanvas.width).toBe(0);
      expect(composedCanvas.height).toBe(0);
    });
  }
  test("propagates capture failure without encoding an undersized image", async () => {
    capture.mockRejectedValueOnce(new Error("Full print resolution unavailable"));
    const callsBefore = encode.mock.calls.length;
    await expect(renderPosterPng({} as Parameters<typeof renderPosterPng>[0],
      { widthInches: 21 / 2.54, heightInches: 29.7 / 2.54 } as ExportOptions,
    )).rejects.toThrow("Full print resolution unavailable");
    expect(encode.mock.calls.length).toBe(callsBefore);
  });
});
