import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { blinkScale } from "../animation/blink-scale.js";
import { useExperienceStore } from "../../stores/experience.js";

export function PaperPart({ node, material, blinking = false, meshRef }) {
  const localRef = useRef();
  const ref = meshRef ?? localRef;
  const coloredMaterial = useMemo(() => {
    const copy = material.clone();
    copy.vertexColors = true;
    return copy;
  }, [material]);
  useEffect(() => () => coloredMaterial.dispose(), [coloredMaterial]);
  useFrame(({ clock }) => {
    if (blinking && ref.current && !useExperienceStore.getState().isInfoPanelOpen) {
      ref.current.scale.y = node.scale.y * blinkScale(clock.elapsedTime);
    }
  });
  return <mesh ref={ref} name={node.name} geometry={node.geometry} material={coloredMaterial}
    position={node.position} rotation={node.rotation} scale={node.scale} />;
}
