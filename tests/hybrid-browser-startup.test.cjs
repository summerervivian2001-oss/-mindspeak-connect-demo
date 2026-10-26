const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname,'../mindspeak-test-0.8.html'), 'utf8');

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

test('typed prefix creates local suggestion and requires explicit selection', () => {
  const {ids} = boot();
  ids.get('mode-write').click();
  const input = ids.get('draft');
  input.value = 'ICH M';
  input.listeners.get('input')();
  const suggestions = ids.get('suggestion-row').children;
  const button = suggestions.find(b => b.textContent === 'MÖCHTE');
  assert.ok(button, 'Prefix ICH M should suggest MÖCHTE');
  assert.equal(ids.get('last-message').textContent, '');
  button.click();
  assert.equal(input.value, 'ICH MÖCHTE ');
  assert.equal(ids.get('last-message').textContent, '');
});

test('scan suggestion inserts only text and stays running', () => {
  const {ids} = boot();
  ids.get('mode-write').click();
  ids.get('scan-toggle').click();
  assert.equal(ids.get('scan-hud').hidden,false);
  ids.get('scan-choose').click(); // suggestion row, not a word
  ids.get('scan-choose').click(); // first suggested word, "ICH"
  assert.equal(ids.get('draft').value, 'ICH ');
  assert.equal(ids.get('scan-hud').hidden,false, 'scan remains active');
  assert.equal(ids.get('last-message').textContent,'');
  ids.get('hud-stop').click();
  assert.equal(ids.get('scan-hud').hidden,true);
});
