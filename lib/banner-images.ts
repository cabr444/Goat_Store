export const bannerSlots = [1, 2, 3, 4, 5, 6] as const;
export const bannerInterval = 7000;
export const maxBannerBytes = 2 * 1024 * 1024;
export const defaultBannerImage = (slot: number) =>
  "/images/banners/banner-" + slot + ".svg";
export function bannerContentType(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return "image/jpeg";
  if (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value)
  )
    return "image/png";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  // AVIF uses an ISO BMFF file-type box. Check its declared bounds and brands;
  // a .avif extension or an arbitrary occurrence of "avif" is insufficient.
  if (bytes.length >= 16 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp") {
    const boxSize = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
    if (boxSize >= 16 && boxSize <= bytes.length && boxSize % 4 === 0) {
      for (let offset = 8; offset + 4 <= boxSize; offset += 4) {
        if (offset === 12) continue; // minor_version is not a brand
        const brand = String.fromCharCode(...bytes.slice(offset, offset + 4));
        if (brand === "avif" || brand === "avis") return "image/avif";
      }
    }
  }
  return null;
}
