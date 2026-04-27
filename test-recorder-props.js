import * as Tone from 'tone';
const rec = new Tone.Recorder();
console.log(Object.keys(rec).filter(k => k.includes('record')));
