import {chromium} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
async function load(page){if(process.env.GAME_FILE)await page.setContent(readFileSync(process.env.GAME_FILE,'utf8'));else await page.goto(process.env.GAME_URL||'http://localhost:5173/');await page.waitForSelector('canvas');}
try{
 const errors=[],page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));await load(page);
 assert.match(await page.locator('.eyebrow').textContent(),/Blackout Spire/);assert.equal(await page.locator('#health').count(),0);await page.locator('#play').click();await page.waitForFunction(()=>Boolean(document.pointerLockElement));
 assert.match(await page.locator('#mission-title').textContent(),/1 \/ 8/);assert.match(await page.locator('#mission-goal').textContent(),/5 relay guards/);assert.match(await page.locator('#run-status').textContent(),/CHECKPOINT 1 \/ 9/);
 for(const [type,key] of [['grapple','KeyA'],['spear','KeyD']]){
  await page.keyboard.down('KeyW');await page.keyboard.down(key);try{await page.waitForSelector(`#item-${type}.owned`);}finally{await page.keyboard.up('KeyW');await page.keyboard.up(key);}await page.evaluate(()=>document.getElementById('home').click());
 }
 await page.waitForSelector('#item-grapple.owned');await page.waitForSelector('#item-spear.owned');
 await page.screenshot({path:'/tmp/skybound-level-one.png'});
 await page.keyboard.down('KeyA');try{await page.waitForFunction(()=>/DEATHS 1/.test(document.getElementById('run-status').textContent),{},{timeout:30000});}finally{await page.keyboard.up('KeyA');}
 await page.waitForSelector('#item-grapple.owned');await page.waitForSelector('#item-spear.owned');assert.equal(await page.locator('#level-complete').isVisible(),false);
 await page.keyboard.press('Escape');const speed=await page.locator('#speed').textContent();await page.waitForTimeout(200);assert.equal(await page.locator('#speed').textContent(),speed);
 const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});mobile.on('pageerror',e=>errors.push(e.message));await load(mobile);await mobile.locator('#play').tap();await mobile.screenshot({path:'/tmp/skybound-level-mobile.png'});assert.ok(await mobile.locator('#mission').isVisible());assert.ok(await mobile.locator('#grind').isVisible());await mobile.close();
 assert.deepEqual(errors,[]);console.log('Level browser checks passed: default campaign, objective HUD, no shields, two-item pickup, checkpoint loadout restore, fall retry, pause, mobile controls; no page errors.');
}finally{await browser.close();}
