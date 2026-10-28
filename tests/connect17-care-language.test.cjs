const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname,'../mindspeak-connect-1.7.html'), 'utf8');

class StubElement {
  constructor() {
    this.listeners = new Map();
    this.attrs = {};
    this.dataset = {};
    this.children = [];
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.textContent = '';
    this.style = {};
    this.scrollCalls=[];
    this.classList = { add() {}, remove() {}, toggle() {} };
  }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  getAttribute(name) { return this.attrs[name] || null; }
  addEventListener(name, handler) { this.listeners.set(name, handler); }
  append(...items) { this.children.push(...items); }
  appendChild(item) { this.children.push(item); return item; }
  scrollIntoView(options){this.scrollCalls.push(options);}
  blur() {}
  closest() { return null; }
  click() {
    const fn = this.listeners.get('click');
    assert.equal(typeof fn, 'function', 'Button needs an installed click handler');
    fn({target: this, preventDefault() {}});
  }
}

function boot(options={}) {
  const ids = new Map();
  for (const match of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const element = new StubElement();
    element.hidden = /\shidden(?:\s|>)/.test(match[0]);
    ids.set(match[1], element);
  }
  const doc = {
    getElementById(id) {
      if (!ids.has(id)) throw new Error('Unknown DOM id: ' + id);
      return ids.get(id);
    },
    createElement() { return new StubElement(); },
    listeners:new Map(),
    addEventListener(name,callback) { this.listeners.set(name,callback); },
    body: new StubElement(),
    hidden: false
  };
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(m => m[1]);
  assert.equal(scripts.length, 4);
  let clock = 0;
  let callback = null;
  const context = vm.createContext({
    document: doc,
    Element: StubElement,
    performance: { now: () => clock },
    setInterval(fn) { callback = fn; return 42; },
    clearInterval() { callback = null; },
    addEventListener() {},
    CustomEvent: class { constructor(type, init) { this.type=type;this.detail=init.detail; } },
    dispatchEvent() {}
  });
  context.window = context;
  // Unlike syntax-only compilation, running top-level script catches
  // temporal-dead-zone variables referenced before initialization.
  scripts.forEach((source, index) => {
    vm.runInContext(source, context, { filename: 'browser-script-'+index+'.js', timeout: 5000 });
  });
  // Preserve prior 1.5.2 conditions for existing 37 regression tests;
  // the newly added tests explicitly cover the default-on experimental mode.
  if(options.disableSuggestionFocus!==false){
    ids.get('auto-suggest-focus').checked=false;
    ids.get('auto-suggest-focus').listeners.get('change')();
  }
  return { ids, doc, step: () => { assert.ok(callback); clock += 2000; callback(); } };
}

test('real script initialization binds the free-writing button without ReferenceError', () => {
  const {ids} = boot();
  const button = ids.get('mode-write');
  button.click();
  assert.equal(ids.get('quick-view').hidden, true);
  assert.equal(ids.get('write-view').hidden, false);
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.equal(ids.get('suggestion-row').children.length, 6);
});

test('the new vocabulary offers medication and can insert it without speech', () => {
  const {ids} = boot();
  ids.get('mode-write').click();
  const draft=ids.get('draft');
  draft.value='ICH BRAUCHE MED';
  draft.listeners.get('input')();
  const choices=ids.get('suggestion-row').children;
  const button=choices.find(b=>b.textContent==='MEDIKAMENTE');
  assert.ok(button,'The extended v1.1 dictionary must offer MEDIKAMENTE');
  assert.equal(ids.get('last-message').textContent,'');
  button.click();
  assert.equal(draft.value,'ICH BRAUCHE MEDIKAMENTE ');
  assert.equal(ids.get('last-message').textContent,'');
});

test('one-switch word scan accepts MEDIKAMENTE in the expanded dictionary',()=>{
  const {ids}=boot();
  ids.get('mode-write').click();
  const input=ids.get('draft');
  input.value='ICH BRAUCHE MED';
  input.listeners.get('input')();
  const wordScan=ids.get('word-scan-toggle');
  assert.equal(wordScan.disabled,false);
  wordScan.click();
  assert.equal(ids.get('scan-current').textContent,'MEDIKAMENTE');
  ids.get('hud-choose').click();
  assert.equal(input.value,'ICH BRAUCHE MEDIKAMENTE ');
  assert.equal(ids.get('scan-hud').hidden,false);
  assert.equal(ids.get('last-message').textContent,'');
  ids.get('hud-stop').click();
  assert.equal(ids.get('scan-hud').hidden,true);
});


test('dedicated one-switch word scan visibly selects a suggested whole word', () => {
  const {ids,step}=boot();
  ids.get('mode-write').click();
  ids.get('draft').value='ICH M';
  ids.get('draft').listeners.get('input')();
  assert.equal(ids.get('suggestion-row').children[0].textContent,'MÖCHTE');
  const wordScan=ids.get('word-scan-toggle');
  assert.equal(wordScan.disabled,false);
  wordScan.click();
  assert.equal(ids.get('scan-hud').hidden,false);
  assert.equal(ids.get('scan-phase').textContent,'Wortvorschläge – nächstes Wort wählen');
  assert.equal(ids.get('scan-current').textContent,'MÖCHTE');
  assert.equal(ids.get('suggestion-row').children[0].dataset.active,'true');
  ids.get('hud-choose').click();
  assert.equal(ids.get('draft').value,'ICH MÖCHTE ');
  assert.equal(ids.get('scan-hud').hidden,false,'word scan auto-continues');
  assert.equal(ids.get('last-message').textContent,'','must not speak unrequested');
  assert.equal(ids.get('scan-current').textContent,'BITTE');
  step();
  assert.equal(ids.get('scan-current').textContent,'WASSER');
  ids.get('hud-stop').click();
  assert.equal(ids.get('scan-hud').hidden,true);
});
test('word scan cannot start if a prefix has no suggestions', () => {
  const {ids}=boot();
  ids.get('mode-write').click();
  ids.get('draft').value='ZZZZ';
  ids.get('draft').listeners.get('input')();
  assert.equal(ids.get('suggestion-wrap').hidden,true);
  assert.equal(ids.get('word-scan-toggle').disabled,true);
  ids.get('word-scan-toggle').click();
  assert.equal(ids.get('scan-hud').hidden,true);
});


