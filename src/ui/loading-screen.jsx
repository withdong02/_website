import React, { useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import "./loading-screen.css";
import { useExperienceStore } from "../stores/experience.js";
import { sceneReturn } from "../scene/navigation.js";

const LoadingScreen = () => {
  const { progress, active } = useProgress();
  const [maxProgress, setMaxProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [gone, setGone] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const setIsExperienceReady = useExperienceStore(
    (state) => state.setIsExperienceReady,
  );
  const isSceneReady = useExperienceStore((state) => state.isSceneReady);
  const isLoaded = maxProgress === 100 && isSceneReady;
  const open = revealed || (Boolean(sceneReturn) && isLoaded);

  const tlRef = useRef(null);
  const trRef = useRef(null);
  const blRef = useRef(null);
  const brRef = useRef(null);

  if (progress > maxProgress && !(active && progress === 100)) {
    setMaxProgress(progress);
  }

  useGSAP(() => {
    if (!open) return;

    setIsExperienceReady(true);

    if (sceneReturn) {
      setGone(true);
      return;
    }

    gsap.to(tlRef.current, {
      top: "-100%",
      left: "-100%",
      duration: 1,
      ease: "power2.inOut",
    });
    gsap.to(trRef.current, {
      top: "-100%",
      right: "-100%",
      duration: 1,
      ease: "power2.inOut",
    });
    gsap.to(blRef.current, {
      bottom: "-100%",
      left: "-100%",
      duration: 1,
      ease: "power2.inOut",
    });
    gsap.to(brRef.current, {
      bottom: "-100%",
      right: "-100%",
      duration: 1,
      ease: "power2.inOut",
      onComplete: () => {
        setGone(true);
      },
    });
  }, [open]);

  // Assets finished downloading AND the scene has mounted/compiled

  if (gone) return null;

  if (sceneReturn) return (
    <div className="loading-screen loading-screen--return" role="status" aria-live="polite">
      <p>Returning to your spot…</p>
    </div>
  );

  return (
    <>
      <div className="loading-screen">
        <div ref={tlRef} className="quadrant quadrant--tl" />
        <div ref={trRef} className="quadrant quadrant--tr" />
        <div ref={blRef} className="quadrant quadrant--bl" />
        <div ref={brRef} className="quadrant quadrant--br" />

        {!open && (
          <>
            <h1 className="title">withdong02's world</h1>
            <div
              className="loading-bar-container"
              role="progressbar"
              aria-label="Loading scene"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(maxProgress)}
            >
              <div
                className="loading-bar-fill"
                style={{ transform: `scaleX(${maxProgress / 100})` }}
              />
              <div
                className="loading-bar-indicator"
                style={{
                  left: `clamp(40px, ${maxProgress}%, calc(100% - 40px))`,
                  transform: "translate(-50%, -50%)",
                  backgroundImage: `url("/images/${isHovered ? "loading-boy-smile" : "loading-boy"}.webp")`,
                }}
              />
            </div>

            <div
              style={{
                backgroundImage: 'url("/images/loading-boy-smile.webp")',
                width: 0,
                height: 0,
                visibility: "hidden",
                position: "absolute",
              }}
            />

            <div
              style={{
                backgroundImage: 'url("/images/loading-boy.webp")',
                width: 0,
                height: 0,
                visibility: "hidden",
                position: "absolute",
              }}
            />
            <div
              style={{
                backgroundImage: 'url("/images/white.webp")',
                width: 0,
                height: 0,
                visibility: "hidden",
                position: "absolute",
              }}
            />
            <div
              style={{
                backgroundImage: 'url("/images/loading-summer.webp")',
                width: 0,
                height: 0,
                visibility: "hidden",
                position: "absolute",
              }}
            />
            <div
              style={{
                backgroundImage: 'url("/images/green.webp")',
                width: 0,
                height: 0,
                visibility: "hidden",
                position: "absolute",
              }}
            />
            <div
              style={{
                backgroundImage: 'url("/images/loading-autumn.webp")',
                width: 0,
                height: 0,
                visibility: "hidden",
                position: "absolute",
              }}
            />

            <a
              href="https://github.com/andrewwoan/aimee-weis-papercraft-world"
              className="credits-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              See full list of credits here!!
            </a>

            <div className="loading-below">
              <div className="instructions">~ Swipe/Scroll to navigate ~</div>
              <div className="enter-slot">
                {isLoaded && (
                  <button
                    className="enter-button"
                    onClick={() => setRevealed(true)}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                  >
                    Enter!
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="torn" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.065"
              numOctaves="4"
              seed="2"
            />
            <feDisplacementMap
              in="SourceGraphic"
              scale="12"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
    </>
  );
};

export default LoadingScreen;
