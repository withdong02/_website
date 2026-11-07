import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { blinkScale } from "../utils/blink-scale.js";
import { useExperienceStore } from "../../store/useExperienceStore";

// Keep the original face drawing and split eyes for blinking; short hair and
// clothes are cut-paper silhouettes. The original GLB remains untouched.

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

export function SpringBoyFront({ material }) {
  const { nodes } = useGLTF("/models/spring-boy.glb");
  return <group>
    <PaperPart node={nodes["boy-front-body"]} material={material} />
    <PaperPart node={nodes["boy-front-eye-left"]} material={material} blinking />
    <PaperPart node={nodes["boy-front-eye-right"]} material={material} blinking />
  </group>;
}

export function SpringBoySideBody({ material }) {
  const { nodes } = useGLTF("/models/spring-boy.glb");
  return <PaperPart node={nodes["boy-side-body"]} material={material} />;
}

export function SpringBoySideFace({ material }) {
  const { nodes } = useGLTF("/models/spring-boy.glb");
  return <group>
    <PaperPart node={nodes["boy-side-face-details"]} material={material} />
    <PaperPart node={nodes["boy-side-eye"]} material={material} blinking />
  </group>;
}

export function SpringBoySideSmile({ material }) {
  const { nodes } = useGLTF("/models/spring-boy.glb");
  return <PaperPart node={nodes["boy-side-smile"]} material={material} />;
}

useGLTF.preload("/models/spring-boy.glb");
