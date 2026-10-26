/* Run: node --test tests/signal-bridge.test.cjs */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MindSpeakSignalBridge } = require('../signal-bridge.js');

const signal = (timestampMs, confidence = 0.96) =>
  ({ type: 'select', confidence, timestampMs, source: 'simulated' });

test('accepts a fresh high-confidence selection only during scanning', () => {
  const bridge = new MindSpeakSignalBridge();
  assert.equal(bridge.evaluate(signal(1000), 1000, false).reason, 'scan-inactive');
  assert.equal(bridge.evaluate(signal(1000), 1000, true).accepted, true);
});

test('rejects malformed, stale, future and low-confidence signals', () => {
  const bridge = new MindSpeakSignalBridge();
  assert.equal(bridge.evaluate(null, 1000, true).reason, 'invalid-signal');
  assert.equal(bridge.evaluate({type:'select',confidence:NaN,timestampMs:1000},1000,true).reason, 'invalid-signal');
  assert.equal(bridge.evaluate(signal(1000, 0.2), 1000, true).reason, 'low-confidence');
  assert.equal(bridge.evaluate(signal(400), 1000, true).reason, 'stale-or-future');
  assert.equal(bridge.evaluate(signal(1001), 1000, true).reason, 'stale-or-future');
});

test('suppresses repeated high-confidence impulses during refractory period', () => {
  const bridge = new MindSpeakSignalBridge();
  assert.equal(bridge.evaluate(signal(2000), 2000, true).accepted, true);
  assert.equal(bridge.evaluate(signal(2100), 2100, true).reason, 'refractory-period');
  assert.equal(bridge.evaluate(signal(3200), 3200, true).accepted, true);
});

test('rejection does not consume the next permissible signal', () => {
  const bridge = new MindSpeakSignalBridge();
  assert.equal(bridge.evaluate(signal(0, 0.84), 0, true).accepted, false);
  assert.equal(bridge.evaluate(signal(20, 0.85), 20, true).accepted, true);
});

test('rejects invalid gate configuration', () => {
  assert.throws(() => new MindSpeakSignalBridge({ minConfidence: 5 }), RangeError);
});
