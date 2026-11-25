(() => {
  document.querySelectorAll('.back-to-scene').forEach(link => link.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem('paper-scene-return'));
      const navigation = window.navigation;
      if (!navigation?.traverseTo) return;
      const entry = navigation.entries().find(entry => entry.key === saved?.entryKey &&
        entry.index < navigation.currentEntry.index &&
        new URL(entry.url).origin === location.origin && new URL(entry.url).pathname === '/');
      if (!entry) return;
      event.preventDefault();
      const result = navigation.traverseTo(entry.key);
      result.committed.catch(error => {
        if (error.name !== 'AbortError') location.assign(link.href);
      });
      result.finished.catch(() => {});
    } catch {
      if (event.defaultPrevented) location.assign(link.href);
    }
  }));
})();
