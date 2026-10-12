import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { categoryImage, productImage } from "../lib/catalog-images";
import { technologyProducts, allCategories } from "../lib/technology-products";
import { secondhandProducts } from "../lib/secondhand-products";
import { products as digitalProducts } from "../lib/products";
test("every seeded product and category resolves to a local representative image", () => {
  for (const product of [
    ...technologyProducts,
    ...secondhandProducts,
    ...digitalProducts,
  ]) {
    const src = productImage(product);
    assert.ok(
      existsSync(join(process.cwd(), "public", src)),
      product.name + " -> " + src,
    );
    assert.ok(!src.endsWith("generic.svg"), product.name);
  }
  for (const category of allCategories)
    assert.ok(
      existsSync(join(process.cwd(), "public", categoryImage(category))),
      category,
    );
});
test("product types, platform brands and unknown products use appropriate images", () => {
  assert.match(
    productImage({
      name: "Soporte para portátil usado",
      category: "Tecnología usada",
    }),
    /stand.svg$/,
  );
  assert.match(
    productImage({ name: "Tenis retro usados", category: "Calzado usado" }),
    /sneakers.jpg$/,
  );
  assert.match(
    productImage({ name: "Combo Netflix + Prime Video", category: "Combos" }),
    /combos.svg$/,
  );
  assert.match(
    productImage({ name: "HBO Max Standard", category: "Streaming" }),
    /max.svg$/,
  );
  assert.match(
    productImage({ name: "IPTV", category: "Streaming" }),
    /streaming.svg$/,
  );
  assert.equal(
    productImage({ name: "Artículo nuevo", category: "Ropa usada" }),
    categoryImage("Ropa usada"),
  );
});
