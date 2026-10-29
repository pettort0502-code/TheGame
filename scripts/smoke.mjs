import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
async function load(page){if(process.env.GAME_FILE)await page.setContent(readFileSync(process.env.GAME_FILE,'utf8'));else await page.goto(process.env.GAME_URL||'http://localhost:5173/');await page.waitForSelector('canvas');}
async function text(page,id,match){await page.waitForFunction(({id,source})=>new RegExp(source).test(document.getElementById(id).textContent),{id,source:match.source});}
async function home(page){await page.evaluate(()=>document.getElementById('home').click());await text(page,'zone',/CENTRAL PLAZA/);await page.waitForTimeout(200);}
async function collect(page,type){await home(page);await page.keyboard.down('KeyW');await page.keyboard.down(type==='grapple'?'KeyA':'KeyD');try{await page.waitForSelector(`#item-${type}.owned`);}finally{await page.keyboard.up('KeyW');await page.keyboard.up(type==='grapple'?'KeyA':'KeyD');}await home(page);}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await load(page);
 assert.ok(await page.locator('canvas').evaluate(c=>!!c.getContext('webgl2')));assert.equal(await page.locator('#dash').count(),0);
 await page.locator('#play').click();await page.waitForFunction(()=>document.pointerLockElement?.tagName==='CANVAS');await text(page,'ability-text',/^NO ITEM/);
 await page.mouse.down();await page.waitForTimeout(200);await page.mouse.up();assert.equal(await page.locator('#hooks').textContent(),'0');assert.equal(await page.locator('#item-grapple').evaluate(e=>e.classList.contains('owned')),false);
 await page.screenshot({path:'/tmp/skybound-pickups.png'});
 await collect(page,'grapple');assert.ok(await page.locator('#item-grapple').evaluate(e=>e.classList.contains('equipped')));
 await collect(page,'spear');assert.ok(await page.locator('#item-spear').evaluate(e=>e.classList.contains('owned')));
 const before=await page.screenshot();await page.mouse.move(950,420,{steps:8});await page.waitForTimeout(300);const after=await page.screenshot();assert.ok(!before.equals(after));
 await page.evaluate(()=>{for(let i=0;i<80;i++)document.dispatchEvent(new MouseEvent('mousemove',{movementX:40,movementY:0,bubbles:true}));});await home(page);
 const centre=await page.locator('#reticle').boundingBox();assert.ok(Math.abs(centre.x+centre.width/2-720)<1&&Math.abs(centre.y+centre.height/2-450)<1);
 await page.waitForSelector('#reticle.in-range');assert.notEqual(await page.locator('#reticle').evaluate(e=>getComputedStyle(e).boxShadow),'none');
 await page.mouse.down();await text(page,'hooks',/^1$/);await text(page,'ability-text',/^SWINGING/);await page.screenshot({path:'/tmp/skybound-hook.png'});
 // Switching off a held grapple detaches it and never activates the new weapon.
 await page.mouse.click(720,450,{button:'right'});await page.waitForSelector('#item-spear.equipped');await text(page,'ability-text',/^SPEAR READY/);await page.mouse.up();
 await page.evaluate(()=>{const c=document.querySelector('canvas');c.dispatchEvent(new MouseEvent('mousedown',{button:0,bubbles:true}));c.dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true}));});await page.waitForFunction(()=>Number(document.getElementById('speed').textContent)>35);await page.screenshot({path:'/tmp/skybound-spear.png'});await page.mouse.up();
 assert.ok(await page.evaluate(()=>document.pointerLockElement?.tagName==='CANVAS'));
 await home(page);await page.mouse.click(720,450,{button:'right'});await page.waitForSelector('#item-grapple.equipped');
 await page.keyboard.down('KeyQ');await text(page,'hooks',/^2$/);await text(page,'ability-text',/^SWINGING/);await page.keyboard.up('KeyQ');await text(page,'ability-text',/^(?!SWINGING)/);await home(page);
 await page.evaluate(()=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:-296,bubbles:true})));
 await page.mouse.down();await text(page,'ability-text',/^SWINGING/);await page.keyboard.press('Space');await page.keyboard.down('KeyD');await page.waitForFunction(()=>Number(document.getElementById('speed').textContent)>10);await page.keyboard.up('KeyD');await page.mouse.up();await home(page);
 await page.keyboard.down('KeyW');await page.waitForFunction(()=>Number(document.getElementById('speed').textContent)>20);await page.keyboard.down('KeyC');await page.waitForFunction(()=>document.body.classList.contains('sliding'));await page.screenshot({path:'/tmp/skybound-slide.png'});await page.keyboard.up('KeyC');await page.keyboard.up('KeyW');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.pointerLockElement&&!document.getElementById('menu').hidden);const speed=await page.locator('#speed').textContent();await page.waitForTimeout(300);assert.equal(await page.locator('#speed').textContent(),speed);
 await page.locator('#menu-home').click();await page.waitForFunction(()=>document.pointerLockElement?.tagName==='CANVAS');await page.waitForSelector('#item-grapple.owned');await page.screenshot({path:'/tmp/skybound-desktop.png'});
 // Aim at a real moving drone using the same captured relative mouse input.
 await home(page);const marker=page.locator('[data-drone="plaza-drone"]');await marker.waitFor({state:'visible'});
 for(let i=0;i<30;i++){
  if((await page.locator('#ability-text').textContent()).startsWith('DRONE READY'))break;
  const box=await marker.boundingBox();assert.ok(box,'plaza drone is visible');
  await page.evaluate(({dx,dy})=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:dx,movementY:dy,bubbles:true})),{dx:(box.x+box.width/2-720)*.5,dy:(box.y+box.height/2-450)*.5});
  await page.evaluate(()=>new Promise(requestAnimationFrame));
 }
 await text(page,'ability-text',/^DRONE READY/);await page.mouse.down();await text(page,'ability-text',/^DRONE SWING/);await page.screenshot({path:'/tmp/skybound-drone.png'});await page.mouse.up();await home(page);
 await page.keyboard.press('KeyT');await text(page,'trial-status',/^STARTING IN/);await page.screenshot({path:'/tmp/skybound-trial.png'});
 await page.keyboard.press('Escape');const countdown=await page.locator('#trial-status').textContent();await page.waitForTimeout(400);assert.equal(await page.locator('#trial-status').textContent(),countdown);await page.locator('#play').click();await text(page,'trial-status',/^CHECKPOINT 1/);
 await page.keyboard.down('KeyW');await text(page,'trial-status',/^CHECKPOINT 2/);await page.keyboard.up('KeyW');await home(page);await text(page,'trial-status',/^Collect both/);
 await page.keyboard.press('KeyR');await text(page,'ability-text',/^NO ITEM/);assert.equal(await page.locator('#item-grapple').evaluate(e=>e.classList.contains('owned')),false);await page.keyboard.press('Escape');
 const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});mobile.on('pageerror',e=>errors.push(e.message));await load(mobile);await mobile.locator('#play').tap();await collect(mobile,'grapple');await collect(mobile,'spear');
 assert.ok(await mobile.locator('#slide').isVisible());assert.ok(await mobile.locator('#switch-item').isVisible());await mobile.locator('#switch-item').tap();await mobile.waitForSelector('#item-spear.equipped');
 const use=await mobile.locator('#hook').boundingBox();await mobile.mouse.move(use.x+use.width/2,use.y+use.height/2);await mobile.mouse.down();await mobile.waitForFunction(()=>Number(document.getElementById('speed').textContent)>35);await mobile.mouse.up();await mobile.screenshot({path:'/tmp/skybound-mobile.png'});await mobile.close();
 const denied=await browser.newPage();denied.on('pageerror',e=>errors.push(e.message));await load(denied);await denied.evaluate(()=>HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.reject(new Error('Denied')));await denied.locator('#play').click();await denied.waitForSelector('#capture-error:not([hidden])');assert.ok(await denied.locator('#menu').isVisible());await denied.close();
 assert.deepEqual(errors,[]);console.log('Browser smoke passed: empty-hand gating, both real pickups, right-click switching, safe grapple detach, spear lunge, Q hook/release, aim/glow, mouse capture, slide/boost, reset inventory, moving drone grapple, trial countdown/pause/checkpoint, mobile item switching/use; no page errors.');
}finally{await browser.close();}
