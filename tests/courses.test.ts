import { test } from 'node:test';
import assert from 'node:assert/strict';
import { courseProducts } from '../lib/course-products';
import { allCategories, digitalCategories } from '../lib/technology-products';
import { productSchema } from '../lib/product-schema';
test('six editable sample courses stay visible without selling unavailable content or leaking into home', () => {
  assert.equal(courseProducts.length, 6);
  assert.equal(new Set(courseProducts.map(p => p.id)).size, 6);
  assert.ok(allCategories.includes('Cursos'));
  assert.ok(!digitalCategories.some(category => String(category) === 'Cursos'));
  for (const course of courseProducts) {
    assert.ok(productSchema.safeParse(course).success, course.name);
    assert.equal(course.stock, 0);
    assert.equal(course.active, true);
  }
});
