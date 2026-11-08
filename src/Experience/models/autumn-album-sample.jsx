import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useKTX2Texture } from "../utils/ktxLoader";

function PhotoInsert({ node, src }) {
  const material = useKTX2Texture(src, { side: "double" });
  const geometry = useMemo(() => {
    const copy = node.geometry.clone();
    copy.setAttribute("uv", copy.attributes.uv1);
    return copy;
  }, [node.geometry]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh name={node.name} geometry={geometry} material={material}
    position={node.position} rotation={node.rotation} scale={node.scale} />;
}

export default function AutumnAlbumSample({ photoUrl, ...props }) {
  const { nodes } = useGLTF("/models/autumn-album-sample.glb");
  const material = useKTX2Texture("/textures/autumn-album-sample.webp");
  return <group {...props} name="autumn-album-sample" dispose={null}>
    {Object.values(nodes).filter(node => node.isMesh).map(node => {
      if (photoUrl && node.name.startsWith("autumn-photo-placeholder-")) return null;
      if (photoUrl && node.name === "autumn-photo-insert") {
        return <PhotoInsert key={node.name} node={node} src={photoUrl} />;
      }
      return <mesh key={node.name} name={node.name} geometry={node.geometry} material={material}
        position={node.position} rotation={node.rotation} scale={node.scale} />;
    })}
  </group>;
}

useGLTF.preload("/models/autumn-album-sample.glb");
