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

import { personalizedProducts } from "../lib/personalized-products";
test("personalized catalog has twenty editable products with distinct IDs and no invented stock", () => {
  assert.equal(personalizedProducts.length, 20);
  assert.equal(new Set(personalizedProducts.map(product => product.id)).size, 20);
  assert.equal(personalizedProducts.filter(product => product.category === "Vasos").length, 10);
  assert.equal(personalizedProducts.filter(product => product.category === "Camisetas").length, 10);
  for (const product of personalizedProducts) {
    assert.ok(productSchema.safeParse(product).success, product.name);
    assert.equal(product.stock, 0);
  }
});
