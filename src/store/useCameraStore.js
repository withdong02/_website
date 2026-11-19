import { create } from "zustand";
import { sceneReturn } from "../Experience/utils/blog-navigation.js";

export const useCameraStore = create((set) => ({
  zoom: sceneReturn?.zoom ?? 1,
  setZoom: (zoom) => set({ zoom }),
}));
