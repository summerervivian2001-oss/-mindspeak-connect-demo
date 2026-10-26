/* MindSpeak Connect 0.8 – local, deterministic suggestions; no network, no model. */
(function(root){
'use strict';
const DICTIONARY=Object.freeze([
 'ICH','MÖCHTE','BRAUCHE','HABE','BIN','MIR','GEHT','GUT','BITTE','DANKE',
 'HALLO','JA','NEIN','HILFE','WASSER','SCHMERZEN','PAUSE','ESSEN','TRINKEN',
 'TOILETTE','KANN','NICHT','DU','SIE','MEIN','MEINE','MICH','ETWAS','MEHR','WENIGER',
 'HEISS','KALT','HUNGER','DURST','MÜDE','ANGST','MUSS','RUHEN','HELFEN','HOLEN',
 'JA','JETZT','SPÄTER','ZU','VIEL','WIE','WARUM','WO','WAS','WANN','OKAY',
 'GUTEN','MORGEN','ABEND','NACHT','VERSTEHE','BITTE','SEHR','ES','IST','DAS',
 'WAR','EIN','EINE','DER','DIE','UND','ODER','NEU','SORGE','MACHEN','GEHEN'
]);
const UNIQUE=Object.freeze([...new Set(DICTIONARY)]);
const NEXT=Object.freeze({
 'ICH':['MÖCHTE','BRAUCHE','HABE','BIN','KANN','WILL'],
 'MÖCHTE':['BITTE','WASSER','ESSEN','TRINKEN','RUHEN','MEHR'],
 'BRAUCHE':['HILFE','WASSER','EINE','PAUSE','ETWAS','MEHR'],
 'HABE':['SCHMERZEN','HUNGER','DURST','ANGST','EINE','KEINE'],
 'BITTE':['HELFEN','WASSER','MEHR','NICHT','SPÄTER','JETZT'],
 'MIR':['GEHT','IST','BITTE','HILFE'],
 'ES':['IST','GEHT','WAR'],
 'GUTEN':['MORGEN','ABEND','TAG']
});
const INITIAL=Object.freeze(['ICH','JA','NEIN','BITTE','DANKE','HALLO']);
const CHARS=/[A-Za-zÄÖÜäöüßẞ]/u;
function parseContext(text){
 if(typeof text!=='string')throw new TypeError('Text required');
 const match=text.match(/([A-Za-zÄÖÜäöüßẞ]+)$/u);
 const prefix=match?match[1].toLocaleUpperCase('de-DE'):'';
 const before=match?text.slice(0,-match[1].length):text;
 const words=before.trim().split(/[^A-Za-zÄÖÜäöüßẞ]+/u).filter(Boolean);
 const previous=words.length?words[words.length-1].toLocaleUpperCase('de-DE'):'';
 return {prefix,previous};
}
function suggestWords(text,limit=6){
 if(!Number.isInteger(limit)||limit<0||limit>6)throw new RangeError('Invalid limit');
 if(limit===0)return [];
 const {prefix,previous}=parseContext(text);
 const preferred=NEXT[previous]||INITIAL;
 const ordering=[...preferred,...UNIQUE];
 const out=[];
 for(const item of ordering){
   if(!item.startsWith(prefix)||item===prefix||out.includes(item))continue;
   out.push(item);
   if(out.length===limit)break;
 }
 return out;
}
function completeWord(text,suggestion,maxLength=300){
 if(typeof text!=='string'||typeof suggestion!=='string'||!Number.isInteger(maxLength)||maxLength<1)throw new TypeError('Invalid completion input');
 if(!UNIQUE.includes(suggestion))throw new RangeError('Unknown suggestion');
 const end=text.match(/([A-Za-zÄÖÜäöüßẞ]+)$/u);
 const prefix=end?end[1]:'';
 if(prefix&&!suggestion.startsWith(prefix.toLocaleUpperCase('de-DE')))return {ok:false,text,reason:'prefix-mismatch'};
 if(prefix.toLocaleUpperCase('de-DE')===suggestion)return {ok:false,text,reason:'already-complete'};
 // Append one space after a consciously selected whole word.
 const output=text.slice(0,text.length-prefix.length)+suggestion+' ';
 if(Array.from(output).length>maxLength)return {ok:false,text,reason:'max-length'};
 return {ok:true,text:output,reason:'inserted'};
}
root.MindSpeakSuggestions={suggestWords,completeWord,parseContext};
if(typeof module==='object'&&module.exports)module.exports={suggestWords,completeWord,parseContext};
})(typeof globalThis!=='undefined'?globalThis:this);
