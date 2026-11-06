import { create } from "zustand";
import { createCurves } from "../Experience/components/Curves.js";

const startProgress = 0.335;

export const useCurveProgressStore = create((set) => ({
  curves: createCurves(),
  scrollProgress: startProgress,
  // Offset wheel progress too, keeping the camera, characters and seasons in sync.
  setScrollProgress: (value) =>
    set({ scrollProgress: (value + startProgress) % 1 }),
}));
