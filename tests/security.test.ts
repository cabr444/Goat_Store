import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateMutation,
  secureMutation,
  consumeLimit,
} from "../lib/security";
import { db } from "../lib/db";

const request = (headers: Record<string, string> = {}, body = "{}") =>
  new Request("http://localhost/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
test("mutations reject cross-site requests, unsupported formats and oversized bodies", async () => {
  assert.equal(
    validateMutation(request({ Origin: "https://evil.example" }))?.status,
    403,
  );
  assert.equal(
    validateMutation(request({ "Sec-Fetch-Site": "cross-site" }))?.status,
    403,
  );
  assert.equal(
    validateMutation(request({ "Content-Type": "text/plain" }))?.status,
    415,
  );
  assert.equal(
    validateMutation(request({ "Content-Length": "20000" }))?.status,
    413,
  );
  assert.equal(validateMutation(request({ Origin: "http://localhost" })), null);
  let calls = 0;
  const handler = secureMutation(async () => {
    calls++;
    return new Response("{}");
  });
  assert.equal((await handler(request({}, "x".repeat(17000)))).status, 413);
  assert.equal(calls, 0);
  assert.equal((await handler(request())).status, 200);
  assert.equal(calls, 1);
});

test("rate limits use atomic increments and reject attempts above the limit", async () => {
  const upsert = db.rateLimit.upsert,
    cleanup = db.rateLimit.deleteMany;
  let count = 0;
  try {
    db.rateLimit.deleteMany = (async () => ({
      count: 0,
    })) as unknown as typeof cleanup;
    db.rateLimit.upsert = (async (args: {
      update: { count: { increment: number } };
    }) => {
      assert.equal(args.update.count.increment, 1);
      return { count: ++count };
    }) as unknown as typeof upsert;
    assert.equal(await consumeLimit("test", 2), true);
    assert.equal(await consumeLimit("test", 2), true);
    assert.equal(await consumeLimit("test", 2), false);
  } finally {
    db.rateLimit.upsert = upsert;
    db.rateLimit.deleteMany = cleanup;
  }
});
