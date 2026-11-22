import { create } from "zustand";
import { sceneReturn } from "../scene/navigation.js";

export const useCameraStore = create((set) => ({
  zoom: sceneReturn?.zoom ?? 1,
  setZoom: (zoom) => set({ zoom }),
}));
