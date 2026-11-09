import { useGLTF } from "@react-three/drei";
import { DoubleSide } from "three";
import { AnimateMesh } from "../components/AnimateMesh";
import { useKTX2Texture } from "../utils/ktxLoader";

export default function SpringButterflies() {
  const { nodes } = useGLTF("/models/spring-butterflies.glb");
  const original = useKTX2Texture("/textures/Scene_2_Spring_2.webp", { side: "double" });
  const paper = useKTX2Texture("/textures/spring-butterfly-paper.webp", { side: "double" });
  const butterfly = (name) => ["body","wings"].map(part => {
    const node = nodes[`spring-butterfly-${name}-${part}`];
    return <mesh key={part} name={node.name} geometry={node.geometry} material={node.userData.paper_color ? undefined : original}>
      {node.userData.paper_color && <meshBasicMaterial map={paper.map} color={node.userData.paper_color} side={DoubleSide} />}
    </mesh>;
  });
  return <group name="spring-butterflies" dispose={null}>
    {["surroundings","thread"].map(part => {
      const node = nodes[`spring-butterfly-${part}`];
      return <mesh key={part} name={node.name} geometry={node.geometry} material={original} />;
    })}
    <group name="spring-butterfly-main" position={nodes["spring-butterfly-main-body"].position}>
      {butterfly("main")}
    </group>
    {["apricot","lilac","blue"].map((name,i) =>
      <AnimateMesh key={name} position={nodes[`spring-butterfly-${name}-body`].position}
        animations={[{ property:"rotation",axis:"z",amplitude:.06,speed:.7+i*.15,offset:i*2 }]}>
        <group name={`spring-butterfly-${name}`}>{butterfly(name)}</group>
      </AnimateMesh>
    )}
  </group>;
}

useGLTF.preload("/models/spring-butterflies.glb");