test('one-switch skip switches from proposed words to six pure keyboard rows without sending text',()=>{
 const {ids,step}=boot();
 ids.get('mode-write').click();
 ids.get('draft').value='MEIN R';
 ids.get('draft').listeners.get('input')();
 ids.get('scan-toggle').click();
 assert.equal(ids.get('scan-phase').textContent,'Schreiben – Vorschläge oder Buchstabenreihe wählen');
 assert.equal(ids.get('scan-current').textContent.startsWith('Reihe 1: ABC →'),true);
 ids.get('hud-choose').click(); // choose suggestions row
 assert.equal(ids.get('scan-current').textContent,'ABC →');
 ids.get('hud-choose').click(); // choose ABC shortcut
 assert.equal(ids.get('scan-hud').hidden,false,'switch must not stop the scan');
 assert.equal(ids.get('scan-phase').textContent,'Schreiben – nur Buchstabenreihen');
 assert.equal(ids.get('scan-current').textContent,'Reihe 1: A · B · C · D · E · F');
 assert.equal(ids.get('draft').value,'MEIN R','switch does not alter text');
 assert.equal(ids.get('last-message').textContent,'','switch does not speak');
 assert.equal(ids.get('letter-scan-toggle').getAttribute('aria-pressed'),'true');
 assert.equal(ids.get('suggestion-row').dataset.active,'false');
 ids.get('hud-choose').click(); // row A..F
 ids.get('hud-choose').click(); // A
 assert.equal(ids.get('draft').value,'MEIN RA','letters remain writable');
 assert.equal(ids.get('scan-hud').hidden,false);
 ids.get('hud-stop').click();
});
test('restoring suggestions works with only one selection button via last keyboard key',()=>{
 const {ids,step}=boot();
 ids.get('mode-write').click();
 ids.get('scan-toggle').click();
 ids.get('hud-choose').click(); // first row
 ids.get('hud-choose').click(); // ABC
 // 6 letter rows, six ticks to last row (0..5)
 for(let i=0;i<5;i++)step();
 assert.equal(ids.get('scan-current').textContent.startsWith('Reihe 6:'),true);
 ids.get('hud-choose').click(); // choose 6th row
 for(let i=0;i<5;i++)step(); // sixth key
 assert.equal(ids.get('scan-current').textContent,'Wörter an');
 ids.get('hud-choose').click(); // restore word suggestions
 assert.equal(ids.get('letter-scan-toggle').getAttribute('aria-pressed'),'false');
 assert.equal(ids.get('scan-current').textContent.startsWith('Reihe 1: ABC →'),true);
 assert.equal(ids.get('draft').value,'');
 assert.equal(ids.get('last-message').textContent,'');
 assert.equal(ids.get('scan-hud').hidden,false);
 ids.get('hud-stop').click();
});
test('touch shortcut starts pure-letter scanning without a word or accidental speech',()=>{
 const {ids}=boot();
 ids.get('mode-write').click();
 ids.get('letter-scan-toggle').click();
 assert.equal(ids.get('scan-hud').hidden,false);
 assert.equal(ids.get('scan-current').textContent,'Reihe 1: A · B · C · D · E · F');
 assert.equal(ids.get('draft').value,'');
 assert.equal(ids.get('last-message').textContent,'');
 ids.get('letter-scan-toggle').click();
 assert.equal(ids.get('scan-hud').hidden,false);
 assert.equal(ids.get('scan-current').textContent.startsWith('Reihe 1: ABC →'),true);
 ids.get('hud-stop').click();
});
test('dedicated word-only scan still offers all six words without skip entry',()=>{
 const {ids}=boot();
 ids.get('mode-write').click();
 ids.get('draft').value='ICH BRAUCHE MED';
 ids.get('draft').listeners.get('input')();
 ids.get('word-scan-toggle').click();
 assert.equal(ids.get('scan-current').textContent,'MEDIKAMENTE');
 assert.equal(ids.get('suggestion-row').children[0].textContent,'MEDIKAMENTE');
 ids.get('hud-choose').click();
 assert.equal(ids.get('draft').value,'ICH BRAUCHE MEDIKAMENTE ');
 assert.equal(ids.get('last-message').textContent,'');
});


