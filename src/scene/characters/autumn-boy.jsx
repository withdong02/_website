import { useGLTF } from "@react-three/drei";
import { PaperPart } from "./paper-part.jsx";

export function AutumnBoy({ material }) {
  const { nodes } = useGLTF("/models/autumn-boy.glb");
  return <group name="autumn-boy-crane">
    {["body", "eye-left", "eye-right", "left-arm", "right-arm"].map(part =>
      <PaperPart key={part} node={nodes[`boy-autumn-${part}`]} material={material} blinking={part.startsWith("eye-")} />
    )}
  </group>;
}

useGLTF.preload("/models/autumn-boy.glb");
