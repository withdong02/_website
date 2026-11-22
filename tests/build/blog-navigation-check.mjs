import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { blogPages, parseSceneReturn, sceneLinkInView } from '../../src/scene/navigation.js';
import { mergeBlog } from '../../scripts/build/build-site.mjs';

assert.deepEqual(Object.values(blogPages), ['/posts/', '/tags/', '/categories/', '/archives/']);
assert.equal(sceneLinkInView({ x: 0, y: 0, z: .5 }, 390, 844), true);
for (const point of [{ x: 1, y: 0, z: .5 }, { x: 0, y: -1, z: .5 }, { x: 0, y: 0, z: 1.1 }, { x: .9, y: 0, z: .5 }]) {
  assert.equal(sceneLinkInView(point, 390, 844), false, 'Offscreen and behind-camera links must leave the tab order');
}
assert.deepEqual(parseSceneReturn('{"progress":0.62,"zoom":2.1}'), { progress: .62, zoom: 2.1 });
for (const invalid of [null, 'bad', '{}', 'null', '{"progress":1,"zoom":2}', '{"progress":-1,"zoom":2}', '{"progress":0.6,"zoom":4}', '{"progress":"0.6","zoom":2}']) assert.equal(parseSceneReturn(invalid), null);
const returnScript = readFileSync('blog/assets/js/scene-return.js', 'utf8');
async function checkHistoryReturn({ entries, saved = '{"entryKey":"scene"}', unavailable = false, error, modified = false }) {
  let click;
  const calls = [];
  const link = { href: 'https://example.com/?resume=blog', addEventListener: (_, callback) => { click = callback; } };
  runInNewContext(returnScript, {
    document: { querySelector: () => link }, URL,
    location: { origin: 'https://example.com', assign: url => calls.push(url) },
    sessionStorage: { getItem: () => saved },
    window: { navigation: unavailable ? undefined : {
      currentEntry: { index: 5 }, entries: () => entries,
      traverseTo: key => {
        calls.push(key);
        return { committed: error ? Promise.reject(error) : Promise.resolve(), finished: Promise.resolve() };
      },
    } },
  });
  const event = { button: 0, ctrlKey: modified, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
  click(event);
  await Promise.resolve();
  return { prevented: event.defaultPrevented, calls };
}
const sceneEntry = { key: 'scene', index: 0, url: 'https://example.com/' };
assert.deepEqual(await checkHistoryReturn({ entries: [sceneEntry] }), { prevented: true, calls: ['scene'] }, 'Skip intervening blog entries and return to the exact scene document');
for (const options of [
  { entries: [] }, { entries: [sceneEntry], saved: 'bad' }, { unavailable: true },
  { entries: [sceneEntry], modified: true },
  { entries: [{ ...sceneEntry, index: 6 }] },
  { entries: [{ ...sceneEntry, url: 'https://other.example/' }] },
  { entries: [{ ...sceneEntry, url: 'https://example.com/posts/' }] },
]) assert.deepEqual(await checkHistoryReturn(options), { prevented: false, calls: [] }, 'Keep native fallback and modified clicks intact');
assert.deepEqual(await checkHistoryReturn({ entries: [sceneEntry], error: new Error('entry lost') }), {
  prevented: true, calls: ['scene', 'https://example.com/?resume=blog'],
});
assert.deepEqual(await checkHistoryReturn({ entries: [sceneEntry], error: { name: 'AbortError' } }), {
  prevented: true, calls: ['scene'],
}, 'Do not override a newer navigation');
mkdirSync('.tmp/checks', { recursive: true });
const stage = mkdtempSync(path.resolve('.tmp/checks/merge-'));
const scene = path.join(stage, 'scene');
const blog = path.join(stage, 'blog');
for (const dir of [scene, blog, path.join(blog, 'posts'), path.join(blog, 'page/2')]) mkdirSync(dir, { recursive: true });
writeFileSync(path.join(scene, 'index.html'), 'scene');
writeFileSync(path.join(blog, 'index.html'), 'blog home');
writeFileSync(path.join(blog, 'posts/index.html'), 'articles');
writeFileSync(path.join(blog, 'page/2/index.html'), 'duplicate home page');
mergeBlog(scene, blog);
assert.equal(readFileSync(path.join(scene, 'index.html'), 'utf8'), 'scene');
assert.equal(readFileSync(path.join(scene, 'posts/index.html'), 'utf8'), 'articles');
assert.match(readFileSync(path.join(scene, 'page/2/index.html'), 'utf8'), /url=\/posts\/page\/2\//);
writeFileSync(path.join(blog, 'new.html'), 'new');
assert.throws(() => mergeBlog(scene, blog), /collision/);
assert.equal(existsSync(path.join(scene, 'new.html')), false, 'A failed merge must not partially write');
console.log('Blog navigation passed: return-state validation, real routes, root ownership, pagination redirects and collision protection.');
