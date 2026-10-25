import { allowedMutationOrigin } from "@/lib/request-origin";
import { bannerContentType, maxBannerBytes } from "@/lib/banner-images";
import { fail } from "@/lib/http";
export async function readImageUpload(
  req: Request,
): Promise<{ data: Uint8Array<ArrayBuffer>; contentType: string } | Response> {
  if (!allowedMutationOrigin(req)) return fail("Solicitud no autorizada.", 403);
  const type = req.headers.get("content-type")?.split(";")[0];
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(type || ""))
    return fail("Usa JPG, PNG, WebP o AVIF.", 415);
  if (Number(req.headers.get("content-length")) > maxBannerBytes)
    return fail("La imagen debe pesar máximo 2 MB.", 413);
  const reader = req.body?.getReader();
  if (!reader) return fail("Selecciona una imagen.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBannerBytes) {
      await reader.cancel();
      return fail("La imagen debe pesar máximo 2 MB.", 413);
    }
    chunks.push(value);
  }
  const data = Buffer.concat(chunks),
    contentType = bannerContentType(data);
  if (!contentType || type !== contentType)
    return fail("El archivo no es una imagen válida.");
  return { data: new Uint8Array(data), contentType };
}
