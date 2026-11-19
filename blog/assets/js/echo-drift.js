(() => {
  const scene = document.querySelector('.echo-drift');
  if (!scene) return;
  const button = scene.querySelector('.echo-drift-toggle');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'paper-season-window-v1';
  let saved;
  try { saved = JSON.parse(sessionStorage.getItem(storageKey)); } catch { /* Storage is optional. */ }
  const elements = [...scene.querySelectorAll('*')];
  // The head restores the season before paint; exact animation clocks take over here.
  document.documentElement.style.removeProperty('--season-elapsed');
  let visible = false;
  let paused = saved?.paused === true;

  function restore() {
    for (const animation of scene.getAnimations({ subtree: true })) {
      const key = `${elements.indexOf(animation.effect.target)}:${animation.animationName}`;
      const time = saved?.times?.[key];
      if (Number.isFinite(time) && time >= 0) animation.currentTime = time;
    }
  }
  function save() {
    const times = { ...saved?.times };
    let elapsed = Number.isFinite(saved?.elapsed) && saved.elapsed >= 0 ? saved.elapsed : 0;
    for (const animation of scene.getAnimations({ subtree: true })) {
      if (!Number.isFinite(animation.currentTime)) continue;
      times[`${elements.indexOf(animation.effect.target)}:${animation.animationName}`] = animation.currentTime;
      if (animation.animationName === 'season-window' && animation.effect.target.classList.contains('echo-season--spring')) elapsed = animation.currentTime;
    }
    saved = { paused, elapsed, times };
    try { sessionStorage.setItem(storageKey, JSON.stringify(saved)); } catch { /* Navigation still works without storage. */ }
  }

  function update() {
    scene.dataset.running = String(visible && !document.hidden && !motion.matches && !paused);
    scene.dataset.paused = String(paused);
    button.hidden = motion.matches;
    const label = paused ? 'Play animation' : 'Pause animation';
    button.setAttribute('aria-label', label);
    button.title = label;
  }
  button.addEventListener('click', () => { paused = !paused; update(); save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); update(); });
  window.addEventListener('pagehide', save);
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      try { saved = JSON.parse(sessionStorage.getItem(storageKey)); } catch { /* Retain the in-memory snapshot. */ }
      paused = saved?.paused === true;
      restore();
    }
    update();
  });
  motion.addEventListener('change', update);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { threshold: 0.1 }).observe(scene);
  }
  restore();
  update();
})();
