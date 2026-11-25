(() => {
  const button = document.querySelector('.theme-toggle');
  if (!button) return;
  const root = document.documentElement;
  button.setAttribute('aria-pressed', root.getAttribute('data-theme') === 'dark');
  button.addEventListener('click', () => {
    const dark = root.getAttribute('data-theme') !== 'dark';
    if (dark) root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    button.setAttribute('aria-pressed', dark);
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); }
    catch { /* Theme switching still works when storage is unavailable. */ }
  });
})();
