import sharp from 'sharp';
export type ImageKind = 'product' | 'category' | 'series' | 'platform' | 'banner';
export const imageMaximums: Record<ImageKind, number> = { product: 900, category: 700, series: 700, platform: 128, banner: 1600 };
const marker = 'Goats image optimizer v1';
export async function optimizeImage(data: Uint8Array, contentType: string, kind: ImageKind) {
  const original = { data: new Uint8Array(data), contentType };
  const input = sharp(data, { limitInputPixels: 40_000_000, failOn: 'error' });
  const metadata = await input.metadata();
  // Avoid degrading an already processed image and preserve animated artwork.
  if ((metadata.pages || 1) > 1 || metadata.exif?.includes(Buffer.from(marker))) return original;
  const maximum = imageMaximums[kind];
  const resized = input.rotate().resize({ width: maximum, height: maximum, fit: 'inside', withoutEnlargement: true })
    .withExif({ IFD0: { Software: marker } });
  // Strip source metadata, retain transparency, and select the smaller encoding.
  const avif = await resized.clone().avif({ quality: 45, effort: 4 }).toBuffer();
  const webp = await resized.clone().webp({ quality: 65, effort: 4 }).toBuffer();
  const candidate = avif.length <= webp.length ? { data: avif, contentType: 'image/avif' } : { data: webp, contentType: 'image/webp' };
  // Replacing an already tiny image should provide a meaningful saving.
  return candidate.data.length < data.length * .95 ? { data: new Uint8Array(candidate.data), contentType: candidate.contentType } : original;
}
export function catalogImageKind(key: string): ImageKind {
  const prefix = key.split(':')[0];
  return ['category', 'series', 'platform'].includes(prefix) ? prefix as ImageKind : 'product';
}
