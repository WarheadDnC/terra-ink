import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const assetsDir = new URL("../public/assets/", import.meta.url);
const logo = await fs.readFile(new URL("logo.svg", assetsDir), "utf8");
const icons = [
  ["favicon-16.png", 16],
  ["favicon-32.png", 32],
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["icon-maskable.png", 512],
];

for (const [filename, size] of icons) {
  // Keep the monogram inside the maskable-icon safe zone.
  const source = filename === "icon-maskable.png"
    ? logo.replace('rx="12"', 'rx="0"')
        .replace("<path", '<g transform="translate(9.6 9.6) scale(.7)"><path')
        .replace("</svg>", "</g></svg>")
    : logo;
  await sharp(Buffer.from(source))
    .resize(size, size)
    .png()
    .toFile(fileURLToPath(new URL(filename, assetsDir)));
}
