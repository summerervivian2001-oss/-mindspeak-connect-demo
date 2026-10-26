# MindSpeak Connect – selection-signal bridge (research prototype)

This is a **simulated, explicitly non-EEG** browser test of the command interface.
The demo does not record brain signals, decode thoughts or communicate with an EEG headset.

## Signal contract

When the scan is active, the manually triggered test button dispatches a browser
event from within the same page:

```js
window.dispatchEvent(new CustomEvent('mindspeak:selection-signal', {
  detail: {
    type: 'select',
    confidence: 0.95,
    timestampMs: performance.now(),
    source: 'simulation'
  }
}));
```

The timestamp **must use the page's** `performance.now()` time base, not Unix time.
Do not directly send device timestamps unless first translated to the page clock.

The gate currently accepts only `source: 'simulated'`, a fresh (≤ 500 ms) selection signal with
confidence >= 0.85 during an active scan, and applies a 1200 ms refractory period
after accepted impulses. A false positive can still select the wrong phrase:
**confidence threshold is a placeholder, not a calibrated probability or proof
of accuracy.** Scanning remains time-limited and stops if the tab is hidden.
Only a deliberate selection impulse may select a phrase; no idle prediction
should trigger a selection.

The on-page “Simulierten Auswahl-Impuls senden” button dispatches the same
event, but is *still clicked by hand*. This tests signal-to-UI wiring only.
Tests show an entry source of `Simulation (manuell)`, never actual EEG.
Unrecognized input sources, including `source: 'eeg'`, are deliberately **blocked** in v0.5. Before enabling actual hardware signals, build and validate a separate adapter with explicit activation. Do not rely on the browser event's `source` string as authentication. Never present such an experimental output as
a clinically reliable communication or emergency system.

### Unresolved work before an EEG test

- Choose EEG hardware, SDK, transport and subject-specific trigger paradigm.
- Implement an input adapter with an explicit opt-in/arming state; validate
  incoming data origin and clock alignment. Browser custom events alone have
  no authentication and are not a secure device transport.
- Benchmark latency, false selections per minute, true positive rate,
  no-command behavior and performance across sessions and participants.
- Rework the confidence threshold using independent validation data.
- Preserve a reliable non-EEG input and an independent way to stop scanning.

## Automated checks

`node --test tests/signal-bridge.test.cjs`

The research repository `MindSpeak` is separate from this public UI demo.
