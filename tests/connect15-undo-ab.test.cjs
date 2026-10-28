'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../mindspeak-undo-ab-1.5.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
class El {
 constructor(){this.children=[];this.listeners=new Map();this.textContent='';this.hidden=false;this.className='';this.attrs={};
 this.classList={toggle(){},add(){},remove(){}};}
 appendChild(child){this.children.push(child);return child;}
 replaceChildren(...children){this.children=children;}
 addEventListener(event,fn){this.listeners.set(event,fn);}
 closest(){return null}
 click(){const fn=this.listeners.get('click');assert.ok(fn,'Missing click handler');fn({target:this,preventDefault(){}})}
}
function boot(){
 const els=new Map();
 for(const m of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)){
  const el=new El();el.hidden=/\shidden(?:[ >])/.test(m[0]);els.set(m[1],el);
 }
 const document={
  hidden:false,listeners:new Map(),body:new El(),
  getElementById(id){assert.ok(els.has(id),'unknown '+id);return els.get(id)},
  createElement(){return new El()},
  addEventListener(e,fn){this.listeners.set(e,fn)}
 };
 let clock=0;
 const ctx=vm.createContext({document,Element:El,performance:{now:()=>clock}});
 ctx.window=ctx;
 assert.equal(scripts.length,2);
 for(const [i,src] of scripts.entries())vm.runInContext(src,ctx,{filename:'script-'+i+'.js',timeout:5000});
 return {els,document,api:ctx.MindSpeakUndoAB,step:(sec=0.3)=>clock+=sec*1000};
}
function act(els,id){els.get(id).click();}
test('standalone app runs without EEG, network, speech or external script dependency',()=>{
 assert.doesNotMatch(html,/<script\s+src\s*=/i);
 assert.doesNotMatch(html,/\bfetch\s*\(|XMLHttpRequest|WebSocket|speechSynthesis|SpeechSynthesisUtterance/);
 const {els,api}=boot();
 assert.equal(api.PLAN.length,4);
 assert.equal(api.ROWS.length,8);
 assert.equal(els.get('pad').hidden,true);
 assert.match(els.get('progress').textContent,/Durchgang 1 von 4/);
});
test('1.4.2 old navigation from suggestions needs seven down arrows and OK',()=>{
 const {api}=boot();let ms=100;
 const t=new api.UndoTrial(api.PLAN[0],()=>ms);
 for(let i=0;i<7;i++)t.act('down');
 assert.equal(t.focused(),'↶ Rückgängig');
 assert.equal(t.text,'ICH ');
 ms=3400;assert.equal(t.act('ok'),true);
 assert.deepEqual({done:t.done,text:t.text,arrows:t.arrows,oks:t.oks}, {done:true,text:'',arrows:7,oks:1});
 assert.equal(t.seconds,3.3);
});
test('1.5 wrap navigation from suggestions reaches Undo by one up arrow',()=>{
 const {api}=boot();let ms=0;
 const t=new api.UndoTrial(api.PLAN[1],()=>ms);
 assert.equal(t.act('up'),false);
 assert.equal(t.focused(),'↶ Rückgängig');
 ms=1500;assert.equal(t.act('ok'),true);
 assert.equal(t.arrows,1);assert.equal(t.oks,1);assert.equal(t.seconds,1.5);
 assert.equal(t.text,'');
});
test('Undo typo needs six down arrows in old vs two up arrows in 1.5',()=>{
 const {api}=boot();
 for(const [idx,step,n] of [[2,'up',2],[3,'down',6]]){
  const t=new api.UndoTrial(api.PLAN[idx],()=>0);
  for(let i=0;i<n;i++)t.act(step);
  assert.equal(t.focused(),'↶ Rückgängig');
  assert.equal(t.act('ok'),true);
  assert.equal(t.arrows,n);
  assert.equal(t.text,'ICH ');
 }
});
test('horizontal wrap belongs to 1.5 only, never auto-selects',()=>{
 const {api}=boot();
 const old=new api.UndoTrial(api.PLAN[0],()=>0);
 const modern=new api.UndoTrial(api.PLAN[1],()=>0);
 old.act('left');modern.act('left');
 assert.equal(old.col,0);
 assert.equal(modern.col,5);
 assert.equal(old.text,'ICH ');assert.equal(modern.text,'ICH ');
 assert.equal(old.oks,0);assert.equal(modern.oks,0);
});
test('wrong OK logs a mistaken selection but makes no edits or speech',()=>{
 const {api}=boot();
 const t=new api.UndoTrial(api.PLAN[0],()=>0);
 assert.equal(t.act('ok'),false);
 assert.equal(t.done,false);assert.equal(t.mistakes,1);assert.equal(t.text,'ICH ');
 t.act('down');t.act('ok');
 assert.equal(t.mistakes,2);assert.equal(t.done,false);
});
test('completed trial ignores further arrows and OK and cannot edit text',()=>{
 const {api}=boot();const t=new api.UndoTrial(api.PLAN[1],()=>0);
 t.act('up');t.act('ok');
 const saved=t.summary();
 assert.equal(t.act('down'),false);
 assert.equal(t.act('ok'),false);
 assert.equal(t.text,'');
 assert.deepEqual(t.summary(),saved);
});
test('UI counts all four trials, stops automatically and shows grouped comparison',()=>{
 const {els,step}=boot();
 for(const [i,dir,count] of [[0,'down',7],[1,'up',1],[2,'up',2],[3,'down',6]]){
  assert.match(els.get('progress').textContent,new RegExp('Durchgang '+(i+1)+' von 4'));
  act(els,'start');
  assert.equal(els.get('pad').hidden,false);
  for(let n=0;n<count;n++){step(.1);act(els,dir);}
  step(.1);act(els,'ok');
  assert.equal(els.get('pad').hidden,true);
  assert.equal(els.get('draft').textContent,i===3?'Alle Fehler korrigiert':i===0?'ICH ':'ICH A');
 }
 assert.match(els.get('progress').textContent,/Alle vier/);
 assert.equal(els.get('results').children.length,4);
 assert.match(els.get('comparison').textContent,/1\.4\.2: /);
 assert.match(els.get('comparison').textContent,/1\.5: /);
 assert.match(els.get('comparison').textContent,/13 Pfeile/);
 assert.match(els.get('comparison').textContent,/3 Pfeile/);
});
test('incorrect OK in UI counts as error and does not advance plan',()=>{
 const {els}=boot();act(els,'start');
 act(els,'ok');
 assert.match(els.get('progress').textContent,/Durchgang 1 von 4/);
 for(let n=0;n<7;n++)act(els,'down');
 act(els,'ok');
 assert.match(els.get('results').children[0].textContent,/1 Fehlauswahlen/);
});
test('cancelled attempts are not saved and same condition is repeated',()=>{
 const {els}=boot();act(els,'start');act(els,'down');act(els,'cancel');
 assert.match(els.get('aborts').textContent,/1/);
 assert.match(els.get('progress').textContent,/Durchgang 1/);
 assert.match(els.get('results').children[0].textContent,/ausstehend/);
 act(els,'start');assert.equal(els.get('pad').hidden,false);
});
test('visibility change safely cancels a trial without fabricating a result',()=>{
 const {els,document}=boot();act(els,'start');
 document.hidden=true;document.listeners.get('visibilitychange')();
 assert.match(els.get('aborts').textContent,/1/);
 assert.equal(els.get('pad').hidden,true);
 assert.match(els.get('progress').textContent,/Durchgang 1/);
});
test('keyboard arrows and Enter use the same measured navigation actions',()=>{
 const {els,document}=boot();act(els,'start');
 let prevented=0;
 const key=(name)=>document.listeners.get('keydown')({
  key:name,target:new El(),repeat:false,ctrlKey:false,metaKey:false,altKey:false,
  preventDefault(){prevented++}
 });
 for(let i=0;i<7;i++)key('ArrowDown');
 key('Enter');
 assert.equal(prevented,8);
 assert.match(els.get('results').children[0].textContent,/7 Pfeildrucke · 1 OK/);
});
test('reset preserves an unfinished trial and clears only when idle',()=>{
 const {els}=boot();act(els,'start');
 act(els,'reset');assert.equal(els.get('pad').hidden,false);
 act(els,'cancel');act(els,'reset');
 assert.match(els.get('aborts').textContent,/0/);
 assert.match(els.get('results').children[0].textContent,/ausstehend/);
 assert.match(els.get('progress').textContent,/Durchgang 1/);
});
