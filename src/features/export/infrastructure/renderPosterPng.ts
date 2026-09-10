import type { Map as MaplibreMap } from "maplibre-gl";
import type { ExportOptions } from "@/features/poster/domain/types";
import { compositeExport } from "@/features/poster/infrastructure/renderer";
import { captureMapAsCanvas } from "./mapExporter";
import { createPngBlob } from "./pngExporter";

/** Build a print PNG in memory; never trigger a browser download. */
export async function renderPosterPng(map: MaplibreMap, options: ExportOptions): Promise<Blob> {
  // The legacy export helper caps A3 below 300 DPI. Cart artwork must keep
  // its requested resolution, or fail instead of silently enlarging it.
  const width = Math.round(options.widthInches * 300);
  const height = Math.round(options.heightInches * 300);
  const capture = await captureMapAsCanvas(map, width, height, true);
  try {
    const { canvas } = await compositeExport(capture.canvas, {
      ...options,
      markerProjection: capture.markerProjection,
      markerScaleX: capture.markerScaleX,
      markerScaleY: capture.markerScaleY,
      markerSizeScale: capture.markerSizeScale,
    });
    try {
      return await createPngBlob(canvas, 300);
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    capture.canvas.width = 0;
    capture.canvas.height = 0;
  }
}
