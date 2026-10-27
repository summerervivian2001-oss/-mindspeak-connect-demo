const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname,'../mindspeak-connect-1.2.html'), 'utf8');

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
    this.classList = { add() {}, remove() {}, toggle() {} };
  }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  getAttribute(name) { return this.attrs[name] || null; }
  addEventListener(name, handler) { this.listeners.set(name, handler); }
  append(...items) { this.children.push(...items); }
  appendChild(item) { this.children.push(item); return item; }
  blur() {}
  closest() { return null; }
  click() {
    const fn = this.listeners.get('click');
    assert.equal(typeof fn, 'function', 'Button needs an installed click handler');
    fn({target: this, preventDefault() {}});
  }
}

function boot() {
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
    addEventListener() {},
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
  return { ids, step: () => { assert.ok(callback); clock += 2000; callback(); } };
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
