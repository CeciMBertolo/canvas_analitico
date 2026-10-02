import { createHash } from "node:crypto";

export type RGB = { r: number; g: number; b: number };

export function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function compact(value: string) {
  return stripAccents(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function normalizeCategory(value: string) {
  const clean = compact(value);
  if (clean.startsWith("disen")) return "diseno";
  if (clean.startsWith("profesi")) return "profesional";
  if (clean.startsWith("casual")) return "casual";
  return clean;
}

export function normalizeConfidence(value: string) {
  return compact(value);
}

export function normalizeBoolean(value: string) {
  const clean = compact(value);
  if (["si", "s", "true", "verdadero", "1", "yes", "y", "x"].includes(clean)) return true;
  if (["no", "n", "false", "falso", "0", ""].includes(clean)) return false;
  throw new Error(`Valor booleano no reconocido: ${value}`);
}

export function imageId(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex").slice(0, 16);
}

function rgbToHsv({ r, g, b }: RGB) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === rn) hue = ((gn - bn) / delta) % 6;
    else if (max === gn) hue = (bn - rn) / delta + 2;
    else hue = (rn - gn) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return { hue, saturation: max === 0 ? 0 : delta / max };
}

const rounded = (value: number, digits: number) => Number(value.toFixed(digits));

export function calculateMetrics(pixels: Buffer) {
  const luminance: number[] = [];
  const buckets = new Uint32Array(512);
  let sum = 0, sumSq = 0, shadows = 0, highlights = 0;
  let hueX = 0, hueY = 0, saturationSum = 0;

  for (let i = 0; i < pixels.length; i += 3) {
    const rgb = { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] };
    const lum = (0.2125 * rgb.r + 0.7154 * rgb.g + 0.0721 * rgb.b) / 255;
    luminance.push(lum);
    sum += lum;
    sumSq += lum * lum;
    if (lum < 0.1) shadows++;
    if (lum > 0.9) highlights++;

    const { hue, saturation } = rgbToHsv(rgb);
    const angle = hue * Math.PI / 180;
    hueX += Math.cos(angle) * saturation;
    hueY += Math.sin(angle) * saturation;
    saturationSum += saturation;
    buckets[(rgb.r >> 5) * 64 + (rgb.g >> 5) * 8 + (rgb.b >> 5)]++;
  }

  const count = luminance.length;
  luminance.sort((a, b) => a - b);
  const middle = Math.floor(count / 2);
  const median = count % 2 ? luminance[middle] : (luminance[middle - 1] + luminance[middle]) / 2;
  const mean = sum / count;
  const std = Math.sqrt(Math.max(0, sumSq / count - mean * mean));
  let dominant = 0;
  for (const n of buckets) dominant = Math.max(dominant, n);
  let hue = Math.atan2(hueY, hueX) * 180 / Math.PI;
  if (hue < 0) hue += 360;
  if (hueX === 0 && hueY === 0) hue = 0;

  return {
    mediana_luminancia: rounded(median, 4),
    dispersion_luminancia: rounded(std, 4),
    prop_sombras: rounded(shadows / count, 4),
    prop_altas_luces: rounded(highlights / count, 4),
    matiz_dominante_deg: rounded(hue, 2),
    saturacion_media: rounded(saturationSum / count, 4),
    dominancia_cromatica: rounded(dominant / count, 4),
  };
}

export function canonicalParts(value: string) {
  const base = value.replace(/\.(jpe?g|png|webp|heic)$/i, "");
  const parts = base.split(/[_\s]+/).filter(Boolean);
  const category = normalizeCategory(parts[0] ?? "");
  const number = (base.match(/\d+/)?.[0] ?? "").padStart(2, "0");
  const author = compact(parts.filter((part, index) => index > 0 && !/^\d+$/.test(part)).join(""));
  return { category, number, author };
}
