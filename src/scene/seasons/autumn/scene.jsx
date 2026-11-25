import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import { useTextureMaterial } from "../../materials/use-texture-material.jsx";
import { useCurveProgressStore } from "../../../stores/curve-progress.js";
import { useCameraStore } from "../../../stores/camera.js";
import { useExperienceStore } from "../../../stores/experience.js";
import { rememberScene, sceneLinkInView } from "../../navigation.js";
import albumPhotos from "virtual:album-photos";
import "./scene.css";

function AlbumLink({ node, remember }) {
  const group = useRef();
  const link = useRef();
  const point = useMemo(() => node.position.clone(), [node]);
  useFrame(({ camera, size }) => {
    if (!link.current || !group.current) return;
    group.current.getWorldPosition(point).project(camera);
    const visible = sceneLinkInView(point, size.width, size.height);
    link.current.style.visibility = visible ? "visible" : "hidden";
    link.current.tabIndex = visible ? 0 : -1;
  });
  const position = useMemo(() => {
    node.geometry.computeBoundingBox();
    return node.geometry.boundingBox.getCenter(node.position.clone()).applyMatrix4(node.matrix);
  }, [node]);
  return <group ref={group} position={position}><Html center zIndexRange={[10, 0]}>
    <a ref={link} className="autumn-album-link" href="/albums/" tabIndex={-1} aria-label="打开相册" title="打开相册"
      onPointerDown={event => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerUp={event => event.stopPropagation()}
      onClick={event => { event.stopPropagation(); remember(); }} />
  </Html></group>;
}

function PhotoInsert({ node, src, demo, photo, transparent = false }) {
  const material = useTextureMaterial(src, { side: "double", transparent });
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
    if (photo) {
      // Fit the fixed paper insert without stretching the photograph.
      const frameRatio = node.userData.photo_index < 2 ? 2.10 / 1.36 : 1.95 / 1.24;
      const ratio = photo.width / photo.height;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, .5 + (uv.getX(i) - .5) * Math.min(1, frameRatio / ratio),
          .5 + (uv.getY(i) - .5) * Math.min(1, ratio / frameRatio));
      }
    }
    if (node.userData.book_page !== undefined) {
      for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) + node.userData.book_page) / 2);
    }
    copy.setAttribute("uv", uv);
    return copy;
  }, [node.geometry, node.userData.photo_index, node.userData.book_page, demo, photo]);
  return <mesh name={node.name} geometry={geometry} material={material}
    position={node.position} rotation={node.rotation} scale={node.scale} />;
}

export default function AutumnAlbumSample({ photoUrl, photoUrls = [], ...props }) {
  const inAutumn = useCurveProgressStore(state => state.scrollProgress >= .74 && state.scrollProgress < .99);
  const ready = useExperienceStore(state => state.isExperienceReady);
  const infoOpen = useExperienceStore(state => state.isInfoPanelOpen);
  const interactive = inAutumn && ready && !infoOpen;
  const { nodes } = useGLTF("/models/autumn-album-sample.glb");
  const material = useTextureMaterial("/textures/autumn-album-sample.webp");
  const foldedMaterial = useTextureMaterial("/textures/autumn-album-sample.webp", { side: "double" });
  const meshes = Object.values(nodes).filter(node => node.isMesh);
  const isEntrance = object => /autumn-(photo-|gallery-)/.test(object.name);
  const remember = () => rememberScene(useCurveProgressStore.getState().scrollProgress, useCameraStore.getState().zoom);
  useEffect(() => () => { document.body.style.cursor = ""; }, [interactive]);
  const renderPart = node => {
    if (node.userData.book_page !== undefined) {
      return <PhotoInsert key={node.name} node={node} src="/textures/autumn-book-text.webp" transparent />;
    }
    if (node.name === "autumn-gallery-title") {
      return <PhotoInsert key={node.name} node={node} src="/textures/autumn-gallery-label.webp" />;
    }
    if (node.userData.replaceable_photo) {
      const photo = albumPhotos[node.userData.photo_index];
      const src = photoUrls[node.userData.photo_index] || photoUrl || photo?.thumb;
      return <PhotoInsert key={node.name} node={node}
        src={src || "/textures/autumn-photo-previews.webp"} demo={!src} photo={!photoUrl && !photoUrls.length ? photo : undefined} />;
    }
    return <mesh key={node.name} name={node.name} geometry={node.geometry}
      material={node.name.startsWith("autumn-paper-crane-") ? foldedMaterial : material}
      position={node.position} rotation={node.rotation} scale={node.scale} />;
  };
  return <group {...props} name="autumn-album-sample" dispose={null}
    onClick={interactive ? event => {
      if (!isEntrance(event.object) || event.delta > 5) return;
      const photoIndex = event.object.name.match(/^autumn-photo-(?:insert|frame|clip)-(\d+)$/)?.[1];
      const photo = albumPhotos[photoIndex];
      event.stopPropagation(); remember(); window.location.assign(photo ? `/albums/#photo=${photo.id}` : "/albums/");
    } : undefined}
    onPointerOver={interactive ? event => { if (isEntrance(event.object)) document.body.style.cursor = "pointer"; } : undefined}
    onPointerOut={interactive ? () => { document.body.style.cursor = ""; } : undefined}>
    {meshes.map(renderPart)}
    {interactive && <AlbumLink node={nodes["autumn-gallery-title"]} remember={remember} />}
  </group>;
}

useGLTF.preload("/models/autumn-album-sample.glb");
