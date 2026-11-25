import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export async function readAlbumCatalog(filename) {
  const { baseUrl, photos } = JSON.parse(await readFile(filename, 'utf8'));
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) throw new Error('Album baseUrl must be a public HTTPS directory');
  if (!Array.isArray(photos)) throw new Error('Album photos must be an array');
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  const ids = new Set();
  const imageName = /^[^/\\?#]+\.(?:jpe?g|png|webp|avif)$/i;
  for (const photo of photos) {
    if (!/^[a-f0-9]{16}$/.test(photo.id) || ids.has(photo.id) || typeof photo.title !== 'string' ||
      !Number.isInteger(photo.width) || photo.width <= 0 || !Number.isInteger(photo.height) || photo.height <= 0 ||
      !imageName.test(photo.thumb) || !imageName.test(photo.view)) throw new Error('Invalid photo in album catalog');
    ids.add(photo.id);
  }
  return { groups: photos.length ? [{ photos: photos.map(photo => ({ ...photo, thumb: new URL(encodeURIComponent(photo.thumb), base).href, view: new URL(encodeURIComponent(photo.view), base).href })) }] : [], files: new Map() };
}

export async function buildAlbumPhotos(source, cache) {
  const groups = new Map();
  const files = new Map();
  if (!existsSync(source)) return { groups: [], files };
  async function visit(directory, relative = '') {
    const entries = (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const name = path.posix.join(relative, entry.name);
      const filename = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Photo symlinks are not supported: ${name}`);
      if (entry.isDirectory()) { await visit(filename, name); continue; }
      if (!/\.(jpe?g|png|webp|avif)$/i.test(entry.name)) continue;
      const bytes = await readFile(filename);
      const key = createHash('sha256').update('album-v1').update(bytes).digest('hex');
      const id = createHash('sha256').update(name).digest('hex').slice(0, 16);
      await mkdir(cache, { recursive: true });
      const variants = {};
      for (const [variant, size] of [['thumb', 640], ['view', 2560]]) {
        const output = `${key}-${variant}.webp`;
        const target = path.join(cache, output);
        if (!existsSync(target)) {
          try {
            const outputBytes = await sharp(bytes, { failOn: 'error' }).rotate().resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true }).webp({ quality: variant === 'thumb' ? 80 : 90 }).toBuffer();
            await writeFile(target, outputBytes);
          } catch (error) { throw new Error(`Cannot process photo ${name}: ${error.message}`, { cause: error }); }
        }
        variants[variant] = `/album-assets/${output}`;
        files.set(variants[variant], target);
      }
      const metadata = await sharp(path.join(cache, `${key}-view.webp`)).metadata();
      const title = path.parse(entry.name).name;
      const group = relative || '未分组';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push({ id, title, ...variants, width: metadata.width, height: metadata.height });
    }
  }
  await visit(source);
  return { groups: [...groups].map(([title, photos]) => ({ title, id: `album-${createHash('sha256').update(title).digest('hex').slice(0, 12)}`, photos })), files };
}

export function albumMarkup(groups) {
  if (!groups.length) return '<section class="empty-state" aria-labelledby="empty-title"><span class="empty-frame" aria-hidden="true"></span><h2 id="empty-title">暂无照片</h2></section>';
  return `<p class="album-loading" role="status" aria-live="polite" lang="en">Loading photos…</p><noscript><style>.photo-grid[aria-busy="true"]{display:flex}.album-loading{display:none}body .site-header,body .page-heading,body .skip-link{visibility:visible}</style></noscript><div class="photo-grid" aria-label="照片总览" aria-busy="true">${groups.flatMap(group => group.photos).map(photo => `<a class="photo" id="photo-${photo.id}" href="${photo.view}" style="--photo-ratio:${photo.width / photo.height}" data-pswp-width="${photo.width}" data-pswp-height="${photo.height}" data-photo-id="${photo.id}" aria-label="查看 ${escape(photo.title)}"><img src="${photo.thumb}" width="${photo.width}" height="${photo.height}" alt="${escape(photo.title)}" loading="eager" decoding="async"></a>`).join('')}</div>`;
}

export function albumPhotosPlugin() {
  let root, command, album;
  return {
    name: 'album-photos',
    resolveId(id) { if (id === 'virtual:album-photos') return '\0virtual:album-photos'; },
    load(id) {
      if (id === '\0virtual:album-photos') return `export default ${JSON.stringify(album.groups.flatMap(group => group.photos).slice(0, 5))}`;
    },
    configResolved(config) { root = config.root; command = config.command; },
    async buildStart() {
      const catalog = path.join(root, 'assets/photos/catalog.json');
      album = existsSync(catalog) ? await readAlbumCatalog(catalog) : await buildAlbumPhotos(path.join(root, 'assets/photos/personal'), path.join(root, '.tmp/cache/albums'));
      if (command === 'build') for (const [url, filename] of album.files) {
        this.emitFile({ type: 'asset', fileName: url.slice(1), source: await readFile(filename) });
      }
      if (command === 'build') this.emitFile({ type: 'asset', fileName: 'album-assets/photoswipe-license.txt',
        source: await readFile(new URL('../LICENSE', import.meta.resolve('photoswipe'))) });
    },
    transformIndexHtml(html, context) {
      return context.path === '/albums/index.html' || context.path === '/albums/' ? html.replace('<!-- album-content -->', albumMarkup(album.groups)) : html;
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const filename = album?.files.get(request.url?.split('?')[0]);
        if (!filename) return next();
        response.setHeader('Content-Type', 'image/webp');
        createReadStream(filename).on('error', () => { response.statusCode = 500; response.end(); }).pipe(response);
      });
    },
  };
}
