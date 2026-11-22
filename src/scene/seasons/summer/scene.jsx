import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import { AnimateMesh } from "../../animation/animate-mesh.jsx";
import { useTextureMaterial } from "../../materials/use-texture-material.jsx";
import { useCurveProgressStore } from "../../../stores/curve-progress.js";
import { useCameraStore } from "../../../stores/camera.js";
import { useExperienceStore } from "../../../stores/experience.js";
import { blogPages, rememberScene, sceneLinkInView } from "../../navigation.js";
import "./scene.css";

function SceneBlogLink({ slug, position, remember }) {
  const group = useRef();
  const link = useRef();
  const point = useMemo(() => position.clone(), [position]);
  const wasVisible = useRef(null);
  useFrame(({ camera, size }) => {
    if (!group.current || !link.current) return;
    group.current.getWorldPosition(point).project(camera);
    const visible = sceneLinkInView(point, size.width, size.height);
    if (visible === wasVisible.current) return;
    wasVisible.current = visible;
    link.current.style.visibility = visible ? "visible" : "hidden";
    link.current.tabIndex = visible ? 0 : -1;
  });
  return <group ref={group} position={position}><Html center zIndexRange={[10, 0]}>
    <a ref={link} className="summer-blog-link" href={blogPages[slug]} tabIndex={-1}
      onPointerDown={event => {
        event.stopPropagation();
        // Keep the press on this link while the camera finishes its pointer parallax.
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerUp={event => event.stopPropagation()}
      onClick={event => { event.stopPropagation(); remember(); }}
      aria-label={`Open ${slug[0].toUpperCase() + slug.slice(1)}`} title={`Open ${slug}`} />
  </Html></group>;
}

export default function SummerBlog(props) {
  const inSummer = useCurveProgressStore(state => state.scrollProgress >= .49 && state.scrollProgress < .74);
  const ready = useExperienceStore(state => state.isExperienceReady);
  const infoOpen = useExperienceStore(state => state.isInfoPanelOpen);
  const interactive = inSummer && ready && !infoOpen;
  const { nodes } = useGLTF("/models/summer-blog.glb");
  const atlas1 = useTextureMaterial("/textures/summer-blog-1.webp");
  const atlas2 = useTextureMaterial("/textures/summer-blog-2.webp");
  const atlas3 = useTextureMaterial("/textures/summer-blog-3.webp");
  const atlas4 = useTextureMaterial("/textures/Scene_3_Summer_4.webp");
  const paper = useTextureMaterial("/textures/summer-blog-paper.webp", { side: "double" });
  const text = useTextureMaterial("/textures/summer-blog-text.webp", { side: "double", transparent: true });
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
  const links = useMemo(() => Object.keys(blogPages).map(slug => {
    const node = Object.values(nodes).find(node => node.userData?.module === slug);
    node.geometry.computeBoundingBox();
    const center = node.geometry.boundingBox.getCenter(node.position.clone());
    center.applyMatrix4(node.matrix);
    return { slug: node.userData.module, position: center };
  }), [nodes]);
  const remember = () => rememberScene(useCurveProgressStore.getState().scrollProgress, useCameraStore.getState().zoom);
  useEffect(() => () => { document.body.style.cursor = ""; }, [interactive]);

  return <group {...props} name="summer-blog" dispose={null}>
    {Object.values(nodes).filter(node => node.isMesh && !node.userData.wind_chime).map(node => {
      const slug = Object.keys(blogPages).find(key => node.name.startsWith(`summer-${key}-`));
      const mesh = <mesh key={node.name} name={node.name} geometry={node.geometry}
        onClick={interactive && slug ? event => {
          if (event.delta > 5) return;
          event.stopPropagation(); remember(); window.location.assign(blogPages[slug]);
        } : undefined}
        onPointerOver={interactive && slug ? () => { document.body.style.cursor = "pointer"; } : undefined}
        onPointerOut={interactive && slug ? () => { document.body.style.cursor = ""; } : undefined}
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
    {interactive && links.map(({ slug, position }) => <SceneBlogLink key={slug} slug={slug} position={position} remember={remember} />)}
    {chime.length > 0 && <AnimateMesh position={chime[0].position} axis="z" amplitude={.025} speed={.9} offset={1.1}>
      <group name="summer-shell-wind-chime">
        {chime.map(node => <mesh key={node.name} name={node.name} geometry={node.geometry}
          material={colors[node.userData.paper_color]} rotation={node.rotation} scale={node.scale} />)}
      </group>
    </AnimateMesh>}
  </group>;
}

useGLTF.preload("/models/summer-blog.glb");
