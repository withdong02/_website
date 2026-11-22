import { useGLTF } from "@react-three/drei";
import { PaperPart } from "./paper-part.jsx";

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
