'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../mindspeak-abc-benchmark-1.2.html'),'utf8');
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
  assert.equal(scripts.length,3);
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
  return {get,tick,press,chooseItem,document};
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
test('single-switch ABC scan crossover, three new sentences and six results',()=>{
  const {get,chooseItem}=bootstrap();
  function round(target,keys,condition,index){
    assert.equal(get('target').textContent,target);
    assert.match(get('progress').textContent,new RegExp('Durchgang '+index+' von 6'));
    assert.match(get('progress').textContent,new RegExp(condition==='shortcut'?'ABC-ABKÜRZUNGer Scan':'KOMBINIERTer Scan'));
    get('next').click();
    assert.equal(get('hud').hidden,false);
    for(const key of keys)chooseItem(key);
    assert.equal(get('hud').hidden,true,'Completed sentence should end automatically');
  }
  round('MEIN ARM KRIBBELT',[...'MEIN ARM KRIBBELT'],'combined',1);
  round('MEIN ARM KRIBBELT',['ABC →',...'MEIN ARM KRIBBELT'],'shortcut',2);
  round('ICH SEHE EINEN VOGEL',['ABC →',...'ICH SEHE EINEN VOGEL'],'shortcut',3);
  round('ICH SEHE EINEN VOGEL',[...'ICH SEHE EINEN VOGEL'],'combined',4);
  round('ICH WÜNSCHE FRISCHE LUFT',[...'ICH WÜNSCHE FRISCHE LUFT'],'combined',5);
  round('ICH WÜNSCHE FRISCHE LUFT',['ABC →',...'ICH WÜNSCHE FRISCHE LUFT'],'shortcut',6);
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

test('combined mode preserves suggestions and shows a scannable ABC shortcut',()=>{
 const {get}=bootstrap();
 get('next').click();
 assert.equal(get('matrix').children[0]._cells[0].textContent,'ABC →');
 assert.equal(get('matrix').children.length,7);
 get('cancel').click();
});
