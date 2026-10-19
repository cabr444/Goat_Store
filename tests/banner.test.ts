import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bannerContentType,
  bannerSlots,
  bannerInterval,
} from "../lib/banner-images";
import { db } from "../lib/db";
import { POST, GET } from "../app/api/banners/[slot]/route";
test("banner uploads reject SVG and HTML, and recognize supported image signatures", () => {
  assert.equal(
    bannerContentType(
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
    ),
    null,
  );
  assert.equal(bannerContentType(Buffer.from("<html>bad</html>")), null);
  assert.equal(
    bannerContentType(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "image/png",
  );
  assert.equal(
    bannerContentType(Uint8Array.from([255, 216, 255, 0])),
    "image/jpeg",
  );
  assert.equal(bannerContentType(Buffer.from("RIFFxxxxWEBP")), "image/webp");
  assert.equal(bannerContentType(new Uint8Array()), null);
  assert.equal(bannerSlots.length, 6);
  assert.equal(bannerInterval, 7000);
});
test("banner uploads require a session while visitors can view images", async () => {
  const ctx = { params: Promise.resolve({ slot: "1" }) };
  const req = new Request("http://localhost/api/banners/1", {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: new Uint8Array([1, 2, 3]),
  });
  assert.equal((await POST(req, ctx)).status, 403);
  const original = db.bannerImage.findUnique;
  try {
    db.bannerImage.findUnique = (async () => ({slot:1, data:new Uint8Array([137,80,78,71,13,10,26,10]), contentType:"image/png", updatedAt:new Date("2026-10-18T00:00:00Z")})) as unknown as typeof original;
    const image = await GET(new Request("http://localhost/api/banners/1"), ctx);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get("Content-Type"), "image/png");
    const cached = await GET(new Request("http://localhost/api/banners/1", {headers:{"If-None-Match":image.headers.get("ETag")!}}), ctx);
    assert.equal(cached.status, 304);
  } finally { db.bannerImage.findUnique = original; }
});
