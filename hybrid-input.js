/* MindSpeak 0.7 – isolated keyboard and two-stage scan; no EEG or storage. */
(function (root) {
  'use strict';
  const ROWS = Object.freeze([
    Object.freeze(['A','B','C','D','E','F']),
    Object.freeze(['G','H','I','J','K','L']),
    Object.freeze(['M','N','O','P','Q','R']),
    Object.freeze(['S','T','U','V','W','X']),
    Object.freeze(['Y','Z','Ä','Ö','Ü','ß']),
    Object.freeze([' ','.','?','⌫','Satz sprechen','Zurück'])
  ]);
  class HybridComposer {
    constructor(maxLength=300) {
      if (!Number.isInteger(maxLength) || maxLength < 1) throw new RangeError('Invalid maxLength');
      this.maxLength=maxLength; this.text='';
    }
    setText(text) {
      if (typeof text !== 'string') throw new TypeError('String required');
      this.text=Array.from(text).slice(0,this.maxLength).join('');
      return this.text;
    }
    apply(key) {
      if (key === '⌫') { this.text=Array.from(this.text).slice(0,-1).join('');return 'changed'; }
      if (key === 'Zurück') return 'back';
      if (key === 'Satz sprechen') return this.text.trim() ? 'speak' : 'empty';
      if (!ROWS.some(r=>r.includes(key))) throw new RangeError('Unknown key');
      if (Array.from(this.text).length >= this.maxLength) return 'full';
      this.text+=key;
      return 'changed';
    }
  }
  class RowColumnScan {
    constructor(rows=ROWS) {
      if (!Array.isArray(rows) || rows.length===0 || rows.some(r=>!Array.isArray(r)||r.length!==rows.length)) throw new TypeError('Expected square scan matrix');
      this.rows=rows;this.reset();
    }
    reset(){this.stage='row';this.index=0;this.row=0;}
    next(){this.index=(this.index+1)%this.rows.length;return this.index;}
    label() {
      return this.stage==='row'
        ? 'Reihe '+(this.index+1)+': '+this.rows[this.index].map(k=>k===' '?'Leerzeichen':k).join(' · ')
        : this.rows[this.row][this.index]===' ' ? 'Leerzeichen' : this.rows[this.row][this.index];
    }
    choose(){
      if(this.stage==='row'){this.row=this.index;this.stage='key';this.index=0;return {kind:'row',row:this.row};}
      const key=this.rows[this.row][this.index];
      if(key==='Zurück'){this.reset();return {kind:'back'};}
      this.reset();return {kind:'key',key};
    }
  }
  root.MindSpeakHybridInput={ROWS,HybridComposer,RowColumnScan};
  if(typeof module==='object' && module.exports) module.exports={ROWS,HybridComposer,RowColumnScan};
})(typeof globalThis !== 'undefined' ? globalThis : this);