test('whole-word addition is reversible by selecting Undo through the same one-switch scan',()=>{
 const {ids,step}=boot();
 ids.get('mode-write').click();
 const draft=ids.get('draft');
 draft.value='ICH M';
 draft.listeners.get('input')();
 const suggestion=ids.get('suggestion-row').children.find(b=>b.textContent==='MÖCHTE');
 assert.ok(suggestion);
 suggestion.click();
 assert.equal(draft.value,'ICH MÖCHTE ');
 assert.equal(ids.get('undo-draft').disabled,false);
 ids.get('scan-toggle').click();
 // Suggestions + 6 letter rows + last correction/action row.
 for(let i=0;i<7;i++)step();
 assert.ok(ids.get('scan-current').textContent.startsWith('Reihe 8:'),'Action row should be reachable');
 ids.get('hud-choose').click(); // action row
 assert.equal(ids.get('scan-current').textContent,'↶ Rückgängig');
 ids.get('hud-choose').click(); // Undo
 assert.equal(draft.value,'ICH M','Undo restores entire word completion');
 assert.equal(ids.get('last-message').textContent,'','Undo never speaks');
 assert.equal(ids.get('scan-hud').hidden,false,'One-switch scanning must continue');
 ids.get('hud-stop').click();
});
test('multiple edits can be undone without changing letters automatically',()=>{
 const {ids}=boot();
 ids.get('mode-write').click();
 const row=ids.get('keyboard').children[0].children;
 row[0].click();row[1].click();
 assert.equal(ids.get('draft').value,'AB');
 ids.get('undo-draft').click();
 assert.equal(ids.get('draft').value,'A');
 ids.get('undo-draft').click();
 assert.equal(ids.get('draft').value,'');
 assert.equal(ids.get('undo-draft').disabled,true);
 assert.equal(ids.get('last-message').textContent,'');
});
test('extra control row lets single switch change letters or restore words',()=>{
 const {ids,step}=boot();
 ids.get('mode-write').click();
 ids.get('scan-toggle').click();
 for(let i=0;i<7;i++)step(); // control row #8, proposals available
 ids.get('hud-choose').click();
 step();step(); // control cell #3, "Nur ABC"
 assert.equal(ids.get('scan-current').textContent,'Nur ABC');
 ids.get('hud-choose').click();
 assert.equal(ids.get('letter-scan-toggle').getAttribute('aria-pressed'),'true');
 assert.equal(ids.get('scan-hud').hidden,false);
 assert.equal(ids.get('last-message').textContent,'');
 ids.get('hud-stop').click();
});
test('direct typing starts a new undo chain and cannot restore stale draft content',()=>{
 const {ids}=boot();
 ids.get('mode-write').click();
 ids.get('keyboard').children[0].children[0].click();
 assert.equal(ids.get('undo-draft').disabled,false);
 ids.get('draft').value='ANDERER TEXT';
 ids.get('draft').listeners.get('input')();
 assert.equal(ids.get('undo-draft').disabled,true);
 assert.equal(ids.get('draft').value,'ANDERER TEXT');
});


test('1.4 joystick is opt-in, movement alone cannot activate a quick phrase',()=>{
 const {ids}=boot();
 assert.equal(ids.get('joystick-demo').hidden,true);
 ids.get('input-method').value='joystick';
 ids.get('input-method').listeners.get('change')();
 assert.equal(ids.get('joystick-demo').hidden,false);
 assert.match(ids.get('joystick-current').textContent,/Ja/);
 ids.get('joy-right').click();
 assert.match(ids.get('joystick-current').textContent,/Nein/);
 assert.equal(ids.get('last-message').textContent,'');
 ids.get('joy-confirm').click();
 assert.equal(ids.get('last-message').textContent,'Nein');
});
test('1.4 joystick uses same suggestion, letter, and Undo code paths',()=>{
 const {ids}=boot();
 ids.get('mode-write').click();
 ids.get('input-method').value='joystick';
 ids.get('input-method').listeners.get('change')();
 assert.match(ids.get('joystick-current').textContent,/ICH/);
 ids.get('joy-confirm').click(); // consciously choose ICH
 assert.equal(ids.get('draft').value,'ICH ');
 ids.get('joy-down').click(); // keyboard row A-F
 ids.get('joy-right').click();ids.get('joy-right').click();
 assert.match(ids.get('joystick-current').textContent,/C/);
 assert.equal(ids.get('draft').value,'ICH ');
 ids.get('joy-confirm').click();
 assert.equal(ids.get('draft').value,'ICH C');
 // Navigate to the action row while remaining agnostic about suggestion-row
 // visibility and wrap-around; no navigation click edits text or speaks.
 const actions=ids.get('control-row').children;
 for(let i=0;i<10&&!actions.some(x=>x.dataset.navActive==='true');i++)ids.get('joy-up').click();
 assert.ok(actions.some(x=>x.dataset.navActive==='true'),'Action row reachable');
 for(let i=0;i<6&&actions[0].dataset.navActive!=='true';i++)ids.get('joy-left').click();
 assert.equal(actions[0].dataset.navActive,'true','Undo reachable by joystick');
 ids.get('joy-confirm').click();
 assert.equal(ids.get('draft').value,'ICH ');
 assert.equal(ids.get('last-message').textContent,'');
});
test('1.4 joystick keyboard arrow keys and Enter work without external hardware',()=>{
 const {ids,doc}=boot();
 ids.get('input-method').value='joystick';
 ids.get('input-method').listeners.get('change')();
 const onKey=doc.listeners.get('keydown');
 assert.equal(typeof onKey,'function');
 let prevented=0;
 const event=(key)=>({key,code:key,repeat:false,altKey:false,ctrlKey:false,metaKey:false,target:new StubElement(),preventDefault(){prevented++}});
 onKey(event('ArrowDown'));
 assert.match(ids.get('joystick-current').textContent,/Bitte helfen/);
 assert.equal(ids.get('last-message').textContent,'');
 onKey(event('Enter'));
 assert.equal(ids.get('last-message').textContent,'Bitte helfen');
 assert.equal(prevented,2);
});
test('1.4 changing from scan to joystick safely stops timed scanning; touch remains available',()=>{
 const {ids}=boot();
 ids.get('mode-write').click();
 ids.get('scan-toggle').click();
 assert.equal(ids.get('scan-hud').hidden,false);
 ids.get('input-method').value='joystick';
 ids.get('input-method').listeners.get('change')();
 assert.equal(ids.get('scan-hud').hidden,true);
 assert.equal(ids.get('joystick-demo').hidden,false);
 ids.get('input-method').value='touch';
 ids.get('input-method').listeners.get('change')();
 assert.equal(ids.get('joystick-demo').hidden,true);
 ids.get('scan-toggle').click();
 assert.equal(ids.get('scan-hud').hidden,true);
 ids.get('keyboard').children[0].children[0].click();
 assert.equal(ids.get('draft').value,'A');
 assert.equal(ids.get('last-message').textContent,'');
});

