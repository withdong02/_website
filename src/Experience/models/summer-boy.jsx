import { useGLTF } from "@react-three/drei";
import { PaperPart } from "./spring-boy";

export function SummerBoy({ material }) {
  const { nodes } = useGLTF("/models/summer-boy.glb");
  return <group name="summer-boy-surfing">
    {["boy-summer-body", "boy-summer-face", "boy-summer-left-arm", "boy-summer-right-arm"].map(name =>
      <PaperPart key={name} node={nodes[name]} material={material} />
    )}
  </group>;
}

useGLTF.preload("/models/summer-boy.glb");
