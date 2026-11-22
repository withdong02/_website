import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";

export const useTextureMaterial = (textureUrl, options = {}) => {
  const {
    transparent = false,
    alphaTestValue = 0.6,
    side = "front",
    flipY = false,
  } = options;

  const texture = useLoader(THREE.TextureLoader, textureUrl);

  const material = useMemo(() => {
    if (!texture) return null;

    /* eslint-disable react-hooks/immutability -- Loader textures are mutable Three.js GPU resources. */
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = flipY;

    texture.generateMipmaps = false;
    /* eslint-enable react-hooks/immutability */

    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent,
      alphaTest: alphaTestValue,
      side: side === "front" ? THREE.FrontSide : THREE.DoubleSide,
    });
  }, [texture, transparent, alphaTestValue, side, flipY]);

  return material;
};

useTextureMaterial.preload = (url) => useLoader.preload(THREE.TextureLoader, url);
