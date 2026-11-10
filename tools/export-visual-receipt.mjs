// Trusted bootstrap only: collect all 25 browser/state fingerprints for review.
// The exported JSON must be committed by a separate exact-head Git change.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
const directory=resolve('qa-evidence/visual-proposed');
const names=(await readdir(directory)).filter(name=>name.endsWith('.json')).sort();
if(names.length!==25)throw new Error('Expected exactly 25 independent browser/state snapshots, got '+names.length);
const snapshots={};
for(const name of names){
  const item=JSON.parse(await readFile(join(directory,name),'utf8'));
  const key=item.project+'__'+item.label;
  if(Object.hasOwn(snapshots,key))throw new Error('Duplicate visual snapshot '+key);
  if(name!==key+'.json'||item.rgb.length!==20*12*3||
    item.rgb.some(n=>!Number.isInteger(n)||n<0||n>255)){
    throw new Error('Malformed visual snapshot '+name);
  }
  snapshots[key]=item;
}
const projects=['desktop-chromium','mobile-chromium','small-mobile-chromium','desktop-firefox','desktop-webkit'];
const states=['home','architecture','demo-default','demo-defensive','demo-exploratory'];
for(const project of projects)for(const state of states){
  if(!Object.hasOwn(snapshots,project+'__'+state))throw new Error('Missing '+project+' '+state);
}
const result=JSON.stringify({
  schema:'atto-xo.visual-grid.v1',
  summary:'Coarse 20x12 RGB viewport fingerprints from five real engine profiles, not pixel-perfect image baselines',
  sampleWidth:20,sampleHeight:12,snapshots
},null,2)+'\n';
await writeFile(resolve('qa-evidence/visual-proposed/visual-fingerprints.json'),result);
const base64=Buffer.from(result,'utf8').toString('base64');
console.log('VISUAL_RECEIPT_BEGIN');
for(let i=0;i<base64.length;i+=1200)console.log('VISUAL_RECEIPT_CHUNK:'+base64.slice(i,i+1200));
console.log('VISUAL_RECEIPT_END');
