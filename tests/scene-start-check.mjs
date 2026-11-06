import assert from "node:assert/strict";
import { useCurveProgressStore } from "../src/store/useCurveProgressStore.js";

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

console.log("Scene start check passed: spring start, continuous scrolling, full loop.");
