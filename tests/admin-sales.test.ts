import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bogotaDay, salesFilters, salesWhere, salesQuery, csvCell, saleSelect } from '../lib/admin-sales';
test('sales dates use full Bogotá calendar days and reject invalid dates',()=>{
 assert.equal(bogotaDay('2026-10-24')?.toISOString(),'2026-10-24T05:00:00.000Z');
 assert.equal(bogotaDay('2026-02-30'),undefined);
 const where=salesWhere(salesFilters({desde:'2026-10-24',hasta:'2026-10-24'}));
 assert.equal(JSON.stringify(where).includes('2026-10-25T05:00:00.000Z'),true);
});
test('sales filters compose search, category and status without accepting unsafe values',()=>{
 const filters=salesFilters({q:['  cliente  ','ignored'],estado:'ENTREGADO',categoria:'Cursos',pagina:'3'});
 assert.equal(filters.q,'cliente');assert.equal((salesWhere(filters).AND as unknown[]).length,3);
 assert.deepEqual(salesFilters({estado:'CANCELADO',categoria:'not-a-category'}).status,'');
 assert.equal(salesFilters({q:'x'.repeat(200)}).q.length,100);
 assert.ok(salesQuery({q:'test@example.com',estado:'ENTREGADO',desde:'invalid'},2).includes('pagina=2'));
 assert.ok(!JSON.stringify(saleSelect).includes('receiptCipher'));
 assert.ok(!JSON.stringify(saleSelect).includes('passwordHash'));
});
test('CSV escapes quotes and neutralizes spreadsheet formulas from user data',()=>{
 assert.equal(csvCell('A "quoted" name'),'"A ""quoted"" name"');
 for(const value of ['=SUM(A1:A2)','+cmd','-cmd','@SUM(1)','  =1','\t=1'])assert.ok(csvCell(value).startsWith('"\''));
 assert.equal(csvCell('Cliente normal'),'"Cliente normal"');assert.equal(csvCell(12000),'"12000"');
});
