import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deliverySchema,encryptPrivate,decryptPrivate,receiptText} from '../lib/private-delivery';
import {publicProductSelect} from '../lib/catalog-dto';
import {productSchema} from '../lib/product-schema';
test('private delivery is encrypted, authenticated and snapshots preserve original fields',()=>{
 const saved=process.env.DELIVERY_SECRET;
 try{
  process.env.DELIVERY_SECRET='test-only-secret-not-for-production-123456789';
  const delivery=deliverySchema.parse({email:'test@example.com',password:'TestAccess',profile:'1',pin:'3311'});
  const receipt=receiptText(delivery,'Netflix x33 días','test-order',new Date('2026-10-11T12:00:00Z'),1,14000);
  assert.ok(receipt.includes('*👑 STREAMING LT👑*'));
  for(const field of ['test@example.com','TestAccess','Perfil: 1','Pin: 3311','test-order','Fecha de compra:','Prohibido cambiar correo','Gracias por tu compra'])assert.ok(receipt.includes(field));
  const cipher=encryptPrivate(receipt);
  assert.ok(!cipher.includes('TestAccess'));assert.ok(!cipher.includes('test@example.com'));
  assert.equal(decryptPrivate(cipher),receipt);assert.notEqual(encryptPrivate(receipt),cipher);
  const parts=cipher.split(':');parts[2]=Buffer.alloc(16).toString('base64');
  assert.throws(()=>decryptPrivate(parts.join(':')));
  delivery.password='ChangedAccess';assert.ok(decryptPrivate(cipher).includes('TestAccess'));assert.ok(!decryptPrivate(cipher).includes('ChangedAccess'));
 }finally{if(saved===undefined)delete process.env.DELIVERY_SECRET;else process.env.DELIVERY_SECRET=saved;}
});
test('catalog excludes private fields and stock accepts zero but rejects negative or fractional values',()=>{
 assert.ok(!('deliveryCipher' in publicProductSelect));
 const data={name:'Product test',category:'Streaming',price:10000,stock:0};
 assert.ok(productSchema.safeParse(data).success);
 assert.ok(!productSchema.safeParse({...data,stock:-1}).success);
 assert.ok(!productSchema.safeParse({...data,stock:1.5}).success);
 assert.ok(!deliverySchema.safeParse({email:'bad',password:'secret',profile:'1'}).success);
});

test('platform access accepts email or numeric ID while preserving numeric identifiers in receipts', () => {
  const delivery = deliverySchema.parse({email:' 00123456789 ',password:'NumericAccess',profile:'1',pin:'0012'});
  assert.equal(delivery.email,'00123456789');
  assert.ok(receiptText(delivery,'Prime Video','P1',new Date(),1,5000).includes('📧 Correo: 00123456789'));
  assert.ok(deliverySchema.safeParse({...delivery,email:'account@example.com'}).success);
  assert.ok(!deliverySchema.safeParse({...delivery,email:'123abc'}).success);
});
