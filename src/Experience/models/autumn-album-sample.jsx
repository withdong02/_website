import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useKTX2Texture } from "../utils/ktxLoader";

function PhotoInsert({ node, src, demo, transparent = false }) {
  const material = useKTX2Texture(src, { side: "double", transparent });
  const geometry = useMemo(() => {
    // Keep the cached GLTF geometry alive, including its WebGPU index buffer.
    const copy = node.geometry;
    const uv = copy.attributes.uv1.clone();
    if (demo) {
      const index = node.userData.photo_index;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, (uv.getX(i) + index % 3) / 3,
          (uv.getY(i) + Math.floor(index / 3)) / 2);
      }
    }
    if (node.userData.book_page !== undefined) {
      for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) + node.userData.book_page) / 2);
    }
    copy.setAttribute("uv", uv);
    return copy;
  }, [node.geometry, node.userData.photo_index, node.userData.book_page, demo]);
  return <mesh name={node.name} geometry={geometry} material={material}
    position={node.position} rotation={node.rotation} scale={node.scale} />;
}

export default function AutumnAlbumSample({ photoUrl, photoUrls = [], ...props }) {
  const { nodes } = useGLTF("/models/autumn-album-sample.glb");
  const material = useKTX2Texture("/textures/autumn-album-sample.webp");
  const foldedMaterial = useKTX2Texture("/textures/autumn-album-sample.webp", { side: "double" });
  const meshes = Object.values(nodes).filter(node => node.isMesh);
  const renderPart = node => {
    if (node.userData.book_page !== undefined) {
      return <PhotoInsert key={node.name} node={node} src="/textures/autumn-book-text.webp" transparent />;
    }
    if (node.name === "autumn-gallery-title") {
      return <PhotoInsert key={node.name} node={node} src="/textures/autumn-gallery-label.webp" />;
    }
    if (node.userData.replaceable_photo) {
      const src = photoUrls[node.userData.photo_index] || photoUrl;
      return <PhotoInsert key={node.name} node={node}
        src={src || "/textures/autumn-photo-previews.webp"} demo={!src} />;
    }
    return <mesh key={node.name} name={node.name} geometry={node.geometry}
      material={node.name.startsWith("autumn-paper-crane-") ? foldedMaterial : material}
      position={node.position} rotation={node.rotation} scale={node.scale} />;
  };
  return <group {...props} name="autumn-album-sample" dispose={null}>
    {meshes.map(renderPart)}
  </group>;
}

useGLTF.preload("/models/autumn-album-sample.glb");
