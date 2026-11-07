import { useGLTF } from "@react-three/drei";
import { PaperPart } from "./spring-boy";

export function AutumnBoy({ material }) {
  const { nodes } = useGLTF("/models/autumn-boy.glb");
  return <group name="autumn-boy-crane">
    {["body", "eye-left", "eye-right", "left-arm", "right-arm"].map(part =>
      <PaperPart key={part} node={nodes[`boy-autumn-${part}`]} material={material} blinking={part.startsWith("eye-")} />
    )}
  </group>;
}

export function WinterBoyFront({ material }) {
  const { nodes } = useGLTF("/models/winter-boy.glb");
  return <group name="winter-boy-standing">
    {["body", "eye-left", "eye-right", "left-arm", "right-arm"].map(part =>
      <PaperPart key={part} node={nodes[`boy-winter-front-${part}`]} material={material} blinking={part.startsWith("eye-")} />
    )}
  </group>;
}

export function WinterBoySide({ material, leftArmRef, rightArmRef, leftFootRef, rightFootRef, faceRef, smileRef }) {
  const { nodes } = useGLTF("/models/winter-boy.glb");
  return <group name="winter-boy-walking">
    <PaperPart node={nodes["boy-winter-side-body"]} material={material} />
    <PaperPart node={nodes["boy-winter-side-left-arm"]} material={material} meshRef={leftArmRef} />
    <PaperPart node={nodes["boy-winter-side-right-arm"]} material={material} meshRef={rightArmRef} />
    <PaperPart node={nodes["boy-winter-side-left-foot"]} material={material} meshRef={leftFootRef} />
    <PaperPart node={nodes["boy-winter-side-right-foot"]} material={material} meshRef={rightFootRef} />
    <group ref={faceRef}>
      <PaperPart node={nodes["boy-winter-side-face"]} material={material} />
      <PaperPart node={nodes["boy-winter-side-eye"]} material={material} blinking />
    </group>
    <group ref={smileRef}>
      <PaperPart node={nodes["boy-winter-side-smile"]} material={material} />
    </group>
  </group>;
}

useGLTF.preload("/models/autumn-boy.glb");
useGLTF.preload("/models/winter-boy.glb");
