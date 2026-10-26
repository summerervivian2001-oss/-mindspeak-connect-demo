const test=require('node:test');
const assert=require('node:assert/strict');
const {ROWS,HybridComposer,RowColumnScan}=require('../hybrid-input.js');

test('keyboard rows are six-by-six with one spelling action',()=>{
  assert.equal(ROWS.length,6);
  assert.ok(ROWS.every(row=>row.length===6));
  assert.deepEqual(ROWS[5],[' ','.','?','⌫','Satz sprechen','Zurück']);
});
test('composer appends letters, accents and deletes one Unicode codepoint',()=>{
  const c=new HybridComposer();
  assert.equal(c.apply('Ä'),'changed');
  assert.equal(c.apply('ß'),'changed');
  assert.equal(c.text,'Äß');
  assert.equal(c.apply('⌫'),'changed');
  assert.equal(c.text,'Ä');
});
test('speaker is explicit, never triggered by letter or space',()=>{
  const c=new HybridComposer();
  assert.equal(c.apply('Satz sprechen'),'empty');
  assert.equal(c.apply('A'),'changed');
  assert.equal(c.apply(' '),'changed');
  assert.equal(c.apply('Satz sprechen'),'speak');
  assert.equal(c.text,'A ');
});
test('editor enforces length and cannot accept arbitrary control sequences',()=>{
  const c=new HybridComposer(2);
  c.setText('Ä🤝OK');
  assert.equal(c.text,'Ä🤝');
  assert.equal(c.apply('X'),'full');
  assert.throws(()=>c.apply('<script>'),RangeError);
  assert.equal(c.apply('⌫'),'changed');
  assert.equal(c.apply('B'),'changed');
  assert.equal(c.text,'ÄB');
});
test('row-column scan selects a row and then an exact letter',()=>{
  const sc=new RowColumnScan();
  assert.equal(sc.stage,'row');
  sc.next();sc.next();
  assert.deepEqual(sc.choose(),{kind:'row',row:2});
  assert.equal(sc.label(),'M');
  sc.next();sc.next();
  assert.deepEqual(sc.choose(),{kind:'key',key:'O'});
  assert.equal(sc.stage,'row');
});
test('back action returns from special-key row to row selection',()=>{
  const sc=new RowColumnScan();
  for(let i=0;i<5;i++)sc.next();
  assert.deepEqual(sc.choose(),{kind:'row',row:5});
  for(let i=0;i<5;i++)sc.next();
  assert.deepEqual(sc.choose(),{kind:'back'});
  assert.equal(sc.index,0);
  assert.equal(sc.stage,'row');
});
test('row and column wraps in finite cycle',()=>{
  const sc=new RowColumnScan();
  for(let i=0;i<12;i++)sc.next();
  assert.equal(sc.index,0);
  assert.throws(()=>new RowColumnScan([['A','B']]),TypeError);
});
