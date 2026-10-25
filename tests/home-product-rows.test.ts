import { test } from 'node:test';
import assert from 'node:assert/strict';
import { homeProductRows } from '../lib/home-product-rows';
const options = { tiendaEnabled: true, segundaEnabled: true };
const products = ['Streaming', 'Audio', 'Ropa usada', 'Cursos', 'Vasos', 'Camisetas'].flatMap(category => Array.from({length:12}, (_, index) => ({id:category + index, category, stock:0})));
test('home rows respect department limits with distinct products and retain sold-out cards', () => {
  const rows = homeProductRows(products, 'CLIENTE', options, []);
  assert.deepEqual(rows.map(row => row.title), ['Streaming','¡Personaliza a tu manera!','Tienda','Segunda','Cursos']);
  for (const row of rows) { assert.equal(row.products.length, row.id === 'personalizados' ? 20 : 10);assert.equal(new Set(row.products.map(p=>p.id)).size,row.products.length);assert.ok(row.products.every(product=>row.categories.includes(product.category))); }
  assert.ok(rows[0].products.every(product=>product.stock===0));
});
test('home respects disabled client departments and administrator ordering before taking ten', () => {
  assert.deepEqual(homeProductRows(products,'CLIENTE',{tiendaEnabled:false,segundaEnabled:false},[]).map(row=>row.id),['streaming','cursos']);
  assert.equal(homeProductRows(products,'ADMIN',{tiendaEnabled:false,segundaEnabled:false},[]).length,5);
  assert.equal(homeProductRows(products,'CLIENTE',options,['Streaming11'])[0].products[0].id,'Streaming11');
});
test('home does not duplicate or invent courses when only five exist', () => {
  const courses=Array.from({length:5},(_,index)=>({id:'course'+index,category:'Cursos'}));
  assert.equal(homeProductRows(courses,'CLIENTE',options,[]).find(row=>row.id==='cursos')?.products.length,5);
});

test('personalized row follows Streaming and alternates cups and shirts', () => {
  const rows = homeProductRows(products, 'CLIENTE', options, []);
  assert.equal(rows[1].id, 'personalizados');
  assert.deepEqual(rows[1].products.map(product => product.category), Array.from({length:20}, (_, index) => index % 2 ? 'Camisetas' : 'Vasos'));
  assert.equal(rows[1].href, '/store?personalizados=1');
});
