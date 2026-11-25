import 'photoswipe/style.css';
import './style.css';
import '../../../blog/assets/js/theme.js';
import '../../../blog/assets/js/starfield.js';
import '../../../blog/assets/js/scene-return.js';

const links = [...document.querySelectorAll('.photo')];
const gallery = document.querySelector('.photo-grid');
const imagesReady = Promise.all(links.map(async link => {
  const img = link.querySelector('img');
  try { await img.decode(); }
  catch {
    link.classList.add('image-failed');
    img.alt = `${img.alt}（照片未能加载，点击重试）`;
  }
})).then(() => {
  gallery?.removeAttribute('aria-busy');
  document.querySelector('.album-loading')?.remove();
});
const photos = links.map(link => ({ src: link.href, msrc: link.querySelector('img').src, width: +link.dataset.pswpWidth, height: +link.dataset.pswpHeight, alt: link.querySelector('img').alt }));
let viewer;
let opening = false;
let returnLink;
let scrollPosition;
let fromHistory = false;
let restoreOnBack = false;
let viewerEntry = !!history.state?.albumPhoto;
let previousHash = '';
const linkedIndex = () => links.findIndex(link => `#photo=${link.dataset.photoId}` === location.hash);
function restorePosition() {
  window.scrollTo(0, scrollPosition);
  returnLink.focus({ preventScroll: true });
}

async function openPhoto(index) {
  if (!links[index]) return;
  if (viewer) { viewer.goTo(index); return; }
  await imagesReady;
  if (opening) return;
  opening = true;
  let PhotoSwipe;
  try { ({ default: PhotoSwipe } = await import('photoswipe')); }
  catch {
    const link = links[linkedIndex()];
    if (link) location.assign(link.href);
    return;
  } finally { opening = false; }
  // Back can cancel the request while the viewer module is loading.
  const activeIndex = linkedIndex();
  if (activeIndex < 0) return;
  returnLink = links[activeIndex];
  scrollPosition = window.scrollY;
  viewer = new PhotoSwipe({ dataSource: photos, index: activeIndex, loop: false, returnFocus: false,
    bgOpacity: 1, showHideAnimationType: 'none', counter: false, zoom: false,
    paddingFn: ({ x, y }) => {
      const space = (y - Math.min(y * .72, 720)) / 2;
      const side = Math.max(x < 600 ? 24 : 48, (x - 1040) / 2);
      return { top: space - 32, bottom: space + 32, left: side, right: side };
    },
    closeTitle: '返回照片墙 (Esc)', arrowPrevTitle: '上一张', arrowNextTitle: '下一张',
    errorMsg: '照片加载失败，请关闭后重试。' });
  viewer.on('afterInit', () => viewer.element.setAttribute('aria-label', '照片预览'));
  viewer.on('change', () => history.replaceState(history.state, '', `#photo=${links[viewer.currIndex].dataset.photoId}`));
  viewer.on('destroy', () => {
    viewer = null;
    if (!fromHistory && linkedIndex() >= 0) {
      if (viewerEntry) { restoreOnBack = true; history.back(); }
      else history.replaceState(history.state, '', `${location.pathname}${location.search}${previousHash}`);
    }
    if (!restoreOnBack) restorePosition();
    fromHistory = false;
    viewerEntry = false;
  });
  viewer.init();
}

gallery?.addEventListener('click', event => {
  const link = event.target.closest('.photo');
  if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  previousHash = location.hash;
  history.pushState({ ...history.state, albumPhoto: true }, '', `#photo=${link.dataset.photoId}`);
  viewerEntry = true;
  openPhoto(links.indexOf(link));
});
window.addEventListener('hashchange', () => {
  const index = linkedIndex();
  if (index < 0) {
    if (viewer) { fromHistory = true; viewer.close(); }
    else if (restoreOnBack) { restoreOnBack = false; restorePosition(); }
  } else { viewerEntry = !!history.state?.albumPhoto; openPhoto(index); }
});
openPhoto(linkedIndex());
