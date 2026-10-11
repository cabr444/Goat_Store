import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bannerContentType,
  bannerSlots,
  bannerInterval,
} from "../lib/banner-images";
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
test("banner image endpoints reject requests without a session", async () => {
  const ctx = { params: Promise.resolve({ slot: "1" }) };
  const req = new Request("http://localhost/api/banners/1", {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: new Uint8Array([1, 2, 3]),
  });
  assert.equal((await POST(req, ctx)).status, 403);
  assert.equal(
    (await GET(new Request("http://localhost/api/banners/1"), ctx)).status,
    401,
  );
});