test('1.4.1 joystick is visually docked and keeps page space below the keyboard',()=>{
 assert.match(html,/#joystick-demo:not\(\[hidden\]\)\{position:fixed/);
 assert.match(html,/body\.joystick-active \.wrap\{padding-bottom:235px\}/);
 assert.match(html,/bottom:max\(8px,env\(safe-area-inset-bottom\)\)/);
});
test('1.4.1 selected quick phrase follows navigation without speaking before OK',()=>{
 const {ids}=boot();
 const phrases=ids.get('phrases').children;
 ids.get('input-method').value='joystick';
 ids.get('input-method').listeners.get('change')();
 assert.ok(phrases[0].scrollCalls.length>0,'initial selected phrase brought into view');
 ids.get('joy-right').click();
 assert.ok(phrases[1].scrollCalls.length>0,'selected Nein brought into view');
 assert.equal(phrases[1].scrollCalls.at(-1).block,'center');
 assert.equal(ids.get('last-message').textContent,'');
 ids.get('joy-confirm').click();
 assert.equal(ids.get('last-message').textContent,'Nein');
});
test('1.4.1 highlights and follows the active keyboard key in joystick writing mode',()=>{
 const {ids}=boot();
 ids.get('mode-write').click();
 ids.get('input-method').value='joystick';
 ids.get('input-method').listeners.get('change')();
 const suggestions=ids.get('suggestion-row').children;
 assert.ok(suggestions[0].scrollCalls.length>0);
 ids.get('joy-down').click();
 const keyA=ids.get('keyboard').children[0].children[0];
 assert.ok(keyA.scrollCalls.length>0,'keyboard selection must auto-reveal');
 assert.equal(keyA.dataset.navActive,'true');
 assert.equal(ids.get('draft').value,'');
 ids.get('joy-confirm').click();
 assert.equal(ids.get('draft').value,'A');
 assert.equal(ids.get('last-message').textContent,'');
});
test('1.4.1 leaving joystick does not auto-scroll or auto-select letters',()=>{
 const {ids}=boot();
 ids.get('mode-write').click();
 ids.get('input-method').value='joystick';
 ids.get('input-method').listeners.get('change')();
 const keyA=ids.get('keyboard').children[0].children[0];
 ids.get('joy-down').click();
 const callCount=keyA.scrollCalls.length;
 ids.get('input-method').value='touch';
 ids.get('input-method').listeners.get('change')();
 ids.get('joy-right').click(); // no effect outside joystick mode
 assert.equal(keyA.scrollCalls.length,callCount);
 assert.equal(ids.get('joystick-demo').hidden,true);
 assert.equal(ids.get('draft').value,'');
});


test('1.4.2 mobile controls fit a smaller pad but remain at least 44px tall',()=>{
 assert.match(html,/width:min\(350px,calc\(100% - 24px\)\)/);
 assert.match(html,/#joystick-demo \.joy-pad\{max-width:270px/);
 assert.match(html,/#joystick-demo \.joy-pad \.btn\{min-height:44px/);
 assert.doesNotMatch(html,/min-height:37px/);
 assert.match(html,/@media\(max-height:540px\)\{#joystick-demo \.joy-pad \.btn\{min-height:44px/);
});
test('1.4.2 compact pad still navigates letters and preserves undo',()=>{
 const {ids}=boot();
 ids.get('mode-write').click();
 ids.get('input-method').value='joystick';
 ids.get('input-method').listeners.get('change')();
 ids.get('joy-confirm').click(); // inserts ICH from suggestion
 assert.equal(ids.get('draft').value,'ICH ');
 ids.get('joy-down').click(); // move to A-F
 ids.get('joy-confirm').click(); // insert A
 assert.equal(ids.get('draft').value,'ICH A');
 // Last row is the action row. Undo must be available through the smaller pad.
 for(let i=0;i<6;i++)ids.get('joy-down').click();
 assert.match(ids.get('joystick-current').textContent,/Rückgängig/);
 ids.get('joy-confirm').click();
 assert.equal(ids.get('draft').value,'ICH ');
 assert.equal(ids.get('last-message').textContent,'');
});


test('1.5 wraps first suggestions up directly to last action row and back',()=>{
 const {ids}=boot();
 ids.get('mode-write').click();
 ids.get('input-method').value='joystick';ids.get('input-method').listeners.get('change')();
 assert.match(ids.get('joystick-current').textContent,/ICH/);
 ids.get('joy-up').click();
 // Undo is disabled while empty; navigation skips it and offers Delete instead.
 assert.match(ids.get('joystick-current').textContent,/⌫/);
 assert.equal(ids.get('draft').value,'');
 assert.equal(ids.get('last-message').textContent,'');
 ids.get('joy-down').click();
 // Column follows the nearest enabled action (index 1), so returning lands on JA.
 assert.match(ids.get('joystick-current').textContent,/JA/);
});
test('1.5 wraps each horizontal row end while skipping disabled suggestions',()=>{
 const {ids}=boot();
 ids.get('mode-write').click();
 ids.get('input-method').value='joystick';ids.get('input-method').listeners.get('change')();
 ids.get('joy-left').click();
 assert.match(ids.get('joystick-current').textContent,/HALLO/); // last available suggestion
 assert.equal(ids.get('draft').value,'');
 ids.get('joy-right').click();
 assert.match(ids.get('joystick-current').textContent,/ICH/);
 ids.get('joy-down').click(); // A-F
 ids.get('joy-left').click(); // A wraps to F
 assert.match(ids.get('joystick-current').textContent,/F/);
 ids.get('joy-right').click(); // F wraps to A
 assert.match(ids.get('joystick-current').textContent,/A/);
 assert.equal(ids.get('last-message').textContent,'');
});
test('1.5 allows one-up corrections on the compact joystick without accidental text or speech',()=>{
 const {ids}=boot();
 ids.get('mode-write').click();
 ids.get('input-method').value='joystick';ids.get('input-method').listeners.get('change')();
 ids.get('joy-confirm').click(); // add ICH
 assert.equal(ids.get('draft').value,'ICH ');
 ids.get('joy-up').click(); // wraps to actions
 assert.match(ids.get('joystick-current').textContent,/Rückgängig/);
 assert.equal(ids.get('draft').value,'ICH ');
 ids.get('joy-confirm').click();
 assert.equal(ids.get('draft').value,'');
 assert.equal(ids.get('last-message').textContent,'');
 ids.get('joy-down').click(); // suggestions again, nearest enabled column
 assert.match(ids.get('joystick-current').textContent,/JA/);
 assert.equal(ids.get('joystick-demo').hidden,false);
});
test('1.5 quick phrase vertical wrapping does not speak until OK',()=>{
 const {ids}=boot();
 ids.get('input-method').value='joystick';ids.get('input-method').listeners.get('change')();
 ids.get('joy-up').click();
 assert.match(ids.get('joystick-current').textContent,/Bitte frag mich, bevor du mich berührst/);
 assert.equal(ids.get('last-message').textContent,'');
 ids.get('joy-down').click();
 assert.match(ids.get('joystick-current').textContent,/Ja/);
 assert.equal(ids.get('last-message').textContent,'');
});


test('1.5.1 does not advertise Undo in quick mode or when undo history is empty',()=>{
 const {ids}=boot();
 ids.get('input-method').value='joystick';ids.get('input-method').listeners.get('change')();
 const up=ids.get('joy-up');
 assert.equal(up.textContent,'↑');
 assert.equal(up.dataset.shortcut,'false');
 ids.get('mode-write').click();
 assert.equal(up.textContent,'↑');
 assert.equal(up.dataset.shortcut,'false');
 assert.equal(ids.get('draft').value,'');
});
test('1.5.1 contextual cue offers one Up to Undo only after a real edit',()=>{
 const {ids}=boot();
 ids.get('mode-write').click();
 ids.get('input-method').value='joystick';ids.get('input-method').listeners.get('change')();
 ids.get('joy-confirm').click(); // insert initial ICH word
 assert.equal(ids.get('draft').value,'ICH ');
 assert.equal(ids.get('joy-up').textContent,'↑ ↶');
 assert.equal(ids.get('joy-up').dataset.shortcut,'true');
 assert.match(ids.get('joy-up').getAttribute('aria-label'),/Hoch zu Rückgängig/);
 assert.match(ids.get('joystick-current').textContent,/↑ zu ↶/);
 // The shortcut must never run Undo by itself: arrows only move focus.
 ids.get('joy-up').click();
 assert.equal(ids.get('draft').value,'ICH ');
 assert.match(ids.get('joystick-current').textContent,/Rückgängig/);
 assert.equal(ids.get('joy-up').dataset.shortcut,'false');
 assert.equal(ids.get('last-message').textContent,'');
 ids.get('joy-confirm').click();
 assert.equal(ids.get('draft').value,'');
 assert.equal(ids.get('joy-up').textContent,'↑');
 assert.equal(ids.get('joy-up').dataset.shortcut,'false');
 assert.equal(ids.get('last-message').textContent,'');
});
test('1.5.1 shortcut hint hides when a different suggestion-column would be targeted',()=>{
 const {ids}=boot();
 ids.get('mode-write').click();
 ids.get('input-method').value='joystick';ids.get('input-method').listeners.get('change')();
 ids.get('joy-confirm').click();
 assert.equal(ids.get('joy-up').dataset.shortcut,'true');
 ids.get('joy-right').click();
 assert.equal(ids.get('joy-up').dataset.shortcut,'false','Up from column 2 is not Undo');
 assert.equal(ids.get('joy-up').textContent,'↑');
 ids.get('joy-left').click();
 assert.equal(ids.get('joy-up').dataset.shortcut,'true');
 assert.equal(ids.get('draft').value,'ICH ');
});
test('1.5.1 cue reverts when switching away from Joystick mode',()=>{
 const {ids}=boot();
 ids.get('mode-write').click();
 ids.get('input-method').value='joystick';ids.get('input-method').listeners.get('change')();
 ids.get('joy-confirm').click();
 assert.equal(ids.get('joy-up').dataset.shortcut,'true');
 ids.get('input-method').value='touch';ids.get('input-method').listeners.get('change')();
 assert.equal(ids.get('joy-up').dataset.shortcut,'false');
 assert.equal(ids.get('joystick-demo').hidden,true);
 assert.equal(ids.get('draft').value,'ICH ');
});
test('1.5.1 preserves compact accessible controls while showing a hint',()=>{
 assert.match(html,/width:min\(350px,calc\(100% - 24px\)\)/);
 assert.match(html,/#joystick-demo \.joy-pad \.btn\{min-height:44px/);
 assert.match(html,/#joy-up\[data-shortcut="true"\]\{border-color:var\(--focus\)/);
 assert.doesNotMatch(html,/min-height:37px/);
});


test('1.5.2 selector is at the top, unique and before the long writing keyboard',()=>{
 assert.equal([...html.matchAll(/id="input-method"/g)].length,1);
 const selector=html.indexOf('id="input-method"');
 const mode=html.indexOf('id="mode-write"');
 const writing=html.indexOf('id="write-view"');
 const keyboard=html.indexOf('id="keyboard"');
 const scan=html.indexOf('id="scan-title"');
 assert.ok(mode<selector&&selector<writing&&writing<keyboard&&keyboard<scan,'Input mode selector must be beside top communication mode');
 assert.ok(html.indexOf('id="quick-joystick"')<writing);
});
test('1.5.2 one tap starts joystick writing without auto-speaking or inserting anything',()=>{
 const {ids}=boot();
 assert.equal(ids.get('write-view').hidden,true);
 ids.get('quick-joystick').click();
 assert.equal(ids.get('write-view').hidden,false);
 assert.equal(ids.get('quick-view').hidden,true);
 assert.equal(ids.get('input-method').value,'joystick');
 assert.equal(ids.get('joystick-demo').hidden,false);
 assert.match(ids.get('joystick-current').textContent,/ICH/);
 assert.ok(ids.get('suggestion-row').children[0].scrollCalls.length>0);
 assert.equal(ids.get('draft').value,'');
 assert.equal(ids.get('last-message').textContent,'');
});
test('1.5.2 top shortcut retains word, one-up Undo and explicit confirmation',()=>{
 const {ids}=boot();
 ids.get('quick-joystick').click();
 ids.get('joy-confirm').click();
 assert.equal(ids.get('draft').value,'ICH ');
 assert.equal(ids.get('joy-up').textContent,'↑ ↶');
 ids.get('joy-up').click();
 assert.equal(ids.get('draft').value,'ICH ','Arrow is just navigation');
 assert.match(ids.get('joystick-current').textContent,/Rückgängig/);
 ids.get('joy-confirm').click();
 assert.equal(ids.get('draft').value,'');
 assert.equal(ids.get('last-message').textContent,'');
});
test('1.5.2 input selector at top still supports switch and touch behavior',()=>{
 const {ids}=boot();
 ids.get('quick-joystick').click();
 ids.get('input-method').value='switch';
 ids.get('input-method').listeners.get('change')();
 assert.equal(ids.get('joystick-demo').hidden,true);
 ids.get('scan-toggle').click();
 assert.equal(ids.get('scan-hud').hidden,false);
 ids.get('input-method').value='touch';
 ids.get('input-method').listeners.get('change')();
 assert.equal(ids.get('scan-hud').hidden,true);
 ids.get('keyboard').children[0].children[0].click();
 assert.equal(ids.get('draft').value,'A');
 assert.equal(ids.get('last-message').textContent,'');
});
test('1.5.2 compact pad and contextual Undo hint styling unchanged',()=>{
 assert.match(html,/width:min\(350px,calc\(100% - 24px\)\)/);
 assert.match(html,/#joystick-demo \.joy-pad \.btn\{min-height:44px/);
 assert.match(html,/#joy-up\[data-shortcut="true"\]/);
});


test('1.6 experimental prediction focus defaults to on and stays optional',()=>{
 const {ids}=boot({disableSuggestionFocus:false});
 assert.equal(ids.get('auto-suggest-focus').checked,true);
 assert.equal(ids.get('draft').value,'');
 ids.get('auto-suggest-focus').checked=false;
 ids.get('auto-suggest-focus').listeners.get('change')();
 assert.equal(ids.get('draft').value,'');
});
test('1.6 joystick letter OK focuses valid next word without inserting automatically',()=>{
 const {ids}=boot({disableSuggestionFocus:false});
 ids.get('quick-joystick').click();
 ids.get('joy-down').click(); // A-F
 ids.get('joy-right').click(); // B
 ids.get('joy-confirm').click(); // type B via explicit OK
 assert.equal(ids.get('draft').value,'B');
 assert.match(ids.get('joystick-current').textContent,/BITTE/);
 assert.equal(ids.get('suggestion-row').children[0].dataset.navActive,'true');
 assert.equal(ids.get('last-message').textContent,'');
 assert.match(ids.get('draft-status').textContent,/OK übernimmt/);
 // Choosing that word still requires deliberate confirmation.
 ids.get('joy-confirm').click();
 assert.equal(ids.get('draft').value,'BITTE ');
 assert.equal(ids.get('last-message').textContent,'');
});
test('1.6 one Down returns to the exact last letter key and can continue typing',()=>{
 const {ids}=boot({disableSuggestionFocus:false});
 ids.get('quick-joystick').click();
 ids.get('joy-down').click(); // A-F
 ids.get('joy-right').click(); // B
 ids.get('joy-confirm').click(); // B
 assert.equal(ids.get('draft').value,'B');
 assert.equal(ids.get('suggestion-row').children.some(x=>x.dataset.navActive==='true'),true);
 ids.get('joy-down').click(); // no unwanted row reset, back to B
 assert.equal(ids.get('keyboard').children[0].children[1].dataset.navActive,'true');
 assert.match(ids.get('joystick-current').textContent,/B/);
 assert.equal(ids.get('draft').value,'B');
 ids.get('joy-confirm').click(); // B twice; no automatic word completion
 assert.equal(ids.get('draft').value,'BB');
 assert.equal(ids.get('last-message').textContent,'');
});
test('1.6 turning off word-focus preserves manual Up and old typing path',()=>{
 const {ids}=boot({disableSuggestionFocus:false});
 ids.get('auto-suggest-focus').checked=false;
 ids.get('auto-suggest-focus').listeners.get('change')();
 ids.get('quick-joystick').click();
 ids.get('joy-down').click(); // A-F
 ids.get('joy-right').click(); // B
 ids.get('joy-confirm').click(); // B
 assert.equal(ids.get('draft').value,'B');
 assert.equal(ids.get('keyboard').children[0].children[1].dataset.navActive,'true');
 ids.get('joy-up').click();
 assert.match(ids.get('joystick-current').textContent,/BRAUCHE/);
});
test('1.6 manual touch typing or switch scanning never steals focus for predictions',()=>{
 const {ids}=boot({disableSuggestionFocus:false});
 ids.get('quick-joystick').click();
 const keyB=ids.get('keyboard').children[0].children[1];
 keyB.click();
 assert.equal(ids.get('draft').value,'B');
 assert.equal(ids.get('suggestion-row').children[0].dataset.navActive,'true','old joystick focus remains at initial suggestion');
 ids.get('input-method').value='touch';
 ids.get('input-method').listeners.get('change')();
 ids.get('keyboard').children[0].children[0].click();
 assert.equal(ids.get('draft').value,'BA');
 assert.equal(ids.get('joystick-demo').hidden,true);
 assert.equal(ids.get('last-message').textContent,'');
});
test('1.6 predictions cannot bypass explicit Undo confirmation',()=>{
 const {ids}=boot({disableSuggestionFocus:false});
 ids.get('quick-joystick').click();
 ids.get('joy-down').click();ids.get('joy-right').click();
 ids.get('joy-confirm').click(); // B triggers a suggestion focus
 assert.equal(ids.get('draft').value,'B');
 ids.get('joy-up').click(); // Up moves to actions row, no deletion yet
 assert.equal(ids.get('draft').value,'B');
 assert.match(ids.get('joystick-current').textContent,/Rückgängig/);
 ids.get('joy-confirm').click(); // undo typed B
 assert.equal(ids.get('draft').value,'');
 assert.equal(ids.get('last-message').textContent,'');
});


test('1.6.1 marks the explicit return key B on Down when B yielded BITTE',()=>{
 const {ids}=boot({disableSuggestionFocus:false});
 ids.get('quick-joystick').click();
 ids.get('joy-down').click();ids.get('joy-right').click();ids.get('joy-confirm').click();
 assert.equal(ids.get('draft').value,'B');
 assert.match(ids.get('joystick-current').textContent,/BITTE/);
 assert.equal(ids.get('joy-down').dataset.letterReturn,'true');
 assert.equal(ids.get('joy-down').textContent,'↓ B');
 assert.match(ids.get('joy-down').getAttribute('aria-label'),/zurück zu B/);
 ids.get('joy-down').click();
 assert.equal(ids.get('keyboard').children[0].children[1].dataset.navActive,'true');
 assert.match(ids.get('joystick-current').textContent,/Markiert: B/);
 assert.equal(ids.get('joy-down').textContent,'↓');
 assert.equal(ids.get('draft').value,'B');
 assert.equal(ids.get('last-message').textContent,'');
});
test('1.6.1 browsing from BITTE across suggestion columns still returns to B, never D',()=>{
 const {ids}=boot({disableSuggestionFocus:false});
 ids.get('quick-joystick').click();
 ids.get('joy-down').click();ids.get('joy-right').click();ids.get('joy-confirm').click();
 assert.equal(ids.get('draft').value,'B');
 for(let i=0;i<2;i++)ids.get('joy-right').click(); // B offers 3 suggestions
 assert.match(ids.get('joystick-current').textContent,/Reihe 1 · Feld 3/);
 assert.equal(ids.get('joy-down').textContent,'↓ B');
 ids.get('joy-down').click();
 assert.equal(ids.get('keyboard').children[0].children[1].dataset.navActive,'true');
 assert.equal(ids.get('keyboard').children[0].children[3].dataset.navActive,'false');
 assert.match(ids.get('joystick-current').textContent,/Markiert: B/);
 assert.equal(ids.get('draft').value,'B','navigating alone never inserts words');
 assert.equal(ids.get('last-message').textContent,'');
});
test('1.6.1 horizontal wrap among suggestions also retains return target',()=>{
 const {ids}=boot({disableSuggestionFocus:false});
 ids.get('quick-joystick').click();
 ids.get('joy-down').click();ids.get('joy-right').click();ids.get('joy-confirm').click();
 ids.get('joy-left').click(); // jump from first suggestion to last active
 assert.equal(ids.get('joy-down').textContent,'↓ B');
 ids.get('joy-down').click();
 assert.equal(ids.get('keyboard').children[0].children[1].dataset.navActive,'true');
});
test('1.6.1 selecting a whole suggested word resets next-word column, not D',()=>{
 const {ids}=boot({disableSuggestionFocus:false});
 ids.get('quick-joystick').click();
 ids.get('joy-right').click();ids.get('joy-right').click();ids.get('joy-right').click();
 assert.match(ids.get('joystick-current').textContent,/BITTE/); // initial index 4
 ids.get('joy-confirm').click();
 assert.equal(ids.get('draft').value,'BITTE ');
 assert.equal(ids.get('joy-down').dataset.letterReturn,'false');
 assert.equal(ids.get('joy-down').textContent,'↓');
 ids.get('joy-down').click();
 assert.equal(ids.get('keyboard').children[0].children[0].dataset.navActive,'true','new word starts at A, not D');
 assert.equal(ids.get('keyboard').children[0].children[3].dataset.navActive,'false');
 assert.equal(ids.get('last-message').textContent,'');
});
test('1.6.1 manual edit and touch mode cannot expose a stale return-letter cue',()=>{
 const {ids}=boot({disableSuggestionFocus:false});
 ids.get('quick-joystick').click();
 ids.get('joy-down').click();ids.get('joy-right').click();ids.get('joy-confirm').click();
 assert.equal(ids.get('joy-down').textContent,'↓ B');
 const a=ids.get('keyboard').children[0].children[0];a.click();
 assert.equal(ids.get('draft').value,'BA');
 assert.equal(ids.get('joy-down').textContent,'↓');
 ids.get('input-method').value='touch';
 ids.get('input-method').listeners.get('change')();
 assert.equal(ids.get('joy-down').dataset.letterReturn,'false');
 assert.equal(ids.get('last-message').textContent,'');
});
test('1.6.1 correct return anchor remains an optional feature and never auto-commits',()=>{
 const {ids}=boot({disableSuggestionFocus:false});
 ids.get('auto-suggest-focus').checked=false;
 ids.get('auto-suggest-focus').listeners.get('change')();
 ids.get('quick-joystick').click();
 ids.get('joy-down').click();ids.get('joy-right').click();ids.get('joy-confirm').click();
 assert.equal(ids.get('draft').value,'B');
 assert.equal(ids.get('joy-down').dataset.letterReturn,'false');
 ids.get('joy-up').click();
 assert.match(ids.get('joystick-current').textContent,/BRAUCHE/);
 assert.equal(ids.get('draft').value,'B');
 assert.equal(ids.get('last-message').textContent,'');
});


test('1.7 retains original six and provides 17 care quick phrases',()=>{
 const {ids}=boot();
 const a=ids.get('phrases').children,b=ids.get('care-phrases').children;
 assert.equal(a.length,6);assert.equal(b.length,17);
 for(const phrase of ['Ich hatte Stuhlgang.','Bitte wechsle meine Einlage.','Bitte hilf mir bei der Rasur.','Bitte rasiere mein Gesicht.','Stopp, bitte hör auf.','Bitte frag mich, bevor du mich berührst.']){
  assert.ok(b.some(x=>x.getAttribute('aria-label')===phrase+' auswählen'),'Missing care phrase '+phrase);
 }
});
test('1.7 direct care joystick highlights STOP; only OK speaks',()=>{
 const {ids}=boot();
 ids.get('care-joystick').click();
 assert.equal(ids.get('input-method').value,'joystick');
 assert.match(ids.get('joystick-current').textContent,/Stopp/);
 assert.equal(ids.get('last-message').textContent,'');
 ids.get('joy-confirm').click();
 assert.equal(ids.get('last-message').textContent,'Stopp, bitte hör auf.');
});
test('1.7 navigation from care shortcut reaches Stuhlgang with Right then OK',()=>{
 const {ids}=boot();
 ids.get('care-joystick').click();ids.get('joy-right').click();
 assert.match(ids.get('joystick-current').textContent,/Ich hatte Stuhlgang/);
 assert.equal(ids.get('last-message').textContent,'');
 ids.get('joy-confirm').click();
 assert.equal(ids.get('last-message').textContent,'Ich hatte Stuhlgang.');
});
test('1.7 touch care phrase includes shaving request',()=>{
 const {ids}=boot();
 const target=ids.get('care-phrases').children.find(x=>x.getAttribute('aria-label').includes('Bitte hilf mir bei der Rasur.'));
 assert.ok(target);assert.equal(ids.get('last-message').textContent,'');
 target.click();assert.equal(ids.get('last-message').textContent,'Bitte hilf mir bei der Rasur.');
});
test('1.7 single-switch scans beyond original 6 phrases',()=>{
 const {ids,step}=boot();
 ids.get('scan-toggle').click();
 assert.equal(ids.get('scan-hud').hidden,false);
 for(let i=0;i<6;i++)step();
 assert.equal(ids.get('scan-current').textContent,'Stopp, bitte hör auf.');
 ids.get('hud-choose').click();
 assert.equal(ids.get('last-message').textContent,'Stopp, bitte hör auf.');
});
test('1.7 ZUR, AUF, DEM and hygiene vocabulary can be suggested',()=>{
 const {ids}=boot();ids.get('mode-write').click();
 const cases=[['Z','ZUR'],['AU','AUF'],['DE','DEM'],['STUHL','STUHLGANG'],['INTIM','INTIMPFLEGE'],['RASU','RASUR'],['WAS','WASCHEN'],['EINL','EINLAGE']];
 for(const [prefix,expected] of cases){
  ids.get('draft').value=prefix;ids.get('draft').listeners.get('input')();
  assert.ok(ids.get('suggestion-row').children.some(b=>b.textContent===expected),'Missing '+expected+' for '+prefix);
  assert.equal(ids.get('last-message').textContent,'');
 }
});
test('1.7 care word completion inserts into composer without speech',()=>{
 const {ids}=boot();ids.get('mode-write').click();
 ids.get('draft').value='ICH HATTE STUHL';ids.get('draft').listeners.get('input')();
 const btn=ids.get('suggestion-row').children.find(x=>x.textContent==='STUHLGANG');
 assert.ok(btn);btn.click();
 assert.equal(ids.get('draft').value,'ICH HATTE STUHLGANG ');
 assert.equal(ids.get('last-message').textContent,'');
});
test('1.7 established joystick B-to-B return preserved',()=>{
 const {ids}=boot({disableSuggestionFocus:false});
 ids.get('quick-joystick').click();
 ids.get('joy-down').click();ids.get('joy-right').click();ids.get('joy-confirm').click();
 assert.equal(ids.get('draft').value,'B');
 assert.match(ids.get('joystick-current').textContent,/BITTE/);
 assert.equal(ids.get('joy-down').textContent,'↓ B');
 ids.get('joy-down').click();
 assert.match(ids.get('joystick-current').textContent,/Markiert: B/);
 assert.equal(ids.get('last-message').textContent,'');
});
