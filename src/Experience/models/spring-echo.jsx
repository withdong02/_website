import { useGLTF } from "@react-three/drei";
import { useKTX2Texture } from "../utils/ktxLoader";

export default function SpringEcho() {
  const { nodes } = useGLTF("/models/spring-echo.glb");
  const material = useKTX2Texture("/textures/spring-echo.webp", { side: "double" });
  return <group name="spring-echo" dispose={null}>
    {Object.values(nodes).filter(node => node.isMesh).map(node =>
      <mesh key={node.name} name={node.name} geometry={node.geometry} material={material}
        position={node.position} rotation={node.rotation} scale={node.scale} />
    )}
  </group>;
}

useGLTF.preload("/models/spring-echo.glb");
