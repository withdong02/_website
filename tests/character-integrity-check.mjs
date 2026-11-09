import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DoubleSide, Raycaster, Vector3 } from "three";
import { blinkScale } from "../src/Experience/utils/blink-scale.js";

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
const models = new Map();
const hashes = new Map();
const meshCounts = { "spring-boy.glb": 7, "summer-boy.glb": 4, "autumn-boy.glb": 5, "winter-boy.glb": 13 };
let meshes = 0;
let facialVertices = 0;
for (const [file, poses] of groups) {
  const bytes = await readFile(new URL(`../public/models/${file}`, import.meta.url));
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
  models.set(file, gltf);
  hashes.set(file, createHash("sha256").update(bytes).digest("hex"));
  assert.equal(gltf.parser.json.meshes.length, meshCounts[file]);
  assert(!gltf.parser.json.images?.length, `${file}: reuse the shared character atlas`);
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(node => {
    if (!node.isMesh) return;
    meshes++;
    const geometry = node.geometry;
    assert(geometry.attributes.uv, `${node.name}: missing shared-atlas UVs`);
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

const get = (file, name) => {
  const node = models.get(file).scene.getObjectByName(name);
  assert(node, `${file}: missing ${name}`);
  return node;
};
for (const [name, parts] of Object.entries({
  "boy-front-body": [6,9,10,29,30,31,32,38],
  "boy-front-eye-left": [15,19,21,23,25,27],
  "boy-front-eye-right": [16,20,22,24,26,28],
  "boy-side-body": [5,9,13,42],
  "boy-side-eye": [1,2,3,4,5,6,7,8,9],
  "boy-side-face-details": [0,10],
  "boy-side-smile": [0,1,2,3,4,5],
})) {
  const node = get("spring-boy.glb",name);
  const kept = node.userData.source_parts.split(",").map(Number);
  for (const part of parts) assert(kept.includes(part), `${name}: lost source part ${part}`);
  assert(node.userData.source_faces > 0);
  if (!name.endsWith("body")) assert.equal(node.geometry.index.count,node.userData.source_faces*3,`${name}: unexpected facial overlays`);
}
for (const name of ["boy-front-eye-left","boy-front-eye-right","boy-side-eye"]) {
  const eye = get("spring-boy.glb",name);
  eye.geometry.computeBoundingBox();
  assert(Math.abs(eye.geometry.boundingBox.getCenter(new Vector3()).y)<.02,`${name}: blink pivot is not at the eye center`);
}
const summerBody = get("summer-boy.glb","boy-summer-body");
for (const part of [12,27,28,29,30]) assert(summerBody.userData.source_parts.split(",").map(Number).includes(part),"Keep the board, support and bare legs");
for (const [file,name] of [["spring-boy.glb","boy-front-body"],["spring-boy.glb","boy-side-body"],["summer-boy.glb","boy-summer-body"]]) {
  assert(get(file,name).geometry.attributes.color,`${name}: missing approved hair tint`);
}
for (const [file,name,pivot] of [
  ["summer-boy.glb","boy-summer-left-arm",[.3920535,.8337746,-.0621367]],
  ["summer-boy.glb","boy-summer-right-arm",[-.3237659,.8715670,.0287676]],
  ["winter-boy.glb","boy-winter-side-left-arm",[-.09515,1.10354,.03457]],
  ["winter-boy.glb","boy-winter-side-right-arm",[-.094,1.10354,.07591]],
  ["winter-boy.glb","boy-winter-side-left-foot",[-.06326,.549,.04517]],
  ["winter-boy.glb","boy-winter-side-right-foot",[-.07666,.55099,.06701]],
]) {
  const node = get(file,name);
  pivot.forEach((value,i)=>assert(Math.abs(node.position.getComponent(i)-value)<.0001,`${name}: animation pivot drifted`));
  if (file==="winter-boy.glb") assert(node.quaternion.toArray().every((v,i)=>Math.abs(v-(i===3?1:0))<.0001),`${name}: walking axes changed`);
}
for (const [file,expected] of [["spring-boy.glb","50881fd38e692ca166cd45459104fb8edeff7a6cd42566ced804dbff61350d6a"],["summer-boy.glb","1a5e976c711d7e9a2a72b9884a1ea3b653ee1bf8a410fdaa034a5f7c0d2b9966"]]) {
  assert.equal(hashes.get(file),expected,`${file}: approved source changed`);
}
assert(["50881fd38e692ca166cd45459104fb8edeff7a6cd42566ced804dbff61350d6a","aa7fd67c92a3d40b4168aee68d27af08ff8bb843050e4c6d54b06a0485334f90"].includes(summerBody.userData.approved_spring_sha256));
assert.equal(blinkScale(0),1);
assert.equal(blinkScale(4.675),.04);
assert.equal(blinkScale(4.8),1);
assert(blinkScale(4.6)>blinkScale(4.65) && blinkScale(4.7)<blinkScale(4.75));
for (let time=0;time<20;time+=.01) assert(blinkScale(time)>=.04 && blinkScale(time)<=1.000001);

// Keep all six original girl poses and their shared artwork available unchanged.
const original = await readFile(new URL("../public/models/Moving_Characters-transformed.glb", import.meta.url));
assert.equal(createHash("sha256").update(original).digest("hex"), "4f7290dc7b5033217906b43fccffc4071f3096002e4dad0a383541cabc504e30");
const atlas = await readFile(new URL("../public/textures/Moving_Characters_1.webp", import.meta.url));
assert.equal(createHash("sha256").update(atlas).digest("hex"), "c0d912429133cdf500431259bdc93a085b8ffb5dabff27434114cfd4cb136053");
const source = JSON.parse(original.subarray(20, 20 + original.readUInt32LE(12)));
const runtime = await readFile(new URL("../src/Experience/models/Moving_Characters.jsx", import.meta.url), "utf8");
const walking = runtime.match(/<WinterBoySide[\s\S]*?\/>/)?.[0];
assert(walking,"Walking replacement is not rendered");
for (const ref of ["winterLeftArmRef","winterRightArmRef","winterLeftFootRef","winterRightFootRef","winterSideFaceRef","winterSideFaceSmileRef"]) assert(walking.includes(`={${ref}}`),`${ref}: disconnected walking part`);
assert(runtime.includes("<SummerBoy material={texture_1} />"));
assert(runtime.includes("nodes.Moving_Characters_Summer_character_Wave.geometry"),"Keep the separate wave");
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
console.log(`Character integrity passed: 6 poses / ${meshes} meshes, ${facialVertices} visible facial vertices, source parts, animation pivots, blink cycle and original assets.`);
