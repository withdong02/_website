import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../blog/assets/js/starfield.js', import.meta.url), 'utf8');
function events(target = {}) {
  const handlers = new Map();
  target.addEventListener = (name, handler) => handlers.set(name, handler);
  target.fire = (name, value) => handlers.get(name)?.(value);
  return target;
}
function preview({ reduced = false, fine = true } = {}) {
  const frames = new Map();
  const motion = events({ matches: reduced });
  const pointer = events({ matches: fine });
  let observer, serial = 0, time = 0, dark = false;
  const context = {
    dots: [], lines: [], setTransform() {}, beginPath() {}, fill() {}, moveTo() {}, lineTo() {},
    clearRect() { this.dots = []; this.lines = []; },
    arc(x, y) { this.dots.push([x, y]); },
    stroke() { this.lines.push(this.strokeStyle); },
  };
  const canvas = {
    clientWidth: 900, clientHeight: 600,
    getContext: () => context,
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
  };
  const document = events({
    hidden: false,
    getElementById: () => canvas,
    documentElement: events({ getAttribute: () => dark ? 'dark' : null }),
  });
  const window = events({
    devicePixelRatio: 3,
    matchMedia: query => query.includes('reduced-motion') ? motion : pointer,
  });
  vm.runInNewContext(source, {
    document, window,
    requestAnimationFrame: callback => { frames.set(++serial, callback); return serial; },
    cancelAnimationFrame: id => frames.delete(id),
    MutationObserver: class { constructor(callback) { observer = callback; } observe() {} },
  });
  return {
    context, canvas, document, window, motion, pointer, frames,
    move: () => window.fire('pointermove', { clientX: 430, clientY: 300, pointerType: 'mouse' }),
    theme() { dark = !dark; observer(); },
    tick() {
      time += 34;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach(callback => callback(time));
    },
  };
}

const grid = preview();
const resting = JSON.stringify(grid.context.dots);
assert.ok(grid.context.lines.length > 0, 'Initial grid must contain lines');
assert.equal(grid.canvas.width, 1800, 'DPR is capped at two');
assert.equal(grid.frames.size, 0, 'Idle background must not spin');
grid.move();
grid.move();
assert.equal(grid.frames.size, 1, 'Pointer events share one frame');
grid.tick();
assert.notEqual(JSON.stringify(grid.context.dots), resting, 'Pointer must deform the grid');
grid.document.documentElement.fire('mouseleave');
for (let i = 0; i < 500 && grid.frames.size; i++) grid.tick();
assert.equal(grid.frames.size, 0, 'Spring must settle and stop');
grid.context.dots.forEach(([x, y], i) => {
  const [restX, restY] = JSON.parse(resting)[i];
  assert.ok(Math.hypot(x - restX, y - restY) < 0.25, 'Grid must return to rest');
});
grid.theme();
assert.match(grid.context.lines[0], /140, 170, 215/, 'Idle theme switch must repaint');
grid.move();
grid.document.hidden = true;
grid.document.fire('visibilitychange');
assert.equal(grid.frames.size, 0, 'Hidden document cancels animation');
grid.document.hidden = false;
grid.document.fire('visibilitychange');
grid.move();
assert.equal(grid.frames.size, 1, 'Visible page remains interactive');
grid.motion.matches = true;
grid.motion.fire('change');
grid.move();
assert.equal(grid.frames.size, 0, 'Live reduced-motion change stops interaction');
assert.equal(JSON.stringify(grid.context.dots), resting);
for (const options of [{ reduced: true }, { fine: false }]) {
  const staticGrid = preview(options);
  staticGrid.move();
  assert.equal(staticGrid.frames.size, 0);
  assert.ok(staticGrid.context.lines.length > 0, 'Static fallback must preserve grid lines');
  staticGrid.canvas.clientWidth = 390;
  staticGrid.window.fire('resize');
  assert.equal(staticGrid.canvas.width, 780, 'Static grid must follow resize');
}
console.log('Blog grid passed: pointer deformation, spring settling, idle, themes, visibility, static fallback and DPR.');

const themeScript = readFileSync(new URL('../../blog/assets/js/theme.js', import.meta.url), 'utf8');
for (const denied of [false, true]) {
  let theme = 'dark', saved;
  const button = events({setAttribute(name,value) {this[name]=value;}});
  vm.runInNewContext(themeScript, {
    document: {querySelector:()=>button,documentElement:{getAttribute:()=>theme,setAttribute:(_,value)=>{theme=value;},removeAttribute:()=>{theme=null;}}},
    localStorage: {setItem(_,value) {if(denied)throw Error('Storage denied');saved=value;}},
  });
  assert.equal(button['aria-pressed'],true);
  button.fire('click'); assert.equal(theme,null); assert.equal(button['aria-pressed'],false);
  if(!denied) assert.equal(saved,'light');
  button.fire('click'); assert.equal(theme,'dark');
  if(!denied) assert.equal(saved,'dark');
}
