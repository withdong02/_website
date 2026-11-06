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
const required = ["boy-front-body", "boy-front-eye-left", "boy-front-eye-right", "boy-side-body", "boy-side-eye", "boy-side-face-details", "boy-side-smile"];
assert.equal(gltf.meshes.length, 7);
for (const name of required) assert(gltf.nodes.some(node => node.name === name), name);
for (const name of ["boy-front-eye-left", "boy-front-eye-right"]) {
  const node = gltf.nodes.find(node => node.name === name);
  const position = gltf.meshes[node.mesh].primitives[0].attributes.POSITION;
  const { min, max } = gltf.accessors[position];
  assert(max[0] - min[0] < 0.17 && max[1] - min[1] < 0.17, "Keep the smaller, quieter eyes");
}
for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) assert("TEXCOORD_0" in primitive.attributes);
assert(!gltf.images?.length, "Reuse the original atlas rather than duplicating it");
const original = await readFile(new URL("../public/models/Moving_Characters-transformed.glb", import.meta.url));
assert.equal(createHash("sha256").update(original).digest("hex"), "4f7290dc7b5033217906b43fccffc4071f3096002e4dad0a383541cabc504e30");
console.log("Spring boy passed: separate eyes, shared-atlas UVs, preserved source, closing/opening blink cycle.");
