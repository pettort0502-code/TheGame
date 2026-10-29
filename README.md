# Skybound: The Swing Playground

A first-person 3D movement sandbox made with Three.js and Vite. Explore a 180 × 180 metre sandbox with outer rooftops, a swing forest, a highline, low slide tunnels, and the original testing districts. The camera stays at the character's eye position; the smaller arms and hook gun sit low in the view.

## Download and play on Windows

1. On this GitHub repository page, select **Code → Download ZIP**.
2. In Downloads, right-click the ZIP and select **Extract All**.
3. Open the extracted folder, right-click **Play-Skybound.html**, and select **Open with → Google Chrome**.
4. Click **Lock mouse & play** and allow mouse capture if prompted. Press **Escape** to release the mouse.

No coding, Node.js, or installation is needed for this standalone file.

## Play

Open `skybound-reel-swing.html` in Chrome or Edge and click **Click to play**. No server or account is needed; WebGL2 is required. Mouse capture allows unlimited turning. Desktop play requires mouse capture. If the browser blocks it, the menu stays open with instructions to open the downloaded file in Chrome or Edge and allow mouse capture. The crosshair stays fixed in the screen centre and the hook always fires along the camera’s centre ray. Escape releases the cursor and opens the menu.

- WASD / arrows: move relative to the camera
- Mouse: look
- Space: jump, double jump, or wall kick
- **Walk into the glowing pickups ahead of the plaza:** collect the grapple gun on the left and spear on the right. You start empty-handed.
- **Right click or E:** switch between collected items
- **Left click or Q with spear equipped:** lunge in the aimed direction at 42m/s (1.4s cooldown; release and press again to reuse)
- **Hold left click or Q with grapple equipped:** attach the hook to the surface under the crosshair within **20 metres**
- **Release:** detach and keep your momentum
- While airborne and attached, WASD pumps the swing
- **Shift or C (hold):** slide while moving, or crouch while stationary; jump out of a slide to carry momentum
- **Cyan arrow pads:** directional 24m/s boost; chain it into slides, jumps, and hooks
- R: reset; the menu also has Back to plaza and Reset sandbox
- Touch: drag to look; movement, Jump, Slide, Hook (hold), and turn buttons support simultaneous input

The hook replaces dash. Holding the hook gradually winches the rope in at 7m/s, down to a 1.5m minimum. It adds a limited inward pull while preserving sideways swing velocity and avoiding a speed reset on firing. Gravity produces a pendulum swing; WASD adds acceleration along the swing, up to 40m/s from active pumping. Slack rope does not push you. A taut rope redirects outward motion into tangential movement while the winch brings you closer. Release to launch with your current velocity. The central reticle and the aimed surface ring glow cyan only for valid, unobstructed in-range shots. Ground friction and collisions still slow you; airborne horizontal movement has no passive drag. Walls can break a blocked rope. Only solid world surfaces accept shots; sky clicks do nothing.

First collect the grapple gun from the left pickup, then try the tall beam just ahead of the plaza: look up, jump sideways, catch its underside, pump the arc, then release. Higher anchors give more room to swing. Low anchors pull you along the ground; high anchors leave room for an airborne swing.

Slides last up to 1.2 seconds, lower the physical collider, retain speed with light friction, and have a short cooldown to prevent repeated free speed boosts. Holding the slide key afterward keeps you crouched. Releasing stands up only when the ceiling is clear.

There are eleven directional boost pads, including the course launch pad. Each crossing triggers once and grants a short ground-speed boost; airborne momentum is retained. The 180m-wide map has roughly 4.6 times the previous ground area.

Both items have distinct visible first-person models. The spear thrusts forward during a lunge, and the grapple rope starts at the gun’s actual muzzle. Picked-up items disappear from the world. Returning home or falling keeps collected gear; Reset sandbox starts empty-handed and restores both pickups. Switching off the grapple detaches the rope and requires releasing the use button before the new item can fire.

First-person hands react to firing and double jumps, with an expanding jump ring. The camera stays upright. Running is 9m/s. Double jumps, wall jumps, and the open sandbox remain; sprint and dash are absent.

