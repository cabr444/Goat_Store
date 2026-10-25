// Resize new administrator uploads in the browser; server validation still applies.
export async function compressUpload(file: File, kind: "category" | "product" | "series" | "platform"): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) return file;
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    const maximum = kind === "platform" ? 128 : kind === "series" ? 960 : 1400;
    const ratio = Math.min(1, maximum / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const compressed = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", .86));
    // Keep the original if conversion is unsupported or would enlarge the upload.
    return compressed && compressed.size < file.size ? compressed : file;
  } catch { return file; }
  finally { bitmap?.close(); }
}
