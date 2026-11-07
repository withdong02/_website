import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const model = await readFile(new URL("../public/models/summer-boy.glb", import.meta.url));
assert.equal(model.readUInt32LE(8), model.length);
const gltf = JSON.parse(model.subarray(20, 20 + model.readUInt32LE(12)));
const names = ["boy-summer-body", "boy-summer-face", "boy-summer-left-arm", "boy-summer-right-arm"];
assert.equal(gltf.meshes.length, 4);
for (const name of names) assert(gltf.nodes.some(n => n.name === name), name);
assert(!gltf.images?.length, "Keep the original shared atlas");
for (const mesh of gltf.meshes) {
  for (const primitive of mesh.primitives) assert("TEXCOORD_0" in primitive.attributes);
}
const body = gltf.nodes.find(n => n.name === names[0]);
const sourceParts = body.extras.source_parts.split(",").map(Number);
for (const part of [12, 27, 28, 29, 30]) assert(sourceParts.includes(part), "Keep neck, bare legs, board and support");
const springHash = "50881fd38e692ca166cd45459104fb8edeff7a6cd42566ced804dbff61350d6a";
assert([springHash, "aa7fd67c92a3d40b4168aee68d27af08ff8bb843050e4c6d54b06a0485334f90"].includes(body.extras.approved_spring_sha256),
  "Summer may reuse either approved source revision; their front heads are unchanged");
const spring = await readFile(new URL("../public/models/spring-boy.glb", import.meta.url));
assert.equal(createHash("sha256").update(spring).digest("hex"), springHash, "Approved spring asset changed");
assert("COLOR_0" in gltf.meshes[body.mesh].primitives[0].attributes, "Approved hair tint was lost");
for (const [name, pivot] of [
  [names[2], [.3920535, .8337746, -.0621367]],
  [names[3], [-.3237659, .8715670, .0287676]],
]) {
  const node = gltf.nodes.find(n => n.name === name);
  pivot.forEach((value, i) => assert(Math.abs(node.translation[i] - value) < 0.0001, `${name}: original arm pivot drifted`));
}
const face = gltf.nodes.find(n => n.name === names[1]);
const positions = gltf.meshes[face.mesh].primitives[0].attributes.POSITION;
const bounds = gltf.accessors[positions];
assert(bounds.min[1] + face.translation[1] > 1.15 && bounds.max[1] + face.translation[1] < 1.65,
  "The smile must stay on the copied face");
const original = await readFile(new URL("../public/models/Moving_Characters-transformed.glb", import.meta.url));
assert.equal(createHash("sha256").update(original).digest("hex"),
  "4f7290dc7b5033217906b43fccffc4071f3096002e4dad0a383541cabc504e30");
const component = await readFile(new URL("../src/Experience/models/Moving_Characters.jsx", import.meta.url), "utf8");
assert(component.includes("<SummerBoy material={texture_1} />"));
assert(component.includes("nodes.Moving_Characters_Summer_character_Wave.geometry"), "Keep the separate wave");
for (const suffix of ["character", "happy_face", "left_arm", "right_arm"]) {
  assert(component.includes(`nodes.Moving_Characters_Summer_${suffix}.geometry`), "Keep original summer meshes for reference");
}
console.log("Summer boy passed: four independent nodes, approved head/color source, smile placement, arm pivots, original board/legs metadata and source preserved.");
