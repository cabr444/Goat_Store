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
  return null;
}
