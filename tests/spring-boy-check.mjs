import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { blinkScale } from "../src/Experience/utils/blink-scale.js";

assert.equal(blinkScale(0), 1);
assert.equal(blinkScale(4), 1);
assert.equal(blinkScale(4.675), 0.04);
assert.equal(blinkScale(4.8), 1);
for (let time = 0; time < 20; time += 0.01) {
  assert.ok(blinkScale(time) >= 0.04 && blinkScale(time) <= 1.000001);
}
assert.ok(blinkScale(4.6) > blinkScale(4.65));
assert.ok(blinkScale(4.7) < blinkScale(4.75));

const model = await readFile(new URL("../public/models/spring-boy.glb", import.meta.url));
assert.equal(model.readUInt32LE(8), model.length);
const gltf = JSON.parse(model.subarray(20, 20 + model.readUInt32LE(12)));
const required = [
  "boy-front-body", "boy-front-eye-left", "boy-front-eye-right",
  "boy-side-body", "boy-side-eye", "boy-side-face-details", "boy-side-smile",
];
assert.equal(gltf.meshes.length, 7);
for (const name of required) assert(gltf.nodes.some(node => node.name === name), name);
for (const mesh of gltf.meshes) {
  for (const primitive of mesh.primitives) assert("TEXCOORD_0" in primitive.attributes);
}
assert(!gltf.images?.length, "Reuse the original atlas rather than duplicating it");

// Original face/expression components stay independently available for animation.
const preserved = {
  "boy-front-body": [6, 9, 10, 29, 30, 31, 32, 38],
  "boy-front-eye-left": [15, 19, 21, 23, 25, 27],
  "boy-front-eye-right": [16, 20, 22, 24, 26, 28],
  "boy-side-body": [5, 9, 13, 42],
  "boy-side-eye": [1, 2, 3, 4, 5, 6, 7, 8, 9],
  "boy-side-face-details": [0, 10],
  "boy-side-smile": [0, 1, 2, 3, 4, 5],
};
for (const [name, parts] of Object.entries(preserved)) {
  const node = gltf.nodes.find(n => n.name === name);
  const kept = new Set((node.extras?.source_parts ?? "").split(",").map(Number));
  for (const part of parts) assert(kept.has(part), `${name} lost original part ${part}`);
  assert(node.extras?.source_faces > 0, `${name} has no original faces`);
}

// Use the upstream eye drawing, without adding the rejected concentric discs.
for (const name of ["boy-front-eye-left", "boy-front-eye-right", "boy-side-eye", "boy-side-smile", "boy-side-face-details"]) {
  const node = gltf.nodes.find(n => n.name === name);
  const primitive = gltf.meshes[node.mesh].primitives[0];
  assert.equal(gltf.accessors[primitive.indices].count, node.extras.source_faces * 3, `${name}: extra face/eye overlays`);
}
for (const name of ["boy-front-eye-left", "boy-front-eye-right"]) {
  const node = gltf.nodes.find(n => n.name === name);
  const position = gltf.meshes[node.mesh].primitives[0].attributes.POSITION;
  const { min, max } = gltf.accessors[position];
  assert(max[0] - min[0] > 0.18 && max[0] - min[0] < 0.215, "Keep the preferred small eye width");
  assert(max[1] - min[1] > 0.15 && max[1] - min[1] < 0.18, "Keep the preferred small eye height");
  assert(Math.abs(Math.abs(node.translation[0]) - 0.165) < 0.001, "Blink pivot follows reference eye spacing");
  assert(Math.abs(node.translation[1] - 1.17) < 0.001, "Blink pivot follows the selected reference layout");
  assert(Math.abs((min[1] + max[1]) / 2) < 0.02, "Blink closes around the eye center rather than the old position");
}

for (const name of ["boy-front-body", "boy-side-body"]) {
  const node = gltf.nodes.find(n => n.name === name);
  const primitive = gltf.meshes[node.mesh].primitives[0];
  assert("COLOR_0" in primitive.attributes, `${name}: hair tint missing from exported geometry`);
}

const sideEye = gltf.nodes.find(n => n.name === "boy-side-eye");
const sidePositions = gltf.meshes[sideEye.mesh].primitives[0].attributes.POSITION;
const sideBounds = gltf.accessors[sidePositions];
assert(Math.abs(sideEye.translation[1] - 1.33) < 0.001, "Side blink pivot follows the matched head");
assert(sideBounds.max[1] - sideBounds.min[1] < 0.18, "Side eye stays small like the approved front");
assert(Math.abs((sideBounds.min[1] + sideBounds.max[1]) / 2) < 0.02, "Side blink closes around its new center");

// The upstream girl geometry and its commented-out JSX must still exist.
const original = await readFile(new URL("../public/models/Moving_Characters-transformed.glb", import.meta.url));
assert.equal(
  createHash("sha256").update(original).digest("hex"),
  "4f7290dc7b5033217906b43fccffc4071f3096002e4dad0a383541cabc504e30",
);
const upstream = JSON.parse(original.subarray(20, 20 + original.readUInt32LE(12)));
for (const suffix of ["front", "side", "side_face", "side_face_smile", "side_back_wheel", "side_front_wheel"]) {
  const name = `Moving_Characters_Spring_${suffix}`;
  assert(upstream.nodes.some(n => n.name === name), `${name} missing from source model`);
}
const component = await readFile(new URL("../src/Experience/models/Moving_Characters.jsx", import.meta.url), "utf8");
for (const suffix of ["front", "side", "side_face", "side_face_smile"]) {
  assert(
    component.includes(`nodes.Moving_Characters_Spring_${suffix}.geometry`),
    `commented spring girl mesh ${suffix} was removed`,
  );
}

console.log("Spring boy passed: original eye drawing without disc overlays, blink pivots, 7 nodes, source preserved, shared-atlas UVs.");
