const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../mindspeak-test-0.8.html'),'utf8');

test('0.8 bundles entire tested interface with no external JS or remote suggestions',()=>{
  assert.match(html,/<title>MindSpeak Connect 0\.8/);
  assert.match(html,/id="suggestion-row"/);
  assert.match(html,/id="suggestion-wrap"/);
  assert.doesNotMatch(html,/<script\s+src=/i);
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  assert.equal(scripts.length,4);
  scripts.forEach((s,i)=>assert.doesNotThrow(()=>new vm.Script(s,{filename:'inline-'+i+'.js'})));
});
test('never speaks based on a suggested word alone',()=>{
  assert.match(html,/function insertSuggestedWord\(word\)/);
  assert.match(html,/composer\.setText\(answer\.text\);displayDraft\(\)/);
  const suggestionSection=html.split('function insertSuggestedWord(word)')[1].split('function displayDraft()')[0];
  assert.doesNotMatch(suggestionSection,/deliver\(|speechSynthesis\.speak/);
  assert.match(html,/result\.key==='Satz sprechen'/);
  assert.match(html,/id="speak-draft"/);
});
test('words are offered in the same two-stage scan and can be disabled',()=>{
  assert.match(html,/suggestionRowPresent&&keyboardScan\.stage==='key'&&keyboardScan\.row===0/);
  assert.match(html,/pickedSuggestion\?result\.key:null/);
  assert.match(html,/if\(pickedSuggestion\)insertSuggestedWord\(word\)/);
  assert.match(html,/keyboardScan=new RowColumnScan\(scanRows\)/);
  assert.match(html,/!autoContinueEnabled/);
  assert.match(html,/stopScan\('Scan beim App-Wechsel sicherheitshalber gestoppt/);
});
test('no medical claims, external messaging or P300 classification',()=>{
  assert.match(html,/kein EEG/i);
  assert.match(html,/keinen Notruf/i);
  assert.match(html,/Nur.*Wunsch eingefügt|nur auf Wunsch eingefügt/i);
  assert.doesNotMatch(html,/fetch\(|XMLHttpRequest\(|WebSocket\(/);
});
