import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D, Quaternion } from "three";
import { useCurveProgressStore } from "../../../stores/curve-progress.js";
import { useExperienceStore } from "../../../stores/experience.js";
import { winterSnowflake } from "./snowflake.js";

export default function WinterSnowfall() {
  const snow = useRef();
  const time = useRef(0);
  const cursor = useMemo(() => new Object3D(), []);
  const facing = useMemo(() => new Quaternion(), []);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = event => setReducedMotion(event.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useFrame(({ camera }, delta) => {
    if (!snow.current) return;
    const progress = useCurveProgressStore.getState().scrollProgress;
    snow.current.visible = !reducedMotion && (progress < .27 || progress > .96);
    if (!snow.current.visible || document.hidden || useExperienceStore.getState().isInfoPanelOpen) return;
    time.current += Math.min(delta, .05);
    camera.getWorldQuaternion(facing);
    for (let i = 0; i < 56; i++) {
      const flake = winterSnowflake(i, time.current);
      cursor.position.set(flake.x, flake.y, flake.z);
      cursor.quaternion.copy(facing);
      cursor.rotateZ(flake.tilt);
      cursor.scale.setScalar(flake.size);
      cursor.updateMatrix();
      snow.current.setMatrixAt(i, cursor.matrix);
    }
    snow.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={snow} name="winter-light-snowfall" args={[null, null, 56]} visible={false} frustumCulled={false}>
    <circleGeometry args={[1, 6]} />
    <meshBasicMaterial color="#ffffff" transparent opacity={.9} depthWrite={false} />
  </instancedMesh>;
}
