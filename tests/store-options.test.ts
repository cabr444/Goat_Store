import { test } from "node:test";
import assert from "node:assert/strict";
import { disabledClientCategories } from "../lib/store-settings";
test("department switches apply independently to clients and preserve admin/seller access", () => {
  assert.deepEqual(disabledClientCategories("CLIENTE", { tiendaEnabled: true, segundaEnabled: true }), []);
  const tienda = disabledClientCategories("CLIENTE", { tiendaEnabled: false, segundaEnabled: true });
  assert.ok(tienda.includes("Audio"));
  assert.ok(!tienda.includes("Streaming"));
  assert.ok(!tienda.includes("Tecnología usada"));
  const segunda = disabledClientCategories("CLIENTE", { tiendaEnabled: true, segundaEnabled: false });
  assert.ok(segunda.includes("Tecnología usada"));
  assert.ok(!segunda.includes("Audio"));
  for (const role of ["ADMIN", "VENDEDOR"]) assert.deepEqual(disabledClientCategories(role, { tiendaEnabled: false, segundaEnabled: false }), []);
});
