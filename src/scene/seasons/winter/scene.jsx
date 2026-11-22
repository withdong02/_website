import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { AnimateMesh } from "../../animation/animate-mesh.jsx";
import { useTextureMaterial } from "../../materials/use-texture-material.jsx";
import WinterSnowfall from "./snowfall.jsx";

const motions = {
  deer: { axis: "z", amplitude: .2, speed: 1.5 },
  "note-1": { axis: "z", amplitude: .01 },
  "note-2": { axis: "z", amplitude: .012, speed: .95 },
  "note-3": { axis: "z", amplitude: .011, speed: .99, offset: .3 },
  "snowman-right": { axis: "x", amplitude: .5, speed: 2, offset: 2.6 },
  "snowman-left": { axis: "x", amplitude: .5, speed: 2 },
};

export default function WinterLetters(props) {
  const { nodes } = useGLTF("/models/winter-letters.glb");
  const atlas1 = useTextureMaterial("/textures/winter-snow-wall.webp");
  const atlas2 = useTextureMaterial("/textures/Scene_1_Winter_2.webp");
  const atlas3 = useTextureMaterial("/textures/Scene_1_Winter_3.webp");
  const atlas4 = useTextureMaterial("/textures/Scene_1_Winter_4.webp");
  const contact = useTextureMaterial("/textures/winter-contact-label.webp", { side: "double" });
  const paper = useTextureMaterial("/textures/Scene_1_Winter_4.webp", { side: "double" });
  const tinted = useMemo(() => {
    const colors = new Set(Object.values(nodes).map(node => node.userData?.paper_tint).filter(Boolean));
    const result = Object.fromEntries([...colors].map(color => {
      const material = paper.clone();
      material.color.set(color);
      return [color, material];
    }));
    const cabin = atlas2.clone();
    cabin.color.setRGB(...nodes["winter-cabin-wood"].userData.wood_gain);
    result.cabin = cabin;
    result.wall = atlas1.clone();
    result.wall.color.setRGB(...nodes["winter-Scene_1_Winter_1_Baked"].userData.surface_gain);
    result.ground = atlas4.clone();
    result.ground.color.setRGB(...nodes["winter-Scene_1_Winter_4_Baked"].userData.surface_gain);
    return result;
  }, [nodes, paper, atlas1, atlas2, atlas4]);
  useEffect(() => () => Object.values(tinted).forEach(material => material.dispose()), [tinted]);
  const atlases = { 1: atlas1, 2: atlas2, 3: atlas3, 4: atlas4, contact };
  const fires = useRef({});
  useFrame(({ clock }) => {
    const snap = Math.floor(clock.elapsedTime * 2.2);
    const angle = (Math.sin(snap * 127.1) * 43758.5453) % (Math.PI * 2);
    for (const [motion, mesh] of Object.entries(fires.current)) {
      if (mesh) mesh.rotation.y = motion === "fire-center" ? angle : -angle;
    }
  });
  return <group {...props} name="winter-letters" dispose={null}>
    {Object.values(nodes).filter(node => node.isMesh).map(node => {
      const data = node.userData;
      const animation = motions[data.motion];
      const fire = data.motion?.startsWith("fire-");
      const mesh = <mesh key={node.name} name={node.name} geometry={node.geometry}
        ref={fire ? mesh => { fires.current[data.motion] = mesh; } : undefined}
        material={data.surface_gain ? data.atlas === 1 ? tinted.wall : tinted.ground : data.warm_wood ? tinted.cabin : data.atlas === "contact" ? contact : data.paper_tint ? tinted[data.paper_tint] : atlases[data.atlas]}
        position={animation ? undefined : node.position} rotation={node.rotation} scale={node.scale} />;
      return animation ? <AnimateMesh key={node.name} position={node.position} {...animation}>{mesh}</AnimateMesh> : mesh;
    })}
    <WinterSnowfall />
  </group>;
}

useGLTF.preload("/models/winter-letters.glb");
