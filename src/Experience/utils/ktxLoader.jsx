import * as THREE from "three";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import { useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";

export const useKTX2Texture = (textureUrl, options = {}) => {
  const {
    transparent = false,
    alphaTestValue = 0.6,
    side = "front",
    flipY = false,
  } = options;

  const { gl } = useThree();

  const isKtx2 = textureUrl?.toLowerCase().endsWith(".ktx2");
  const LoaderClass = isKtx2 ? KTX2Loader : THREE.TextureLoader;

  const texture = useLoader(LoaderClass, textureUrl, (loader) => {
    if (isKtx2) {
      loader.setTranscoderPath("/basis/");
      loader.detectSupport(gl);
    }
  });

  useEffect(() => {
    if (texture && isKtx2) {
      gl.initTexture(texture);
    }
  }, [gl, texture, isKtx2]);

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

useKTX2Texture.preload = (url) => {
  const isKtx2 = url?.toLowerCase().endsWith(".ktx2");
  const LoaderClass = isKtx2 ? KTX2Loader : THREE.TextureLoader;

  useLoader.preload(LoaderClass, url, (loader) => {
    if (isKtx2) {
      loader.setTranscoderPath("/basis/");
    }
  });
};
