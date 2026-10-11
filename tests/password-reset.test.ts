import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emailConfig,
  newResetToken,
  sendResetEmail,
  tokenHash,
} from "../lib/password-reset";

test("reset email uses configured origin and handles provider rejection", async () => {
  const saved = { ...process.env };
  const originalFetch = globalThis.fetch;
  try {
    delete process.env.RESEND_API_KEY;
    assert.throws(emailConfig);
    process.env.APP_URL = "https://goat.example";
    process.env.EMAIL_FROM = "Goat <access@goat.example>";
    process.env.RESEND_API_KEY = "test-key";
    const token = newResetToken();
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.notEqual(newResetToken(), token);
    assert.notEqual(tokenHash(token), token);
    globalThis.fetch = async (url, options) => {
      assert.equal(url, "https://api.resend.com/emails");
      const body = JSON.parse(String(options?.body));
      assert.deepEqual(body.to, ["user@example.com"]);
      assert.ok(
        body.text.includes(
          `https://goat.example/restablecer-contrasena?token=${token}`,
        ),
      );
      return new Response("{}", { status: 200 });
    };
    await sendResetEmail("user@example.com", token);
    globalThis.fetch = async () => new Response("{}", { status: 403 });
    await assert.rejects(sendResetEmail("user@example.com", token));
    process.env.APP_URL = "http://public.example";
    assert.throws(emailConfig);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of ["APP_URL", "RESEND_API_KEY", "EMAIL_FROM"]) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});
