import React, { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { WebGPURenderer } from "three/webgpu";

import Scene from "./Scene";
import ReactLenis from "lenis/react";
import gsap from "gsap";
import { useCurveProgressStore } from "../store/useCurveProgressStore";
import { useGSAP } from "@gsap/react";
import { useExperienceStore } from "../store/useExperienceStore";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const Experience = () => {
  const setScrollProgress = useCurveProgressStore(
    (state) => state.setScrollProgress,
  );
  const isExperienceReady = useExperienceStore(
    (state) => state.isExperienceReady,
  );
  const isInfoPanelOpen = useExperienceStore((state) => state.isInfoPanelOpen);

  const [lenis, setLenis] = useState(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    const lenisInstance = lenis?.lenis;
    if (!lenisInstance) return;

    if (isExperienceReady && !isInfoPanelOpen) {
      if (!hasStarted.current) {
        // Discard browser-restored scrolling before the first scene interaction.
        lenisInstance.scrollTo(0, { immediate: true, force: true });
        hasStarted.current = true;
      }
      lenisInstance.start();
    } else {
      lenisInstance.stop();
    }
  }, [isExperienceReady, isInfoPanelOpen, lenis]);

  useEffect(() => {
    const lenisInstance = lenis?.lenis;
    if (!lenisInstance) return;

    function update(time) {
      lenisInstance.raf(time * 1000);
    }
    gsap.ticker.add(update);

    const syncScroll = (e) => {
      ScrollTrigger.update();
      setScrollProgress(e.progress);
    };

    lenisInstance.on("scroll", syncScroll);

    return () => {
      lenisInstance.off("scroll", syncScroll);
      gsap.ticker.remove(update);
    };
  }, [lenis, isExperienceReady, setScrollProgress]);

  return (
    <>
      <ReactLenis
        ref={setLenis}
        root
        options={{
          autoRaf: false,
          infinite: true,
          syncTouch: true,
        }}
      >
        <Canvas
          id="canvas-container"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            transformOrigin: "center center",
          }}
          flat
          gl={async (props) => {
            const renderer = new WebGPURenderer({
              ...props,
              logarithmicDepthBuffer: true,
            });
            await renderer.init();
            return renderer;
          }}
        >
          <Scene />
          <color attach="background" args={["#111111"]} />
        </Canvas>
        <div
          style={{ height: "1000vh", width: "100%", pointerEvents: "none" }}
          id="dummy-scroll-div"
        ></div>
      </ReactLenis>
    </>
  );
};

export default Experience;
