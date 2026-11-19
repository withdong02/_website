import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '.tmp/notebook-test');
const manifest = JSON.parse(readFileSync(path.join(root, 'blog/migration-manifest.json'), 'utf8'));
execFileSync('hugo', [
  '--source', 'blog', '--destination', '../.tmp/notebook-test', '--noBuildLock',
], { cwd: root, stdio: 'pipe' });

function checkPage(file) {
  const html = readFileSync(file, 'utf8');
  const pageUrl = new URL(path.relative(output, file).split(path.sep).join('/'), 'http://127.0.0.1:1313/');
  assert.doesNotMatch(html, /(?:three|lenis|vite\/client|@react-three)/i);
  const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g), ...html.matchAll(/url\("([^"]+)"\)/g)];
  for (const [, reference] of references) {
    const url = new URL(reference, pageUrl);
    if (url.origin !== 'http://127.0.0.1:1313') continue;
    if (url.pathname === '/' && url.searchParams.get('resume') === 'blog') continue;
    const target = path.join(output, decodeURIComponent(url.pathname),
      url.pathname.endsWith('/') ? 'index.html' : '');
    assert.ok(existsSync(target), `Missing local target: ${reference} in ${file}`);
    if (url.hash && target.endsWith('.html')) {
      const id = decodeURIComponent(url.hash.slice(1));
      assert.ok(readFileSync(target, 'utf8').includes(`id="${id}"`), `Missing anchor: ${reference}`);
    }
  }
  for (const entry of readdirSync(path.dirname(file), { withFileTypes: true })) {
    if (entry.isDirectory() && existsSync(path.join(path.dirname(file), entry.name, 'index.html'))) {
      checkPage(path.join(path.dirname(file), entry.name, 'index.html'));
    }
  }
}

checkPage(path.join(output, 'index.html'));
for (const imported of manifest.files) {
  assert.ok(existsSync(path.join(root, 'blog', imported.file)), `Missing imported source: ${imported.file}`);
  assert.ok(existsSync(path.join(output, imported.url, 'index.html')), `Historical URL changed: ${imported.url}`);
}
const articleCount = readdirSync(path.join(root, 'blog/content/posts'))
  .filter(file => file.endsWith('.md') && file !== '_index.md').length;
const archives = readFileSync(path.join(output, 'archives/index.html'), 'utf8');
function checkPagination(base, total) {
  const urls = [];
  const pageCount = Math.ceil(total / 10);
  for (let page = 1; page <= pageCount; page++) {
    const route = page === 1 ? base : `${base}page/${page}/`;
    const html = readFileSync(path.join(output, route, 'index.html'), 'utf8');
    assert.equal(/class="echo-drift"/.test(html), page === 1 && (base === '' || base === 'posts/'), `Only main list first pages carry the seasonal window: ${route}`);
    if (html.includes('class="echo-drift"')) {
      assert.doesNotMatch(html, /echo-drift-character/, 'The tree replaces Echo in the blog banner');
      assert.equal([...html.matchAll(/class="season-tree"/g)].length, 4, 'Every season needs its tree layer');
      assert.equal([...html.matchAll(/class="season-bench"/g)].length, 4, 'Every season needs its bench layer');
      for (const season of ['spring', 'summer', 'autumn', 'winter']) assert.ok(html.includes(`echo-season--${season}"`), `Missing season: ${season}`);
      assert.doesNotMatch(html, /echo-drift-boat/, 'The seasonal window replaces the boat');
    }
    const cards = [...html.matchAll(/class="post-card__link" href="([^"]+)"/g)]
      .map(([, url]) => decodeURIComponent(url));
    assert.equal(cards.length, Math.min(10, total - (page - 1) * 10), `Wrong page size: ${route}`);
    assert.equal(/rel="prev"/.test(html), page > 1, `Wrong previous state: ${route}`);
    assert.equal(/rel="next"/.test(html), page < pageCount, `Wrong next state: ${route}`);
    if (pageCount > 1) assert.match(html, new RegExp(`aria-label="Page ${page}" aria-current="page"`));
    if (page === 2) {
      assert.ok(html.includes(`href="/${base}#articles" rel="prev"`), 'Page two must return to its own first page');
    }
    urls.push(...cards);
  }
  assert.equal(new Set(urls).size, total, `Duplicate or missing articles: ${base}`);
  return urls;
}
const homeUrls = checkPagination('', articleCount);
assert.deepEqual(checkPagination('posts/', articleCount), homeUrls, 'Home and Articles must keep the same order');
assert.deepEqual([...homeUrls].sort(), manifest.files.map(entry => entry.url).sort(), 'Every article must be discoverable');
checkPagination('tags/java/', 11);
assert.doesNotMatch(readFileSync(path.join(output, 'tags/bug/index.html'), 'utf8'), /class="pagination"/, 'One-page lists need no pagination');
assert.equal([...archives.matchAll(/<time /g)].length, articleCount, 'Archives must contain every article');
for (const route of ['tags', 'categories', 'archives']) {
  const overview = readFileSync(path.join(output, route, 'index.html'), 'utf8');
  assert.match(overview, /class="echo-drift"/);
  assert.match(overview, /blog-assets\/js\/echo-drift/);
}
const projectArticle = readFileSync(path.join(output, 'posts/recordshit-关键记录/index.html'), 'utf8');
assert.equal([...projectArticle.matchAll(/<details\b/g)].length, 2, 'Both imported image folds must render');
const article = readFileSync(path.join(output, 'posts/java序列化与反序列化/index.html'), 'utf8');
assert.match(article, /id="TableOfContents"/);
assert.equal([...article.matchAll(/<pre\b/g)].length, 9);
const image = article.match(/<img\b[^>]+>/)?.[0];
assert.ok(image, 'Sample article image must survive rendering');
assert.match(image, /width="[1-9]\d*"/);
assert.match(image, /height="[1-9]\d*"/);
assert.match(article, /class="image-link"[^>]+target="_blank"/);
console.log(`Notebook preview passed: ${articleCount} articles, historical URLs, archives, local routes, anchors, code and images.`);
