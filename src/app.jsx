import { useRef, useEffect } from "react";
import "./app.css";
import Experience from "./scene/viewport.jsx";
import Border from "./ui/border.jsx";
import ZoomSlider from "./ui/zoom-slider.jsx";
import LoadingScreen from "./ui/loading-screen.jsx";
import InfoPanel from "./ui/info-panel.jsx";
import InfoButton from "./ui/info-button.jsx";
import { useExperienceStore } from "./stores/experience.js";
import { useResponsiveStore } from "./stores/responsive.js";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

function App() {
  const isInfoPanelOpen = useExperienceStore((state) => state.isInfoPanelOpen);
  const isMobile = useResponsiveStore((state) => state.isMobile);
  const tlRef = useRef(null);

  useGSAP(() => {
    if (tlRef.current) {
      tlRef.current.revert();
      tlRef.current.kill();
    }

    const commonEase = { duration: 0.7, ease: "power3.inOut" };

    tlRef.current = isMobile
      ? gsap
          .timeline({ paused: true })
          .to("#canvas-container", {
            scale: 0.4,
            borderRadius: "32px",
            transformOrigin: "center 160px",
            ...commonEase,
          })
          .to(
            ".full-page-border",
            {
              scale: 0.4,
              borderRadius: "32px",
              transformOrigin: "center 160px",
              ...commonEase,
            },
            "<",
          )
          .to(
            ".zoom-slider-wrapper",
            {
              opacity: 0,
              pointerEvents: "none",
              duration: 0.3,
            },
            "<",
          )
      : gsap
          .timeline({ paused: true })
          .to("#canvas-container", {
            scale: 0.6,
            borderRadius: "32px",
            transformOrigin: "20px center",
            ...commonEase,
          })
          .to(
            ".full-page-border",
            {
              scale: 0.6,
              borderRadius: "32px",
              transformOrigin: "20px center",
              ...commonEase,
            },
            "<",
          )
          .to(
            ".zoom-slider-wrapper",
            {
              scale: 0.6,
              opacity: 0,
              pointerEvents: "none",
              duration: 0.3,
            },
            "<",
          );

    if (isInfoPanelOpen) tlRef.current.progress(1);
  }, [isMobile]);

  useEffect(() => {
    if (!tlRef.current) return;
    isInfoPanelOpen ? tlRef.current.play() : tlRef.current.reverse();
  }, [isInfoPanelOpen]);

  return (
    <>
      <LoadingScreen />
      <InfoPanel />
      <InfoButton />
      <ZoomSlider />
      <Border />
      <Experience />
    </>
  );
}

export default App;
