import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bannerContentType, maxBannerBytes } from '../lib/banner-images';
import { readImageUpload } from '../lib/image-upload';
function fileTypeBox(major: string, compatible: string[] = []) {
  const bytes = Buffer.alloc(16 + compatible.length * 4);
  bytes.writeUInt32BE(bytes.length);
  bytes.write('ftyp', 4);
  bytes.write(major, 8);
  compatible.forEach((brand, index) => bytes.write(brand, 16 + index * 4));
  return bytes;
}
test('AVIF detection accepts major and compatible brands but rejects HEIC and malformed headers', () => {
  assert.equal(bannerContentType(fileTypeBox('avif')), 'image/avif');
  assert.equal(bannerContentType(fileTypeBox('avis')), 'image/avif');
  assert.equal(bannerContentType(fileTypeBox('mif1', ['miaf', 'avif'])), 'image/avif');
  assert.equal(bannerContentType(fileTypeBox('heic', ['mif1'])), null);
  assert.equal(bannerContentType(fileTypeBox('mif1', ['avif']).subarray(0, 18)), null);
  assert.equal(bannerContentType(Buffer.from('not an image avif')), null);
});
test('shared catalog uploader accepts AVIF with matching MIME and keeps size and origin restrictions', async () => {
  const bytes = fileTypeBox('avif', ['mif1']);
  const request = (body: Uint8Array, type = 'image/avif', origin = 'http://localhost') => new Request('http://localhost/api/admin/images', { method: 'POST', headers: { 'Content-Type': type, Origin: origin }, body: new Uint8Array(body) });
  const result = await readImageUpload(request(bytes));
  assert.ok(!(result instanceof Response));
  assert.equal(result.contentType, 'image/avif');
  assert.deepEqual(Buffer.from(result.data), bytes);
  assert.equal((await readImageUpload(request(bytes, 'image/png')) as Response).status, 400);
  assert.equal((await readImageUpload(request(Buffer.from('fake avif'))) as Response).status, 400);
  assert.equal((await readImageUpload(request(new Uint8Array(maxBannerBytes + 1))) as Response).status, 413);
  assert.equal((await readImageUpload(request(bytes, 'image/avif', 'https://other.example')) as Response).status, 403);
});
