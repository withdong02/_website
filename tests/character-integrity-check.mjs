import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DoubleSide, Raycaster, Vector3 } from "three";

const groups = [
  ["spring-boy.glb", [
    ["boy-front-body", ["boy-front-eye-left", "boy-front-eye-right"]],
    ["boy-side-body", ["boy-side-face-details", "boy-side-eye", "boy-side-smile"]],
  ]],
  ["summer-boy.glb", [["boy-summer-body", ["boy-summer-face"]]]],
  ["autumn-boy.glb", [["boy-autumn-body", ["boy-autumn-eye-left", "boy-autumn-eye-right"]]]],
  ["winter-boy.glb", [
    ["boy-winter-front-body", ["boy-winter-front-eye-left", "boy-winter-front-eye-right"]],
    ["boy-winter-side-body", ["boy-winter-side-face", "boy-winter-side-eye", "boy-winter-side-smile"]],
  ]],
];
const loader = new GLTFLoader();
let meshes = 0;
let facialVertices = 0;
for (const [file, poses] of groups) {
  const bytes = await readFile(new URL(`../public/models/${file}`, import.meta.url));
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(node => {
    if (!node.isMesh) return;
    meshes++;
    const geometry = node.geometry;
    for (const [name, attribute] of Object.entries(geometry.attributes)) {
      assert(Array.from(attribute.array).every(Number.isFinite), `${node.name}: invalid ${name}`);
      if (name !== "position") assert.equal(attribute.count, geometry.attributes.position.count, `${node.name}: attribute mismatch`);
    }
    assert(geometry.index && geometry.index.count % 3 === 0, `${node.name}: invalid triangles`);
    for (const index of geometry.index.array) assert(index < geometry.attributes.position.count, `${node.name}: missing vertex`);
  });
  for (const [bodyName, detailNames] of poses) {
    const body = gltf.scene.getObjectByName(bodyName);
    assert(body, bodyName);
    body.material.side = DoubleSide;
    for (const name of detailNames) {
      const detail = gltf.scene.getObjectByName(name);
      assert(detail, name);
      const positions = detail.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const point = new Vector3().fromBufferAttribute(positions, i).applyMatrix4(detail.matrixWorld);
        const ray = new Raycaster(new Vector3(point.x, point.y, 1), new Vector3(0, 0, -1));
        const [hit] = ray.intersectObject(body, false);
        assert(hit, `${name}: facial vertex ${i} lies outside the head`);
        assert(hit.point.z < point.z - 0.0001, `${name}: facial vertex ${i} is hidden behind the head`);
        facialVertices++;
      }
    }
  }
}

// Keep all six original girl poses and their shared artwork available unchanged.
const original = await readFile(new URL("../public/models/Moving_Characters-transformed.glb", import.meta.url));
assert.equal(createHash("sha256").update(original).digest("hex"), "4f7290dc7b5033217906b43fccffc4071f3096002e4dad0a383541cabc504e30");
const atlas = await readFile(new URL("../public/textures/Moving_Characters_1.webp", import.meta.url));
assert.equal(createHash("sha256").update(atlas).digest("hex"), "c0d912429133cdf500431259bdc93a085b8ffb5dabff27434114cfd4cb136053");
const source = JSON.parse(original.subarray(20, 20 + original.readUInt32LE(12)));
const runtime = await readFile(new URL("../src/Experience/models/Moving_Characters.jsx", import.meta.url), "utf8");
const retainedComments = [...runtime.matchAll(/\{\/\*([\s\S]*?)\*\/\}/g)].map(match => match[1]).join("\n");
for (const suffix of [
  "Spring_front", "Spring_side", "Spring_side_face", "Spring_side_face_smile",
  "Summer_character", "Summer_happy_face", "Summer_left_arm", "Summer_right_arm",
  "Fall_character", "Fall_face", "Fall_left_arm", "Fall_right_arm",
  "Winter_front_character", "Winter_head_front", "Winter_Front_Smile", "Winter_front_smile_face",
  "Winter_arm_left_front", "Winter_arm_right_front", "Winter_side", "Winter_side_face", "Winter_side_face_smile",
  "Winter_left_arm", "Winter_right_arm", "Winter_left_foot", "Winter_right_foot",
]) {
  const name = `Moving_Characters_${suffix}`;
  assert(source.nodes.some(node => node.name === name), `${name}: original node removed`);
  assert(retainedComments.includes(`nodes.${name}.geometry`), `${name}: original JSX reference removed`);
}
assert.equal(meshes, 29);
console.log(`Character integrity passed: 6 poses / ${meshes} meshes, finite geometry, ${facialVertices} visible facial vertices, original girl model/atlas and references preserved.`);
