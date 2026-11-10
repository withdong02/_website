import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { AnimateMesh } from "../components/AnimateMesh";
import { useKTX2Texture } from "../utils/ktxLoader";

export default function SummerBlog(props) {
  const { nodes } = useGLTF("/models/summer-blog.glb");
  const atlas1 = useKTX2Texture("/textures/summer-blog-1.webp");
  const atlas2 = useKTX2Texture("/textures/summer-blog-2.webp");
  const atlas3 = useKTX2Texture("/textures/summer-blog-3.webp");
  const atlas4 = useKTX2Texture("/textures/Scene_3_Summer_4.webp");
  const paper = useKTX2Texture("/textures/summer-blog-paper.webp", { side: "double" });
  const text = useKTX2Texture("/textures/summer-blog-text.webp", { side: "double", transparent: true });
  const colors = useMemo(() => {
    const values = new Set(Object.values(nodes).map(node => node.userData?.paper_color).filter(Boolean));
    return Object.fromEntries([...values].map(color => {
      const material = paper.clone();
      material.color.set(color);
      return [color, material];
    }));
  }, [nodes, paper]);
  useEffect(() => () => Object.values(colors).forEach(material => material.dispose()), [colors]);
  const atlases = { 1: atlas1, 2: atlas2, 3: atlas3, 4: atlas4, text };
  const chime = Object.values(nodes).filter(node => node.isMesh && node.userData.wind_chime);

  return <group {...props} name="summer-blog" dispose={null}>
    {Object.values(nodes).filter(node => node.isMesh && !node.userData.wind_chime).map(node => {
      const mesh = <mesh key={node.name} name={node.name} geometry={node.geometry}
        material={node.userData.paper_color ? colors[node.userData.paper_color] : atlases[node.userData.atlas]}
        position={node.userData.motion ? undefined : node.position} rotation={node.rotation} scale={node.scale} />;
      if (!node.userData.motion) return mesh;
      const motion = node.userData.motion;
      const seaweed = motion === "seaweed";
      const second = node.userData.original_node.includes("2.001_seaweed");
      return <AnimateMesh key={node.name} position={node.position} axis="y"
        property={motion === "umbrella" ? "rotation" : "scale"}
        amplitude={motion === "crab" ? .05 : second ? .3 : .1}
        speed={seaweed ? second ? 2.5 : 2.3 : motion === "crab" ? 5 : 4}
        base={motion === "umbrella" ? 0 : 1.1}
        offset={node.userData.original_node.includes("2.002_seaweed") ? .73 : 2.36}>
        {mesh}
      </AnimateMesh>;
    })}
    {chime.length > 0 && <AnimateMesh position={chime[0].position} axis="z" amplitude={.025} speed={.9} offset={1.1}>
      <group name="summer-shell-wind-chime">
        {chime.map(node => <mesh key={node.name} name={node.name} geometry={node.geometry}
          material={colors[node.userData.paper_color]} rotation={node.rotation} scale={node.scale} />)}
      </group>
    </AnimateMesh>}
  </group>;
}

useGLTF.preload("/models/summer-blog.glb");
