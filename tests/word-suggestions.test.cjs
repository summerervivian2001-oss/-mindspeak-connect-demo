const test = require('node:test');
const assert = require('node:assert/strict');
const {suggestWords,completeWord,parseContext} = require('../word-suggestions.js');
const {RowColumnScan,ROWS} = require('../hybrid-input.js');

test('suggestions are local, deterministic and at most six distinct words',()=>{
  const a=suggestWords('');
  assert.deepEqual(a,['ICH','JA','NEIN','BITTE','DANKE','HALLO']);
  assert.deepEqual(suggestWords(''),a);
  assert.equal(new Set(a).size,a.length);
  assert.equal(suggestWords('MÖ')[0],'MÖCHTE');
  assert.ok(suggestWords('ICH M').includes('MÖCHTE'));
  assert.ok(suggestWords('ICH ').includes('BRAUCHE'));
  assert.ok(suggestWords('ZZZX').length===0);
  assert.deepEqual(suggestWords('',0),[]);
});
test('suggestion requires explicit choice and completes partial words',()=>{
  const suggestion=suggestWords('ICH MÖ')[0];
  assert.equal(suggestion,'MÖCHTE');
  const done=completeWord('ICH MÖ',suggestion,300);
  assert.equal(done.ok,true);
  assert.equal(done.text,'ICH MÖCHTE ');
  // A suggestion must never speak/send anything by itself.
  assert.deepEqual(Object.keys(done).sort(),['ok','reason','text']);
  assert.equal(completeWord('ICH B','MÖCHTE').ok,false);
  assert.equal(completeWord('ICH','ICH').ok,false);
});
test('length limits and unusual input cannot inject suggestions',()=>{
  assert.equal(completeWord('IC','ICH',2).reason,'max-length');
  assert.throws(()=>completeWord('','<img>'),RangeError);
  assert.throws(()=>suggestWords('ICH',7),RangeError);
  assert.throws(()=>parseContext(null),TypeError);
  assert.equal(completeWord('Ich möchte ', 'WASSER',300).text,'Ich möchte WASSER ');
});
test('seventh suggestion row is reachable and columns wrap independently',()=>{
  const suggestions=['ICH','JA','NEIN','BITTE','DANKE','HALLO'];
  const scan=new RowColumnScan([suggestions,...ROWS]);
  assert.equal(scan.rows.length,7);
  assert.deepEqual(scan.choose(),{kind:'row',row:0});
  scan.next();scan.next();
  assert.deepEqual(scan.choose(),{kind:'key',key:'NEIN'});
  for(let i=0;i<6;i++)scan.next();
  assert.equal(scan.index,6);
  assert.deepEqual(scan.choose(),{kind:'row',row:6});
  for(let i=0;i<6;i++)scan.next();
  assert.equal(scan.index,0);
  scan.next();scan.next();scan.next();
  assert.deepEqual(scan.choose(),{kind:'key',key:'⌫'});
});
