import { useGLTF } from "@react-three/drei";

// Configure before model modules preload, so self-hosted scenes need no Google CDN.
useGLTF.setDecoderPath("/draco/");
