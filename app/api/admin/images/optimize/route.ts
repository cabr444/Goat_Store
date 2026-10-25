import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, reply } from '@/lib/http';
import { secureMutation } from '@/lib/security';
import { optimizeImage, catalogImageKind } from '@/lib/image-optimization';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET() {
  if ((await getUser())?.role !== 'ADMIN') return fail('Solo administradores.', 403);
  const [catalog, banners] = await Promise.all([
    db.catalogImageAsset.findMany({ select: { key: true }, orderBy: { key: 'asc' } }),
    db.bannerImage.findMany({ select: { slot: true }, orderBy: { slot: 'asc' } }),
  ]);
  return reply({ images: [...catalog.map(row => ({ type: 'catalog', id: row.key })), ...banners.map(row => ({ type: 'banner', id: String(row.slot) }))] });
}
const schema = z.discriminatedUnion('type', [z.object({ type: z.literal('catalog'), id: z.string().min(1).max(300) }), z.object({ type: z.literal('banner'), id: z.string().regex(/^[1-6]$/) })]);
export const POST = secureMutation(async (req: Request) => {
  if ((await getUser())?.role !== 'ADMIN') return fail('Solo administradores.', 403);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Imagen inválida.');
  const { type, id } = parsed.data;
  const image = type === 'catalog' ? await db.catalogImageAsset.findUnique({ where: { key: id } }) : await db.bannerImage.findUnique({ where: { slot: Number(id) } });
  if (!image) return fail('La imagen ya no existe.', 404);
  try {
    const optimized = await optimizeImage(image.data, image.contentType, type === 'banner' ? 'banner' : catalogImageKind(id));
    if (optimized.data.length >= image.data.length) return reply({ before: image.data.length, after: image.data.length, changed: false });
    // A new upload or deletion during this work must never be overwritten.
    const result = type === 'catalog'
      ? await db.catalogImageAsset.updateMany({ where: { key: id, updatedAt: image.updatedAt }, data: optimized })
      : await db.bannerImage.updateMany({ where: { slot: Number(id), updatedAt: image.updatedAt }, data: optimized });
    if (!result.count) return fail('La imagen cambió durante la optimización. Vuelve a intentarlo.', 409);
    return reply({ before: image.data.length, after: optimized.data.length, changed: true });
  } catch { return fail('No se pudo optimizar esta imagen; se conserva el archivo guardado.', 422); }
});
