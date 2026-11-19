import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { blogPages, parseSceneReturn, sceneLinkInView } from '../src/Experience/utils/blog-navigation.js';
import { mergeBlog } from '../scripts/build-site.mjs';

assert.deepEqual(Object.values(blogPages), ['/posts/', '/tags/', '/categories/', '/archives/']);
assert.equal(sceneLinkInView({ x: 0, y: 0, z: .5 }, 390, 844), true);
for (const point of [{ x: 1, y: 0, z: .5 }, { x: 0, y: -1, z: .5 }, { x: 0, y: 0, z: 1.1 }, { x: .9, y: 0, z: .5 }]) {
  assert.equal(sceneLinkInView(point, 390, 844), false, 'Offscreen and behind-camera links must leave the tab order');
}
assert.deepEqual(parseSceneReturn('{"progress":0.62,"zoom":2.1}'), { progress: .62, zoom: 2.1 });
for (const invalid of [null, 'bad', '{}', 'null', '{"progress":1,"zoom":2}', '{"progress":-1,"zoom":2}', '{"progress":0.6,"zoom":4}', '{"progress":"0.6","zoom":2}']) assert.equal(parseSceneReturn(invalid), null);
mkdirSync('.tmp', { recursive: true });
const stage = mkdtempSync(path.resolve('.tmp/merge-check-'));
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
