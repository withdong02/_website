import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

export function mergeBlog(scene, blog) {
  function files(dir, prefix = '') {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const name = path.posix.join(prefix, entry.name);
      return entry.isDirectory() ? files(path.join(dir, entry.name), name) : [name];
    });
  }
  const entries = files(blog).filter(name => name !== 'index.html');
  // Validate the complete merge before writing anything into the scene output.
  for (const name of entries) {
    if (existsSync(path.join(scene, name))) throw new Error(`Scene/blog output collision: ${name}`);
  }
  for (const name of entries) {
    const target = path.join(scene, name);
    mkdirSync(path.dirname(target), { recursive: true });
    if (/^page\/\d+\/index.html$/.test(name)) {
      const page = Number(name.split('/')[1]);
      const url = page === 1 ? '/posts/' : `/posts/page/${page}/`;
      writeFileSync(target, `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${url}"><link rel="canonical" href="${url}"><a href="${url}">Articles</a>`);
    } else cpSync(path.join(blog, name), target);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  mkdirSync(path.join(root, '.tmp/builds'), { recursive: true });
  const stage = mkdtempSync(path.join(root, '.tmp/builds/site-'));
  const scene = path.join(stage, 'site');
  const blog = path.join(stage, 'blog');
  execFileSync(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', scene], { cwd: root, stdio: 'inherit' });
  execFileSync('hugo', ['--source', 'blog', '--destination', blog, '--noBuildLock'], { cwd: root, stdio: 'inherit' });
  mergeBlog(scene, blog);
  for (const route of ['posts', 'tags', 'categories', 'archives']) {
    if (!readFileSync(path.join(scene, route, 'index.html'), 'utf8').includes('Back to scene')) throw new Error(`Missing blog route: ${route}`);
  }
  const destination = path.join(root, 'dist');
  const backup = path.join(stage, 'previous-dist');
  // Both absolute paths stay inside this workspace; keep the previous build for recovery.
  if (existsSync(destination)) renameSync(destination, backup);
  try { cpSync(scene, destination, { recursive: true }); }
  catch (error) {
    if (existsSync(destination)) renameSync(destination, path.join(stage, 'incomplete-dist'));
    if (existsSync(backup)) renameSync(backup, destination);
    throw error;
  }
  console.log('Unified static site built in dist/. Previous output retained under .tmp/.');
}
