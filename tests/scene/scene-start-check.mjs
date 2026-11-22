import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { useCurveProgressStore } from "../../src/stores/curve-progress.js";

const start = useCurveProgressStore.getState().scrollProgress;
assert.ok(start > 0.235 && start < 0.49, "The initial scene must be spring");
const setProgress = useCurveProgressStore.getState().setScrollProgress;
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10);

setProgress(0);
closeTo(useCurveProgressStore.getState().scrollProgress, start);
setProgress(0.01);
closeTo(useCurveProgressStore.getState().scrollProgress, start + 0.01);
setProgress(1 - start + 0.01);
closeTo(useCurveProgressStore.getState().scrollProgress, 0.01);
setProgress(1);
closeTo(useCurveProgressStore.getState().scrollProgress, start);

for (const [width, expected, saved] of [
  [390, .26], [763, .26], [764, .335], [1440, .335],
  [390, .26, { progress: .62, zoom: 1.7 }],
]) {
  // Fresh processes exercise module initialization at each width and restored entry.
  execFileSync(process.execPath, ["--input-type=module", "-e", `
    import assert from 'node:assert/strict';
    const saved = ${JSON.stringify(saved ?? null)};
    globalThis.window = { innerWidth: ${width}, location: { search: saved ? '?resume=blog' : '' },
      history: { state: null }, sessionStorage: { getItem: () => JSON.stringify(saved) } };
    const { startProgress } = await import('./src/scene/navigation.js');
    const { useCurveProgressStore } = await import('./src/stores/curve-progress.js');
    const { useCameraStore } = await import('./src/stores/camera.js');
    assert.equal(startProgress, ${expected});
    assert.equal(useCurveProgressStore.getState().scrollProgress, saved?.progress ?? startProgress);
    assert.equal(useCameraStore.getState().zoom, saved?.zoom ?? 1);
    const setProgress = useCurveProgressStore.getState().setScrollProgress;
    const offset = saved ? (saved.progress - startProgress + 1) % 1 : 0;
    setProgress(offset);
    assert.ok(Math.abs(useCurveProgressStore.getState().scrollProgress - (saved?.progress ?? startProgress)) < 1e-10);
    setProgress(offset + .01);
    assert.ok(Math.abs(useCurveProgressStore.getState().scrollProgress - ((saved?.progress ?? startProgress) + .01)) < 1e-10);
    setProgress(1);
    assert.ok(Math.abs(useCurveProgressStore.getState().scrollProgress - startProgress) < 1e-10);
  `], { cwd: new URL("../../", import.meta.url) });
}

console.log("Scene start check passed: desktop/mobile spring starts, saved position/zoom, continuous scrolling and full loop.");
