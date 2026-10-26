'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../mindspeak-scan-benchmark-0.9.html'),'utf8');
class ElementMock{
  constructor(){this.dataset={};this.attrs={};this.hidden=false;this.disabled=false;this.value='';this.textContent='';this.children=[];this.handlers={};this.classList={add(){},remove(){}};}
  appendChild(el){this.children.push(el);return el}
  replaceChildren(...items){this.children=items}
  addEventListener(name,handler){this.handlers[name]=handler}
  setAttribute(name,value){this.attrs[name]=String(value)}
  getAttribute(name){return this.attrs[name]||null}
  closest(){return null}
  blur(){}
  click(){assert.equal(typeof this.handlers.click,'function','missing click listener');this.handlers.click({target:this})}
}
function boot(){
  const ids=new Map();
  for(const m of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)){
    const el=new ElementMock();el.hidden=/\shidden(?:\s|>)/.test(m[0]);el.value=(m[1]==='speed'?'1000':'');
    ids.set(m[1],el);
  }
  let now=0,scheduled=null,events={};
  const document={hidden:false,getElementById:id=>{if(!ids.has(id))throw Error('missing '+id);return ids.get(id)},createElement:()=>new ElementMock(),addEventListener:(n,f)=>{events[n]=f},body:new ElementMock()};
  const context=vm.createContext({document,Element:ElementMock,performance:{now:()=>now},setInterval(fn){scheduled=fn;return 123},clearInterval(){scheduled=null}});
  context.window=context;
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  assert.equal(scripts.length,3);
  scripts.forEach((src,i)=>vm.runInContext(src,context,{timeout:5000,filename:'embedded-'+i+'.js'}));
  function tick(){assert.equal(typeof scheduled,'function','scan timer missing');now+=1000;scheduled()}
  function press(){now+=350;ids.get('choose').click()}
  function chooseVisible(char){
    const rows=ids.get('matrix').children;
    let desired=null;
    for(let r=0;r<rows.length;r++){
      for(let c=0;c<rows[r]._cells.length;c++){
        const x=rows[r]._cells[c].textContent;
        if(x===(char===' '?'␣':char)){desired=[r,c];break}
      }
      if(desired)break;
    }
    assert.ok(desired,'no scan item '+char);
    for(let i=0;i<desired[0];i++)tick();
    press(); // row
    for(let i=0;i<desired[1];i++)tick();
    press(); // column
  }
  return {ids,document,tick,press,chooseVisible,setTime(n){now=n},now:()=>now,events};
}
test('loads with no external dependencies and never calls a speech/network API',()=>{
  assert.doesNotMatch(html,/<script\s+src=/i);
  assert.doesNotMatch(html,/\bfetch\(|XMLHttpRequest\(|WebSocket\(|speechSynthesis\./);
  const {ids}=boot();
  assert.equal(ids.get('hud').hidden,true);
  assert.equal(ids.get('time-no').textContent,'');
});
test('without-word condition uses six rows and can cancel without a measurement',()=>{
  const t=boot();const {ids}=t;
  ids.get('no').click();
  assert.equal(ids.get('hud').hidden,false);
  assert.equal(ids.get('matrix').children.length,6);
  t.chooseVisible('A');
  assert.equal(ids.get('text').textContent,'A');
  ids.get('cancel').click();
  assert.equal(ids.get('hud').hidden,true);
  assert.equal(ids.get('no').disabled,false);
  assert.equal(ids.get('actions-no').textContent,'');
});
test('prediction condition offers whole words and finishes exact sentence without speech',()=>{
  const t=boot(),{ids}=t;
  ids.get('yes').click();
  assert.equal(ids.get('matrix').children.length,7);
  t.chooseVisible('ICH');
  assert.equal(ids.get('text').textContent,'ICH ');
  t.chooseVisible('BRAUCHE');
  assert.equal(ids.get('text').textContent,'ICH BRAUCHE ');
  t.chooseVisible('WASSER');
  assert.equal(ids.get('text').textContent,'ICH BRAUCHE WASSER ');
  assert.equal(ids.get('hud').hidden,true);
  assert.match(ids.get('time-yes').textContent,/\d+,\d s/);
  assert.equal(ids.get('yes').disabled,true);
});
test('both complete scan-only tests share the same timing and compute a comparison',()=>{
  const t=boot(),{ids}=t;
  ids.get('no').click();
  for(const char of 'ICH BRAUCHE WASSER')t.chooseVisible(char);
  assert.equal(ids.get('hud').hidden,true);
  assert.match(ids.get('time-no').textContent,/\d+,\d s/);
  assert.equal(ids.get('speed').disabled,true);
  ids.get('yes').click();
  ['ICH','BRAUCHE','WASSER'].forEach(x=>t.chooseVisible(x));
  assert.equal(ids.get('hud').hidden,true);
  assert.match(ids.get('compare').textContent,/schneller|langsamer|gleich schnell/);
  assert.match(ids.get('actions-no').textContent,/Auswahlbestätigungen/);
  assert.match(ids.get('actions-yes').textContent,/Auswahlbestätigungen/);
  ids.get('reset').click();
  assert.equal(ids.get('time-no').textContent,'Offen');
  assert.equal(ids.get('no').disabled,false);
  assert.equal(ids.get('speed').disabled,false);
});
