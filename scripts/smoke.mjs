import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
async function load(page){if(process.env.GAME_FILE)await page.setContent(readFileSync(process.env.GAME_FILE,'utf8'));else await page.goto(process.env.GAME_URL||'http://localhost:5173/');await page.waitForSelector('canvas');}
async function text(page,id,match){await page.waitForFunction(({id,source})=>new RegExp(source).test(document.getElementById(id).textContent),{id,source:match.source});}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await load(page);
 assert.ok(await page.locator('canvas').evaluate(c=>!!c.getContext('webgl2')));assert.equal(await page.locator('#dash').count(),0);assert.equal(await page.locator('#aim').count(),0);
 await page.locator('#play').click();await page.waitForFunction(()=>document.pointerLockElement?.tagName==='CANVAS');assert.equal(await page.locator('#menu').isVisible(),false);
 await page.waitForTimeout(500);const before=await page.screenshot();await page.mouse.move(950,420,{steps:8});await page.waitForTimeout(500);const after=await page.screenshot();const centre=await page.locator('#reticle').boundingBox();assert.ok(Math.abs(centre.x+centre.width/2-720)<1&&Math.abs(centre.y+centre.height/2-450)<1,'aim remains fixed at screen centre');assert.ok(!before.equals(after),'moving the mouse without a held button changes the view');
 // Relative deltas keep arriving at a fixed screen edge; turning must not clamp.
 await page.evaluate(()=>{for(let i=0;i<80;i++)document.dispatchEvent(new MouseEvent('mousemove',{movementX:40,movementY:0,clientX:1439,clientY:450,bubbles:true}));});
 await page.waitForTimeout(500);assert.ok(await page.evaluate(()=>document.pointerLockElement?.tagName==='CANVAS'));
 const beyond=await page.screenshot();assert.ok(!after.equals(beyond),'camera turns beyond a full revolution at a fixed cursor position');
 await page.keyboard.press('KeyR');await page.waitForFunction(()=>document.getElementById('reticle').classList.contains('in-range'));const glow=await page.locator('#reticle').evaluate(e=>getComputedStyle(e).boxShadow);assert.notEqual(glow,'none');
 await page.mouse.down();await text(page,'hooks',/^1$/);await text(page,'ability-text',/^SWINGING/);await page.screenshot({path:'/tmp/skybound-hook.png'});await page.mouse.up();await text(page,'ability-text',/^(?!SWINGING)/);
 await page.keyboard.down('KeyQ');await text(page,'hooks',/^2$/);await text(page,'ability-text',/^SWINGING/);await page.keyboard.up('KeyQ');await text(page,'ability-text',/^(?!SWINGING)/);
 await page.keyboard.press('KeyR');await text(page,'hooks',/^0$/);
 await page.evaluate(()=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:-296,bubbles:true})));
 await page.mouse.down();await text(page,'ability-text',/^SWINGING/);await page.keyboard.press('Space');await page.keyboard.down('KeyD');await page.waitForFunction(()=>Number(document.getElementById('speed').textContent)>10);await page.screenshot({path:'/tmp/skybound-swing.png'});await page.keyboard.up('KeyD');await page.mouse.up();await page.keyboard.press('KeyR');
await page.keyboard.press('Space');await page.waitForTimeout(120);await page.keyboard.press('Space');await page.waitForTimeout(100);await page.screenshot({path:'/tmp/skybound-double-jump.png'});await page.keyboard.press('KeyR');
 await page.keyboard.down('KeyW');await page.keyboard.down('KeyD');await page.keyboard.press('Space');await page.waitForFunction(()=>Number(document.getElementById('speed').textContent)>7);await page.keyboard.press('Space');await page.keyboard.up('KeyW');await page.keyboard.up('KeyD');
 await page.keyboard.press('KeyR');await page.keyboard.down('KeyW');await page.waitForFunction(()=>Number(document.getElementById('speed').textContent)>20);await text(page,'ability-text',/^SPEED BOOST/);
 await page.keyboard.down('KeyC');await page.waitForFunction(()=>document.body.classList.contains('sliding'));await page.screenshot({path:'/tmp/skybound-slide.png'});await page.keyboard.up('KeyC');await page.keyboard.up('KeyW');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.pointerLockElement&&!document.getElementById('menu').hidden);
 const speed=await page.locator('#speed').textContent();await page.waitForTimeout(500);assert.equal(await page.locator('#speed').textContent(),speed);
 await page.locator('#menu-home').click();await page.waitForFunction(()=>document.pointerLockElement?.tagName==='CANVAS');await text(page,'zone',/CENTRAL PLAZA/);
 await page.keyboard.press('KeyR');await page.waitForTimeout(300);await page.screenshot({path:'/tmp/skybound-desktop.png'});
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.pointerLockElement);
 const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});mobile.on('pageerror',e=>errors.push(e.message));await load(mobile);await mobile.locator('#play').tap();assert.ok(await mobile.locator('#touch').isVisible());assert.ok(await mobile.locator('#hook').isVisible());assert.ok(await mobile.locator('#slide').isVisible());assert.equal(await mobile.locator('#dash').count(),0);
 const hook=await mobile.locator('#hook').boundingBox();await mobile.mouse.move(hook.x+hook.width/2,hook.y+hook.height/2);await mobile.mouse.down();await text(mobile,'hooks',/^1$/);await mobile.mouse.up();
 await mobile.screenshot({path:'/tmp/skybound-mobile.png'});await mobile.close();
 const fallback=await browser.newPage({viewport:{width:1440,height:900}});fallback.on('pageerror',e=>errors.push(e.message));await load(fallback);
 await fallback.evaluate(()=>{HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.reject(new Error('Capture unavailable'));});
 await fallback.locator('#play').click();await fallback.waitForSelector('#capture-error:not([hidden])');assert.ok(await fallback.locator('#menu').isVisible());assert.equal(await fallback.locator('#hooks').textContent(),'0');assert.equal(await fallback.evaluate(()=>document.pointerLockElement),null);await fallback.close();
 assert.deepEqual(errors,[]);console.log('Browser smoke passed: click-to-play pointer lock, unlimited relative mouse look, fixed central crosshair and capture-denial handling, Escape/menu/resume, target glow, boost pads, slide input, mouse/Q hook attach/release, faster diagonal movement and jump input, reset, first-person view, touch hook, WebGL; no page errors.');
}finally{await browser.close();}
