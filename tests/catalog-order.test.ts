import { test } from "node:test";
import assert from "node:assert/strict";
import { moveCard, sortCards, readCardOrders } from "../lib/catalog-order";
test("card moves preserve other cards and support both directions", () => {
  assert.deepEqual(moveCard(["a", "hidden", "b", "c"], "c", "a", "before"), ["c", "a", "hidden", "b"]);
  assert.deepEqual(moveCard(["a", "b", "c"], "a", "b", "after"), ["b", "a", "c"]);
  assert.deepEqual(moveCard(["a", "b"], "a", "missing", "before"), ["a", "b"]);
});
test("saved order is applied consistently with new cards appended stably", () => {
  assert.deepEqual(sortCards(["a", "b", "new", "new2"], ["b", "a"], id => id), ["b", "a", "new", "new2"]);
  const orders = readCardOrders([{ kind: "categories", ids: ["Audio", 99, "Streaming"], version: 2 }]);
  assert.deepEqual(orders.categories, { ids: ["Audio", "Streaming"], version: 2 });
  assert.deepEqual(orders.products, { ids: [], version: 0 });
});
