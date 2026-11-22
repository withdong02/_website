export const blogPages = {
  articles: "/posts/",
  tags: "/tags/",
  categories: "/categories/",
  archives: "/archives/",
};
export const startProgress = typeof window !== "undefined" && window.innerWidth < 764 ? 0.26 : 0.335;
const storageKey = "paper-scene-return";

export function sceneLinkInView(point, width, height) {
  return point.z >= -1 && point.z <= 1 &&
    Math.abs(point.x) < 1 - 64 / width && Math.abs(point.y) < 1 - 64 / height;
}

export function parseSceneReturn(value) {
  try {
    const state = JSON.parse(value);
    return Number.isFinite(state.progress) && state.progress >= 0 && state.progress < 1 &&
      Number.isFinite(state.zoom) && state.zoom >= 1 && state.zoom <= 3 ? state : null;
  } catch { return null; }
}

export const sceneReturn = (() => {
  if (typeof window === "undefined") return null;
  if (new URLSearchParams(window.location.search).get("resume") !== "blog" && !window.history.state?.blogReturn) return null;
  try { return parseSceneReturn(window.sessionStorage.getItem(storageKey)); }
  catch { return null; }
})();

export function rememberScene(progress, zoom) {
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify({ progress, zoom,
      entryKey: window.navigation?.currentEntry?.key }));
    window.history.replaceState({ ...window.history.state, blogReturn: true }, "");
  } catch { /* Navigation still works when browser storage is unavailable. */ }
}
