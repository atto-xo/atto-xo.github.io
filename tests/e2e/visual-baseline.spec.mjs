/**
 * Coarse, reviewed visual regression fingerprints, not pixel-perfect screenshots.
 * The full viewport screenshot from each engine is archived for human review.
 * Baselines are committed and verified in normal CI; only the explicit bootstrap
 * workflow with VISUAL_BASELINE_RECORD=1 may produce candidate baselines.
 */
import { test, expect } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const sampleWidth=20, sampleHeight=12, tolerance=18, tileThreshold=55;
const captureStates = [
  {label:'home', path:'/'},
  {label:'architecture',path:'/architecture/'},
  {label:'demo-default',path:'/research-demo/'},
  {label:'demo-defensive',path:'/research-demo/',preset:'defensive'},
  {label:'demo-exploratory',path:'/research-demo/',preset:'exploratory'}
];
const baselineFile=resolve('tests/visual-baselines/visual-fingerprints.json');
const record=process.env.VISUAL_BASELINE_RECORD === '1';

async function capture(page, info, state) {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(state.path, {waitUntil:'domcontentloaded'});
  if (state.path === '/research-demo/') {
    await expect(page.locator('#demo-status')).toContainText('combinations satisfy all selected limits');
    if (state.preset) {
      await page.locator('#demo-scenario').selectOption(state.preset);
      await expect(page.locator('#demo-scenario')).toHaveValue(state.preset);
    }
    await page.locator('#opt-heading').scrollIntoViewIfNeeded();
  }
  const paint = await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    return [...document.querySelectorAll('body, h1, h1 span, .brand, .brand-heart')].map(node => {
      const css = getComputedStyle(node);
      return { tag: node.tagName, color: css.color, fill: css.fill,
        font: css.font, textFill: css.webkitTextFillColor };
    });
  });
  const png=await page.screenshot({animations:'disabled',fullPage:false});
  const folder=resolve('qa-evidence/visual', info.project.name);
  await mkdir(folder,{recursive:true});
  await writeFile(join(folder,state.label+'.png'),png);
  await writeFile(join(folder,state.label+'-paint.json'),JSON.stringify(paint,null,2)+'\n');
  const fingerprint=await page.evaluate(async ({base64,width,height}) => {
    const image=new Image();
    image.src='data:image/png;base64,'+base64;
    await image.decode();
    const canvas=document.createElement('canvas');
    canvas.width=width;
    canvas.height=height;
    const context=canvas.getContext('2d',{willReadFrequently:true});
    if (!context) throw new Error('Canvas 2D unavailable');
    context.drawImage(image,0,0,width,height);
    const pixels=context.getImageData(0,0,width,height).data;
    const rgb=[];
    for(let index=0;index<width*height;index++){
      rgb.push(pixels[index*4],pixels[index*4+1],pixels[index*4+2]);
    }
    return {screenWidth:image.width,screenHeight:image.height,rgb};
  },{base64:png.toString('base64'),width:sampleWidth,height:sampleHeight});
  return {project:info.project.name,label:state.label,...fingerprint};
}

function compare(actual,expected){
  expect(expected).toBeTruthy();
  expect(actual.screenWidth).toBe(expected.screenWidth);
  expect(actual.screenHeight).toBe(expected.screenHeight);
  expect(actual.rgb).toHaveLength(sampleWidth*sampleHeight*3);
  expect(expected.rgb).toHaveLength(sampleWidth*sampleHeight*3);
  let changed=0,delta=0;
  for(let i=0;i<sampleWidth*sampleHeight;i++){
    const distance=Math.abs(actual.rgb[i*3]-expected.rgb[i*3])+
      Math.abs(actual.rgb[i*3+1]-expected.rgb[i*3+1])+
      Math.abs(actual.rgb[i*3+2]-expected.rgb[i*3+2]);
    delta+=distance;
    if(distance>tileThreshold)changed++;
  }
  return {changedTiles:changed,averageDifference:delta/(sampleWidth*sampleHeight*3)};
}
test('reviewed viewport visual baselines: home, architecture, and three synthetic demo states',async({page},info)=>{
  const baseline=record ? null : JSON.parse(await readFile(baselineFile,'utf8'));
  if(!record) {
    expect(baseline.schema).toBe('atto-xo.visual-grid.v1');
    expect(Object.keys(baseline.snapshots)).toHaveLength(25);
  }
  for(const state of captureStates){
    const actual=await capture(page,info,state);
    const key=actual.project+'__'+actual.label;
    if(record){
      const folder=resolve('qa-evidence/visual-proposed');
      await mkdir(folder,{recursive:true});
      await writeFile(join(folder,key+'.json'),JSON.stringify(actual)+'\n');
      continue;
    }
    const comparison=compare(actual,baseline.snapshots[key]);
    const folder=resolve('qa-evidence/visual',info.project.name);
    await writeFile(join(folder,state.label+'-comparison.json'),JSON.stringify({key,...comparison},null,2)+'\n');
    expect(comparison.changedTiles, key+' changed coarse visual cells').toBeLessThanOrEqual(tolerance);
    expect(comparison.averageDifference, key+' average color change').toBeLessThanOrEqual(11);
  }
});
