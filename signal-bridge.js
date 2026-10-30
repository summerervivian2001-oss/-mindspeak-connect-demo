/* MindSpeak research adapter: validated selection impulses, NOT raw EEG. */
(function (root) {
  'use strict';

  class MindSpeakSignalBridge {
    constructor({ minConfidence = 0.85, maxAgeMs = 500, refractoryMs = 1200 } = {}) {
      if (!(minConfidence >= 0 && minConfidence <= 1) ||
          !(maxAgeMs > 0) || !(refractoryMs >= 0)) {
        throw new RangeError('Invalid signal gate configuration');
      }
      this.minConfidence = minConfidence;
      this.maxAgeMs = maxAgeMs;
      this.refractoryMs = refractoryMs;
      this.lastAcceptedAt = -Infinity;
    }

    evaluate(signal, nowMs, scanActive) {
      if (!scanActive) return { accepted: false, reason: 'scan-inactive' };
      if (!Number.isFinite(nowMs) || !signal || signal.type !== 'select' ||
          !Number.isFinite(signal.confidence) ||
          signal.confidence < 0 || signal.confidence > 1 ||
          !Number.isFinite(signal.timestampMs)) {
        return { accepted: false, reason: 'invalid-signal' };
      }
      // Safety: only the manually generated test impulse is supported in v0.5.
      // Real hardware requires an explicit, validated adapter and activation step.
      if (signal.source !== 'simulated') {
        return { accepted: false, reason: 'unsupported-source' };
      }
      if (signal.confidence < this.minConfidence) {
        return { accepted: false, reason: 'low-confidence' };
      }
      const ageMs = nowMs - signal.timestampMs;
      if (ageMs < 0 || ageMs > this.maxAgeMs) {
        return { accepted: false, reason: 'stale-or-future' };
      }
      if (nowMs - this.lastAcceptedAt < this.refractoryMs) {
        return { accepted: false, reason: 'refractory-period' };
      }
      this.lastAcceptedAt = nowMs;
      return { accepted: true, reason: 'accepted' };
    }
  }

  // Browser script and Node's built-in test runner share the same pure logic.
  root.MindSpeakSignalBridge = MindSpeakSignalBridge;
  if (typeof module === 'object' && module.exports) {
    module.exports = { MindSpeakSignalBridge };
  }
})(typeof window !== 'undefined' ? window : globalThis);
