import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const script = (await readFile(new URL('../../src/ui/albums/main.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '').replace("import('photoswipe')", 'loadPhotoSwipe()');
const settled = () => new Promise(resolve => setImmediate(resolve));
function browser(hash = '', state = {}, deferred = false, imagesPending = false) {
  const events = target => Object.assign(target, {
    handlers: {},
    addEventListener(type, handler) { this.handlers[type] = handler; },
    on(type, handler) { this.handlers[type] = handler; },
    dispatch(type, event = {}) { this.handlers[type]?.(event); },
  });
  const links = ['first', 'second', 'third'].map(id => ({
    href: `https://example.test/${id}.webp`, dataset: { photoId: id, pswpWidth: '1200', pswpHeight: '800' }, classList: new Set(), image: events({ alt: id, src: `https://example.test/${id}-thumb.webp` }),
    querySelector() { return this.image; }, focus(options) { this.focusOptions = options; },
  }));
  links.forEach(link => { link.image.decode = () => imagesPending ? new Promise((resolve,reject) => {link.loaded=resolve;link.failed=reject;}) : Promise.resolve(); });
  const gallery = events({ busy:true, removeAttribute() {this.busy=false;} });
  const loading = {removed:false,remove(){this.removed=true;}};
  const document = { querySelectorAll: () => links, querySelector: selector => selector === '.album-loading' ? loading : gallery };
  const location = { pathname: '/albums/', search: '', hash, assign(url) { this.assigned = url; } };
  const history = { state, backs: 0,
    pushState(value, _, url) { this.state = value; location.hash = url; },
    replaceState(value, _, url) { this.state = value; location.hash = url.includes('#') ? url.slice(url.indexOf('#')) : ''; },
    back() { this.backs++; location.hash = ''; queueMicrotask(() => window.dispatch('hashchange')); },
  };
  const window = events({ scrollY: 420, scrollTo(x, y) { this.restoredScroll = [x, y]; } });
  const instances = [];
  class PhotoSwipe {
    constructor(options) {
      events(this); this.options = options; this.currIndex = options.index;
      this.element = { setAttribute() {} }; instances.push(this);
    }
    init() { this.open = true; this.dispatch('change'); this.dispatch('afterInit'); }
    goTo(index) { this.currIndex = index; this.dispatch('change'); }
    close() { this.open = false; this.dispatch('destroy'); }
  }
  let resolveModule, rejectModule;
  const pending = deferred ? new Promise((resolve, reject) => { resolveModule = resolve; rejectModule = reject; }) : Promise.resolve({ default: PhotoSwipe });
  vm.runInNewContext(script, { document, window, location, history, loadPhotoSwipe: () => pending });
  return { links, location, history, window, instances, gallery, loading, get viewer() { return instances.at(-1); },
    resolveModule() { resolveModule({ default: PhotoSwipe }); }, rejectModule() { rejectModule(Error('Network failure')); },
    click(index, extras = {}) {
      const event = { target: { closest: () => links[index] }, button: 0, preventDefault() { this.prevented = true; }, ...extras };
      gallery.dispatch('click', event); return event;
    },
  };
}

const page = browser();
assert(!page.click(1, { ctrlKey: true }).prevented, 'Modified clicks retain native image links');
assert.equal(page.instances.length, 0);
assert(page.click(1).prevented);
await settled();
assert.equal(page.viewer.currIndex, 1);
assert.equal(page.viewer.options.dataSource.length, 3);
assert.equal(page.viewer.options.dataSource[1].msrc, page.links[1].image.src, 'Use the existing thumbnail while the full image loads');
assert.equal(page.location.hash, '#photo=second');
page.viewer.goTo(2);
assert.equal(page.location.hash, '#photo=third', 'Changing photos updates the shareable URL');
page.viewer.close();
await settled();
assert.equal(page.history.backs, 1);
assert.deepEqual(page.window.restoredScroll, [0, 420]);
assert.equal(page.links[1].focusOptions.preventScroll, true);

const loading = browser('#photo=first', {}, false, true);
loading.links[0].loaded(); loading.links[1].loaded();
await settled();
assert(loading.gallery.busy && !loading.loading.removed, 'Keep the whole wall hidden while any image is pending');
assert.equal(loading.instances.length,0,'Deep links also wait for image decoding');
loading.links[2].failed(Error('Image unavailable'));
await settled();
assert(!loading.gallery.busy && loading.loading.removed, 'A failed image must not block the ready wall');
assert(loading.links[2].classList.has('image-failed'));
assert.match(loading.links[2].image.alt,/未能加载/);
assert.equal(loading.viewer.currIndex,0);

const direct = browser('#photo=third');
await settled();
assert.equal(direct.viewer.currIndex, 2);
direct.viewer.close();
assert.equal(direct.location.hash, '');
assert.equal(direct.history.backs, 0, 'Closing an external deep link stays on the photo wall');
const refreshed = browser('#photo=second', { albumPhoto: true });
await settled();
refreshed.viewer.close();
assert.equal(refreshed.history.backs, 1, 'Refresh preserves the viewer history entry');

const back = browser();
back.click(2);
await settled();
back.location.hash = '';
back.window.dispatch('hashchange');
assert(!back.viewer.open);
assert.equal(back.history.backs, 0, 'Back closes without creating a second Back');
back.location.hash = '#photo=third';
back.window.dispatch('hashchange');
await settled();
assert(back.viewer.open, 'Forward reopens the photo');
back.location.hash = '#photo=first';
back.window.dispatch('hashchange');
assert.equal(back.viewer.currIndex, 0);

const cancelled = browser('#photo=first', {}, true);
cancelled.location.hash = '';
cancelled.window.dispatch('hashchange');
cancelled.resolveModule();
await settled();
assert.equal(cancelled.instances.length, 0, 'Back during loading cancels the pending open');
const failed = browser('#photo=second', {}, true);
failed.rejectModule();
await settled();
assert.equal(failed.location.assigned, failed.links[1].href, 'A failed module load retains native image access');
console.log('Album viewer passed: exact photo entry, URL changes, scroll/focus restoration, refresh, Back/Forward, loading cancellation and native fallback.');