## Development

Requires Node.js 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev
npm test
npm run build:download
```

The last command creates `dist/skybound-reel-swing.html` for offline play and sharing.

With the development server running, `npm run test:browser` checks WebGL, mouse capture, unlimited turning, capture denial handling and fixed central aiming, item pickup/gating, right-click switching, spear lunges, mouse/Q hook attach/release, combined movement, pause/resume, reset, first-person view, and touch controls. Set `GAME_FILE` to the absolute packaged file path to test its contents directly. `CHROMIUM_PATH` defaults to `/usr/bin/chromium`; `GAME_URL` defaults to the dev server. The cloud browser blocks direct `file:` navigation, so the runner loads packaged contents directly.

- `src/world.js`: solid sandbox geometry, including the plaza swing beam
- `src/physics.js`: collisions, movement, jumps, hook validity, rope constraint, swing pumping
- `src/main.js`: rendering, first-person camera/hands/gun, surface raycasting, controls, rope, HUD
- `src/motion.js`: double-jump animation
- `src/physics.test.js`: rope length, tangential speed, gravity/pumping, release momentum, range, collisions, jumps
- `scripts/package-game.mjs`: self-contained HTML packaging

## Host on GitHub Pages

The `docs/` directory contains a self-contained browser version. To refresh both the hosted and downloadable games after a source change, run `npm run build:site`, then commit `docs/index.html` and `Play-Skybound.html` with the source changes.

Once these hosting files are on `main`, open the repository on GitHub, go to **Settings → Pages**, select **Deploy from a branch**, choose **main** and **/docs**, then select **Save**. GitHub will show the live address when deployment finishes. The game will be publicly accessible. GitHub Pages availability for private repositories depends on the account plan; keep repository visibility unchanged unless explicitly approved.

Players open the site in Chrome and click **Lock mouse & play**. Later site updates appear on refresh; browsers may need Ctrl+F5 to refresh cached files.

## Dark neon art direction

The world uses smooth charcoal and indigo surfaces with cyan, magenta, and violet edge lighting, a dark sky, a subtle floor grid, and distant light points. Pickup auras, illuminated equipment, boost arrows, and the central grapple target remain bright and easy to recognise. The HUD and menus use matching dark panels and neon accents.

`src/neon-materials.js` supplies shared world/equipment materials and soft pickup halos. The previous pixel-texture generator has been removed. This visual theme changes no movement, item mechanics, collision boxes, or map layout. It uses no external texture assets or fullscreen bloom pass.

## Neon Circuit, drones, and movement effects

Collect both plaza items, then press **T**, select **Time trial**, or walk through the start arch in the eastern district. Starting places you at the course with your collected gear and a three-second countdown. Pass seven numbered gates in order: boost, slide tunnel, rooftop, sky crossing, landing, return, finish. The HUD shows the next gate, direction, timer, and best time. Press T to retry. Home/reset cancels a run; falling off the world ends it. Escape pauses the run and countdown.

The circuit supports several routes. Steps connect the rooftops, and two course drones provide faster aerial routes. Aim at a glowing drone body with the grapple equipped; its anchor point moves with it, and release retains your resulting velocity. A plaza drone and a swing-forest drone are also available in free roam. Small screen markers identify visible drones and light up when reachable. These are aerial grapple targets, not platforms to stand on. The existing 20m grapple range and item-pickup rules remain.

Medals: gold at 25 seconds or faster, silver at 40, bronze at 65. Completed times stay fixed until the next run. Personal best is saved in browser storage when available; blocked storage does not prevent play. Best times are specific to the course version and browser.

Landings create expanding neon rings, sparks, a subtle lower-screen impact flash, and a small hand dip scaled by impact speed. Fast movement adds cyan world trails and peripheral speed streaks, fading out below 14m/s. Effects use reusable pools and do not add movement penalties or camera shake.

`src/trial.js` handles the race, `src/drones.js` supplies deterministic moving anchors, `src/course-visuals.js` draws the course, and `src/movement-effects.js` handles the effects. Tests include a complete physical run through every gate using both course drones.
