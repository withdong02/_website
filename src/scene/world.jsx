import React, { Suspense, useEffect } from "react";
import { useThree } from "@react-three/fiber";

import MovingCharacters from "./characters/character-rig.jsx";
import Winter from "./seasons/winter/scene.jsx";
import Spring from "./seasons/spring/scene.jsx";
import Summer from "./seasons/summer/scene.jsx";
import Fall from "./seasons/autumn/scene.jsx";
import CustomCamera from "./camera/camera-rig.jsx";
import { useExperienceStore } from "../stores/experience.js";

// Only flag the scene ready once the GPU pipelines are compiled and a few
// frames have actually rendered, otherwise the first visible frames are black.
const SceneReadySentinel = () => {
  const setIsSceneReady = useExperienceStore((state) => state.setIsSceneReady);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    let cancelled = false;
    let raf;

    const run = async () => {
      try {
        await gl.compileAsync?.(scene, camera);
      } catch (e) {
        console.warn("Scene precompile failed", e);
      }
      let frames = 0;
      const tick = () => {
        if (cancelled) return;
        if (++frames >= 3) setIsSceneReady(true);
        else raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    run();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [gl, scene, camera, setIsSceneReady]);
  return null;
};

const Scene = () => {
  return (
    <>
      <CustomCamera />
      <Suspense fallback={null}>
        <MovingCharacters />
        <Winter />
        <Spring />
        <Summer />
        <Fall />
        <SceneReadySentinel />
      </Suspense>
    </>
  );
};

export default Scene;
