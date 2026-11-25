import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { albumMarkup, albumPhotosPlugin, buildAlbumPhotos, readAlbumCatalog } from '../../scripts/build/album-photos.mjs';

await mkdir('.tmp/checks', { recursive: true });
const stage = await mkdtemp(path.resolve('.tmp/checks/album-'));
const source = path.join(stage, 'assets/photos/personal');
const cache = path.join(stage, 'cache');
assert.deepEqual((await buildAlbumPhotos(source, cache)).groups, []);
assert.match(albumMarkup([]), /暂无照片/);
await mkdir(path.join(source, 'test-group'), { recursive: true });
const original = await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#ad772c' } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
await writeFile(path.join(source, 'test-group/10.jpg'), original);
await writeFile(path.join(source, 'test-group/2.jpg'), original);
await writeFile(path.join(source, 'note.txt'), 'ignored');
const result = await buildAlbumPhotos(source, cache);
assert.deepEqual(result.groups[0].photos.map(photo => photo.title), ['2', '10']);
const photo = result.groups[0].photos[0];
assert.equal(photo.width, 800);
assert.equal(photo.height, 1200);
const thumb = await sharp(result.files.get(photo.thumb)).metadata();
assert.equal(thumb.height, 640);
assert.equal(thumb.exif, undefined);
assert.equal(createHash('sha256').update(await readFile(path.join(source, 'test-group/2.jpg'))).digest('hex'), createHash('sha256').update(original).digest('hex'), 'Never rewrite originals');
assert.match(albumMarkup([{ ...result.groups[0], photos: [{ ...photo, title: 'test <photo>' }] }]), /test &lt;photo&gt;/);
assert.equal(result.files.size, 2, 'Identical images share generated variants');
assert.deepEqual((await buildAlbumPhotos(source, cache)).groups, result.groups, 'Stable photo URLs and cache reuse');
const plugin = albumPhotosPlugin();
await mkdir(path.join(stage, 'assets/photos/old（示例）'), { recursive: true });
await writeFile(path.join(stage, 'assets/photos/old（示例）/sample.jpg'), original);
plugin.configResolved({ root: stage, command: 'build' });
const emitted = [];
await plugin.buildStart.call({ emitFile: file => emitted.push(file) });
assert.equal(emitted.length, 3);
assert(emitted.every(file => file.fileName.startsWith('album-assets/') && file.source.length > 0));
assert(emitted.some(file => file.fileName.endsWith('photoswipe-license.txt') && file.source.includes('The MIT License')));
assert.match(plugin.transformIndexHtml('<!-- album-content -->', { path: '/albums/index.html' }), /data-photo-id/);
assert.equal(plugin.transformIndexHtml('scene', { path: '/index.html' }), 'scene');
assert.equal(plugin.resolveId('virtual:album-photos'), '\0virtual:album-photos');
const scenePhotos = JSON.parse(plugin.load('\0virtual:album-photos').replace('export default ', ''));
assert.deepEqual(scenePhotos.map(photo => photo.id), result.groups[0].photos.map(photo => photo.id), 'Scene and album use the same personal-photo IDs, excluding old samples');
const catalogFile = path.join(stage, 'assets/photos/catalog.json');
const catalog = { baseUrl: 'https://images.example.test/album-assets/', photos: result.groups[0].photos.map(photo => ({ ...photo, thumb: path.basename(photo.thumb), view: path.basename(photo.view) })) };
await writeFile(catalogFile, JSON.stringify(catalog));
const remote = await readAlbumCatalog(catalogFile);
assert.equal(remote.files.size, 0, 'Remote images are not copied into dist');
assert.equal(remote.groups[0].photos[0].thumb, catalog.baseUrl + catalog.photos[0].thumb);
assert.deepEqual(remote.groups[0].photos.map(p => p.id), scenePhotos.map(p => p.id), 'Moving storage preserves photo URLs');
const remotePlugin = albumPhotosPlugin();
remotePlugin.configResolved({ root: stage, command: 'build' });
const remoteFiles = [];
await remotePlugin.buildStart.call({ emitFile: file => remoteFiles.push(file) });
assert.deepEqual(remoteFiles.map(file => file.fileName), ['album-assets/photoswipe-license.txt']);
assert.match(remotePlugin.transformIndexHtml('<!-- album-content -->', {path:'/albums/'}), /https:\/\/images.example.test\/album-assets\//);
assert.equal(JSON.parse(remotePlugin.load('\0virtual:album-photos').replace('export default ', ''))[0].thumb, remote.groups[0].photos[0].thumb);
const jpg = {...catalog, photos:[{...catalog.photos[0], thumb:'照片 1.jpg', view:'照片 1.jpg'}]};
await writeFile(catalogFile, JSON.stringify(jpg));
assert.equal((await readAlbumCatalog(catalogFile)).groups[0].photos[0].view, catalog.baseUrl + encodeURIComponent('照片 1.jpg'), 'Original JPG filenames are safely encoded and usable for both views');
for (const invalid of [
  {...catalog, baseUrl:'http://images.example.test/'},
  {...catalog, photos:null},
  {...catalog, photos:[{...catalog.photos[0], thumb:'../private.webp'}]},
  {...catalog, photos:[{...catalog.photos[0], width:0}]},
  {...catalog, photos:[catalog.photos[0], catalog.photos[0]]},
]) {
  await writeFile(catalogFile, JSON.stringify(invalid));
  await assert.rejects(readAlbumCatalog(catalogFile));
}
await writeFile(path.join(source, 'broken.jpg'), 'invalid image');
await assert.rejects(buildAlbumPhotos(source, cache), /Cannot process photo broken.jpg/);
console.log('Album photos passed: empty state, grouping, ordering, orientation, metadata removal, original preservation, escaping, cache and corrupt-image failure.');
