import { test } from "node:test";
import assert from "node:assert/strict";
import {
  technologyProducts,
  technologyCategories,
  digitalCategories,
} from "../lib/technology-products";
import { productSchema } from "../lib/product-schema";

test("technology catalog provides 50 distinct products valid for existing product management", () => {
  assert.equal(technologyProducts.length, 50);
  assert.equal(new Set(technologyProducts.map((p) => p.name)).size, 50);
  for (const category of technologyCategories.filter(category => !["Vasos", "Camisetas"].includes(category))) {
    assert.equal(
      technologyProducts.filter((p) => p.category === category).length,
      10,
    );
    assert.ok(
      !digitalCategories.includes(
        category as (typeof digitalCategories)[number],
      ),
    );
  }
  for (const product of technologyProducts) {
    assert.ok(productSchema.safeParse(product).success, product.name);
    assert.ok(product.description.length > 0);
    assert.ok(product.gradient.startsWith("linear-gradient("));
  }
});

import { categoryName, categoryAliases } from "../lib/category-names";
test("renamed store categories include existing products without changing other departments", () => {
  assert.equal(categoryName("Computadores"), "Tecnología");
  assert.equal(categoryName("Redes"), "Juguetes");
  assert.deepEqual(categoryAliases("Tecnología"), ["Tecnología", "Computadores"]);
  assert.deepEqual(categoryAliases("Juguetes"), ["Juguetes", "Redes"]);
  assert.equal(categoryName("Streaming"), "Streaming");
  assert.ok(technologyCategories.includes("Tecnología"));
  assert.ok(technologyCategories.includes("Juguetes"));
});
