import { test } from "node:test";
import assert from "node:assert/strict";
import {
  secondhandProducts,
  secondhandCategories,
} from "../lib/secondhand-products";
import {
  technologyProducts,
  technologyCategories,
  digitalCategories,
} from "../lib/technology-products";
import { productSchema } from "../lib/product-schema";

test("secondhand catalog has 50 unique used items across technology, clothing and shoes", () => {
  assert.equal(secondhandProducts.length, 50);
  assert.equal(new Set(secondhandProducts.map((p) => p.name)).size, 50);
  assert.deepEqual(
    secondhandCategories.map(
      (c) => secondhandProducts.filter((p) => p.category === c).length,
    ),
    [20, 15, 15],
  );
  for (const product of secondhandProducts) {
    assert.ok(productSchema.safeParse(product).success, product.name);
    assert.ok(product.description.includes("Segunda mano"));
    assert.ok(product.description.includes("Buen estado"));
    assert.ok(
      !technologyCategories.some((c) => c === String(product.category)),
    );
    assert.ok(!digitalCategories.some((c) => c === String(product.category)));
  }
  assert.ok(
    !technologyProducts.some((p) =>
      secondhandCategories.some((c) => c === String(p.category)),
    ),
  );
});
