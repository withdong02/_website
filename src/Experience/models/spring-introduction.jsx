import { useGLTF } from "@react-three/drei";
import { useKTX2Texture } from "../utils/ktxLoader";

export default function SpringIntroduction() {
  const { nodes } = useGLTF("/models/spring-introduction.glb");
  const material = useKTX2Texture("/textures/spring-introduction.webp", { side: "double" });
  const textMaterial = useKTX2Texture("/textures/spring-introduction-text.webp", { side: "double", transparent: true });
  return <group name="spring-introduction" dispose={null}>
    {Object.values(nodes).filter(node => node.isMesh).map(node =>
      <mesh key={node.name} name={node.name} geometry={node.geometry}
        material={node.name === "spring-introduction-backdrop" ? material : textMaterial}
        position={node.position} rotation={node.rotation} scale={node.scale} />
    )}
  </group>;
}

useGLTF.preload("/models/spring-introduction.glb");
