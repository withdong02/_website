import { create } from "zustand";
import { createCurves } from "../scene/camera/curves.js";
import { sceneReturn, startProgress } from "../scene/navigation.js";

export const useCurveProgressStore = create((set) => ({
  curves: createCurves(),
  scrollProgress: sceneReturn?.progress ?? startProgress,
  // Offset wheel progress too, keeping the camera, characters and seasons in sync.
  setScrollProgress: (value) =>
    set({ scrollProgress: (value + startProgress) % 1 }),
}));
