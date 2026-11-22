import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../blog/assets/js/echo-drift.js', import.meta.url), 'utf8');
function events(target = {}) {
  const handlers = new Map();
  target.addEventListener = (name, handler) => handlers.set(name, handler);
  target.fire = (name, event = {}) => handlers.get(name)?.(event);
  return target;
}
function preview({ reduced = false, observer = true, storage = new Map(), blocked = false } = {}) {
  let observe;
  const button = events({ hidden: true, setAttribute(name, value) { this[name] = value; } });
  const elements = [{ classList: { contains: name => name === 'echo-season--spring' } }, { classList: { contains: () => false } }];
  const animations = ['season-window', 'paper-fall'].map((animationName, index) => ({ animationName, currentTime: 0, effect: { target: elements[index] } }));
  const scene = { dataset: {}, querySelector: () => button, querySelectorAll: () => elements, getAnimations: () => animations };
  const document = events({ hidden: false, querySelector: () => scene, documentElement: { style: { removeProperty() {} } } });
  const motion = events({ matches: reduced });
  const window = events({ matchMedia: () => motion });
  const sessionStorage = {
    getItem: key => { if (blocked) throw Error('Storage disabled'); return storage.get(key) ?? null; },
    setItem: (key, value) => { if (blocked) throw Error('Storage disabled'); storage.set(key, value); },
  };
  const IntersectionObserver = class {
    constructor(callback) { observe = callback; }
    observe() {}
  };
  if (observer) window.IntersectionObserver = IntersectionObserver;
  vm.runInNewContext(source, { document, window, IntersectionObserver, sessionStorage });
  return { scene, button, document, window, motion, animations, intersect: visible => observe([{ isIntersecting: visible }]) };
}

const drift = preview();
assert.equal(drift.scene.dataset.running, 'false', 'Start static until visible');
drift.intersect(true);
assert.equal(drift.scene.dataset.running, 'true');
drift.button.fire('click');
assert.equal(drift.scene.dataset.running, 'false', 'Reader can pause');
assert.equal(drift.button['aria-label'], 'Play animation');
drift.intersect(false);
drift.intersect(true);
assert.equal(drift.scene.dataset.running, 'false', 'Visibility cannot undo manual pause');
drift.button.fire('click');
assert.equal(drift.scene.dataset.running, 'true');
drift.document.hidden = true;
drift.document.fire('visibilitychange');
assert.equal(drift.scene.dataset.running, 'false', 'Hidden tabs stop');
drift.document.hidden = false;
drift.document.fire('visibilitychange');
assert.equal(drift.scene.dataset.running, 'true');
drift.motion.matches = true;
drift.motion.fire('change');
assert.equal(drift.scene.dataset.running, 'false', 'Live reduced-motion stops');
assert.equal(drift.button.hidden, true);
drift.motion.matches = false;
drift.motion.fire('change');
drift.intersect(false);
assert.equal(drift.scene.dataset.running, 'false', 'Offscreen scene stops');
const reduced = preview({ reduced: true });
reduced.intersect(true);
assert.equal(reduced.scene.dataset.running, 'false');
assert.equal(reduced.button.hidden, true);
assert.equal(preview({ observer: false }).scene.dataset.running, 'false', 'Unsupported observers retain static art');
const storage = new Map();
const articles = preview({ storage });
articles.intersect(true);
articles.animations[0].currentTime = 34000;
articles.animations[1].currentTime = 12345;
articles.window.fire('pagehide');
const tags = preview({ storage });
assert.equal(tags.animations[0].currentTime, 34000, 'Switching columns must keep the season');
assert.equal(tags.animations[1].currentTime, 12345, 'Particles must continue too');
tags.intersect(true);
assert.equal(tags.scene.dataset.running, 'true');
tags.button.fire('click');
tags.window.fire('pagehide');
const archives = preview({ storage });
archives.intersect(true);
assert.equal(archives.scene.dataset.running, 'false', 'Manual pause carries across columns');
assert.equal(archives.button['aria-label'], 'Play animation');
assert.equal(archives.animations[0].currentTime, 34000);
archives.animations[0].currentTime = 0;
archives.window.fire('pageshow', { persisted: true });
assert.equal(archives.animations[0].currentTime, 34000, 'Back/forward cache restores the saved clock');
archives.animations[0].currentTime = 41000;
archives.window.fire('pagehide');
articles.window.fire('pageshow', { persisted: true });
assert.equal(articles.animations[0].currentTime, 41000, 'History must use the latest column clock, not its old cached snapshot');
assert.equal(articles.scene.dataset.paused, 'true', 'History must share a pause made on another column');
const invalid = preview({ storage: new Map([['paper-season-window-v1', '{"times":{"0:season-window":-5,"1:paper-fall":"bad"}}']]) });
assert.equal(invalid.animations[0].currentTime, 0);
assert.equal(invalid.animations[1].currentTime, 0);
assert.doesNotThrow(() => preview({ storage: new Map([['paper-season-window-v1', 'bad json']]) }));
const blocked = preview({ blocked: true });
blocked.intersect(true);
assert.doesNotThrow(() => blocked.window.fire('pagehide'));
console.log('Echo drift passed: shared season/particle clocks and pause, history restoration, storage boundaries, visibility and reduced motion.');
