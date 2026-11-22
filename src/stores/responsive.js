import { create } from "zustand";

export const useResponsiveStore = create(() => ({
  isMobile: window.innerWidth < 764,
}));

window.addEventListener("resize", () => {
  const isMobile = window.innerWidth < 764;
  useResponsiveStore.setState({ isMobile });
});
