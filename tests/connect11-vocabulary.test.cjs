'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../mindspeak-vocabulary-1.1.html'),'utf8');
class StubElement {
  constructor(){
    this.dataset={};this.hidden=false;this.disabled=false;this.value='';this.textContent='';this.children=[];
    this.listeners=new Map();this.classList={add(){},remove(){}};
  }
  appendChild(x){this.children.push(x);return x}
  replaceChildren(...items){this.children=items}
  addEventListener(k,f){this.listeners.set(k,f)}
  blur(){}
  closest(){return null}
  click(){const f=this.listeners.get('click');assert.equal(typeof f,'function','Missing event handler');f({target:this,preventDefault(){}});}
}
function bootstrap(){
  const nodes=new Map();
  for(const match of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)){
    const e=new StubElement();e.hidden=/\shidden(?:\s|>)/.test(match[0]);
    if(match[1]==='speed')e.value='1000';
    nodes.set(match[1],e);
  }
  const document={
    hidden:false,body:new StubElement(),
    getElementById(id){if(!nodes.has(id))throw Error('Missing '+id);return nodes.get(id)},
    createElement(){return new StubElement()},
    listeners:new Map(),
    addEventListener(k,f){this.listeners.set(k,f)}
  };
  let clock=0,callback=null;
  const ctx=vm.createContext({
    document,Element:StubElement,performance:{now:()=>clock},
    setInterval(fn){callback=fn;return 42},clearInterval(){callback=null}
  });
  ctx.window=ctx;
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
  assert.equal(scripts.length,4);
  scripts.forEach((s,i)=>vm.runInContext(s,ctx,{timeout:5000,filename:'script-'+i+'.js'}));
  const get=id=>nodes.get(id);
  function tick(){assert.equal(typeof callback,'function','Missing active timer');clock+=1000;callback();}
  function press(){clock+=250;get('choose').click()}
  function chooseItem(key){
    const label=key===' '?'␣':key;
    let position;
    for(const [rowIndex,row] of get('matrix').children.entries()){
      for(const [cellIndex,cell] of row._cells.entries()){
        if(cell.textContent===label){position=[rowIndex,cellIndex];break}
      }
      if(position)break;
    }
    assert.ok(position,'No key found for '+key);
    for(let i=0;i<position[0];i++)tick();
    press();
    for(let i=0;i<position[1];i++)tick();
    press();
  }
  return {get,tick,press,chooseItem,document,context:ctx};
}
test('standalone page starts and never fetches EEG, network or speech',()=>{
  assert.doesNotMatch(html,/<script\s+src=/i);
  assert.doesNotMatch(html,/\bfetch\(|XMLHttpRequest\(|WebSocket\(|speechSynthesis\./);
  const {get}=bootstrap();
  assert.match(get('progress').textContent,/Durchgang 1 von 6/);
  assert.equal(get('hud').hidden,true);
});
test('aborted attempt does not advance plan and counts a cancellation',()=>{
  const {get,chooseItem}=bootstrap();
  get('next').click();chooseItem('X');chooseItem('⌫');get('cancel').click();
  assert.match(get('progress').textContent,/Durchgang 1 von 6/);
  assert.match(get('aborts').textContent,/1/);
  assert.equal(get('next').disabled,false);
  assert.equal(get('hud').hidden,true);
});
test('old/new dictionary AB/BA/AB crossover, three new sentences and six results',()=>{
  const {get,chooseItem}=bootstrap();
  function round(target,keys,condition,index){
    assert.equal(get('target').textContent,target);
    assert.match(get('progress').textContent,new RegExp('Durchgang '+index+' von 6'));
    assert.match(get('progress').textContent,new RegExp(condition==='new'?'NEUES Wörterbuch':'ALTES Wörterbuch'));
    get('next').click();
    assert.equal(get('hud').hidden,false);
    for(const key of keys)chooseItem(key);
    assert.equal(get('hud').hidden,true,'Completed sentence should end automatically');
  }
  round('ICH BRAUCHE MEDIKAMENTE',[...'ICH BRAUCHE MEDIKAMENTE'],'old',1);
  round('ICH BRAUCHE MEDIKAMENTE',['ICH','BRAUCHE','MEDIKAMENTE'],'new',2);
  round('BITTE FENSTER ÖFFNEN',['BITTE','FENSTER','ÖFFNEN'],'new',3);
  round('BITTE FENSTER ÖFFNEN',[...'BITTE FENSTER ÖFFNEN'],'old',4);
  round('MEIN RÜCKEN JUCKT',[...'MEIN RÜCKEN JUCKT'],'old',5);
  round('MEIN RÜCKEN JUCKT',[...'MEIN RÜCKEN JUCKT'],'new',6);
  assert.match(get('progress').textContent,/Alle 6/);
  assert.equal(get('next').disabled,true);
  assert.match(get('compare').textContent,/3 von 3/);
  assert.equal(get('results').children.length,3);
  assert.match(get('results').children[2].children[1].textContent,/Bestätigungen/);
  assert.match(get('results').children[2].children[2].textContent,/Bestätigungen/);
  get('reset').click();
  assert.match(get('progress').textContent,/Durchgang 1 von 6/);
  assert.equal(get('speed').disabled,false);
});

test('new v1.1 terms exist only in expanded predictor; held-out symptom words stay unknown',()=>{
  const {context}=bootstrap();
  const old=context.MindSpeakSuggestions;
  const modern=context.MindSpeakSuggestionsV11;
  for(const word of ['MEDIKAMENTE','FENSTER','ÖFFNEN','TÜR']){
    assert.ok(modern.suggestWords(word.slice(0,Math.min(3,word.length-1))).includes(word),'new dictionary missing '+word);
    assert.ok(!old.suggestWords(word.slice(0,Math.min(3,word.length-1))).includes(word),'old dictionary unexpectedly knows '+word);
  }
  for(const word of ['RÜCKEN','JUCKT']){
    assert.ok(!modern.suggestWords(word.slice(0,3)).includes(word),'control word accidentally learned '+word);
  }
  assert.equal(modern.completeWord('ICH BRAUCHE MED','MEDIKAMENTE').text,'ICH BRAUCHE MEDIKAMENTE ');
  assert.throws(()=>modern.completeWord('','<img>'),RangeError);
});
test('new dictionary adds medically relevant suggestions without automatic commands',()=>{
  const {context}=bootstrap();
  const v11=context.MindSpeakSuggestionsV11;
  assert.ok(v11.suggestWords('ICH BRAUCHE ').includes('MEDIKAMENTE'));
  assert.ok(v11.suggestWords('BITTE ').includes('FENSTER'));
  assert.ok(v11.suggestWords('FENSTER ').includes('ÖFFNEN'));
  const outcome=v11.completeWord('BITTE FEN','FENSTER');
  assert.deepEqual([outcome.ok,outcome.text],[true,'BITTE FENSTER ']);
});
