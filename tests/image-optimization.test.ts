import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { optimizeImage, imageMaximums, catalogImageKind } from '../lib/image-optimization';
import { bannerContentType } from '../lib/banner-images';
test('real image optimization reduces bytes, bounds dimensions and avoids repeated lossy compression', async () => {
  const width = 1200, height = 1000, pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 3;
    pixels[offset] = x % 256; pixels[offset + 1] = y % 256; pixels[offset + 2] = (x * 13 + y * 7) % 256;
  }
  const source = await sharp(pixels, { raw: { width, height, channels: 3 } }).png().toBuffer();
  const result = await optimizeImage(source, 'image/png', 'series');
  assert.ok(result.data.length < source.length * .95);
  assert.equal(bannerContentType(result.data), result.contentType);
  const metadata = await sharp(result.data).metadata();
  assert.ok(metadata.width! <= imageMaximums.series && metadata.height! <= imageMaximums.series);
  assert.ok(metadata.exif?.includes(Buffer.from('Goats image optimizer v1')));
  const repeat = await optimizeImage(result.data, result.contentType, 'series');
  assert.deepEqual(repeat.data, result.data);
  console.log(`Test image: ${source.length} → ${result.data.length} bytes (${Math.round((1-result.data.length/source.length)*100)}% reduction).`);
});
test('optimization preserves alpha and never enlarges a tiny original', async () => {
  const source = await sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 140, g: 80, b: 200, alpha: 0 } } }).png().toBuffer();
  const result = await optimizeImage(source, 'image/png', 'product');
  assert.ok(result.data.length <= source.length);
  assert.ok((await sharp(result.data).metadata()).hasAlpha);
  const raw = await sharp(result.data).ensureAlpha().raw().toBuffer();
  assert.equal(raw[3], 0);
});
test('invalid image contents are rejected and upload kinds select appropriate bounds', async () => {
  await assert.rejects(optimizeImage(Buffer.from('not an image'), 'image/png', 'product'));
  assert.equal(catalogImageKind('series:netflix-test'), 'series');
  assert.equal(catalogImageKind('platform:netflix'), 'platform');
  assert.equal(catalogImageKind('category:Vasos'), 'category');
  assert.equal(catalogImageKind('product:test'), 'product');
});

test('bulk optimization list and mutations are private to administrators', async () => {
  const { GET, POST } = await import('../app/api/admin/images/optimize/route');
  assert.equal((await GET()).status, 403);
  const response = await POST(new Request('http://localhost/api/admin/images/optimize', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' }, body: JSON.stringify({ type: 'catalog', id: 'product:test' }),
  }));
  assert.equal(response.status, 403);
});
