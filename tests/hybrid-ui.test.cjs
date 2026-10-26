const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../mindspeak-test-0.7.1.html'),'utf8');

test('standalone 0.7.1 has no external scripts or EEG controls',()=>{
 assert.match(html,/<title>MindSpeak Connect 0\.7\.1/);
 assert.doesNotMatch(html,/<script\s+src=/i);
 assert.match(html,/kein EEG/i);
 assert.match(html,/keinen Notruf/i);
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 assert.equal(scripts.length,3);
 scripts.forEach((script,i)=>assert.doesNotThrow(()=>new vm.Script(script,{filename:'script-'+i+'.js'})));
});
test('scan optionally stays active after composing one letter, no implicit output',()=>{
 assert.match(html,/id="auto-continue" aria-pressed="true"/);
 assert.match(html,/autoContinueEnabled=true/);
 assert.match(html,/if\(result\.key==='Satz sprechen'\|\|!autoContinueEnabled\)/);
 assert.match(html,/handleKey\(result\.key\);\s*if\(timer===null\)return;\s*clearInterval\(timer\);\s*startTimer\(\);\s*render\(\);/);
 assert.match(html,/Nach einem Buchstaben läuft der Scan standardmäßig automatisch weiter, ohne selbst etwas auszuwählen oder zu sprechen/);
});
test('stopping for speech, hidden background and scan stop stay available',()=>{
 assert.match(html,/if\(result\.key==='Satz sprechen'\|\|!autoContinueEnabled\)\{\s*stopScan/);
 assert.match(html,/scanHud\.hidden=true/);
 assert.match(html,/document\.hidden&&timer!==null\)stopScan/);
 assert.match(html,/id="hud-stop"/);
});
