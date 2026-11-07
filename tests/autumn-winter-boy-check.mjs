import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

async function model(file) {
  const bytes = await readFile(new URL(`../public/models/${file}`, import.meta.url));
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  return JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
}
const autumn = await model("autumn-boy.glb");
const winter = await model("winter-boy.glb");
for (const [gltf, names] of [
  [autumn, ["body", "eye-left", "eye-right", "left-arm", "right-arm"].map(n => `boy-autumn-${n}`)],
  [winter, [
    ...["body", "eye-left", "eye-right", "left-arm", "right-arm"].map(n => `boy-winter-front-${n}`),
    ...["body", "face", "eye", "smile", "left-arm", "right-arm", "left-foot", "right-foot"].map(n => `boy-winter-side-${n}`),
  ]],
]) {
  assert.equal(gltf.meshes.length, names.length);
  for (const name of names) assert(gltf.nodes.some(n => n.name === name), name);
  assert(!gltf.images?.length, "Reuse the character atlas");
  for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) assert("TEXCOORD_0" in primitive.attributes);
}
for (const [gltf, prefix, height] of [[autumn, "boy-autumn", 1.212], [winter, "boy-winter-front", 1.145]]) {
  for (const side of ["left", "right"]) {
    const node = gltf.nodes.find(n => n.name === `${prefix}-eye-${side}`);
    const primitive = gltf.meshes[node.mesh].primitives[0];
    const { min, max } = gltf.accessors[primitive.attributes.POSITION];
    assert(max[0] - min[0] < .215 && max[1] - min[1] < .18, "Preserve approved small eyes");
    assert(Math.abs(node.translation[1] - height) < .001, "Blink pivot must follow the copied face");
  }
}
for (const [part, pivot] of [
  ["left-arm", [-.09515, 1.10354, .03457]],
  ["right-arm", [-.094, 1.10354, .07591]],
  ["left-foot", [-.06326, .549, .04517]],
  ["right-foot", [-.07666, .55099, .06701]],
]) {
  const node = winter.nodes.find(n => n.name === `boy-winter-side-${part}`);
  pivot.forEach((v, i) => assert(Math.abs(node.translation[i] - v) < .0001, `${part}: original walking pivot drifted`));
  assert(!node.rotation || node.rotation.every((v, i) => Math.abs(v - (i === 3 ? 1 : 0)) < .0001), "Walking axes must retain the original basis");
}
const sideEye = winter.nodes.find(n => n.name === "boy-winter-side-eye");
assert(Math.abs(sideEye.translation[1] - 1.375) < .001);
for (const [file, expected] of [
  ["spring-boy.glb", "50881fd38e692ca166cd45459104fb8edeff7a6cd42566ced804dbff61350d6a"],
  ["summer-boy.glb", "1a5e976c711d7e9a2a72b9884a1ea3b653ee1bf8a410fdaa034a5f7c0d2b9966"],
  ["Moving_Characters-transformed.glb", "4f7290dc7b5033217906b43fccffc4071f3096002e4dad0a383541cabc504e30"],
]) {
  const bytes = await readFile(new URL(`../public/models/${file}`, import.meta.url));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), expected, `${file} changed`);
}
const runtime = await readFile(new URL("../src/Experience/models/Moving_Characters.jsx", import.meta.url), "utf8");
const walkingComponent = runtime.match(/<WinterBoySide[\s\S]*?\/>/)?.[0];
assert(walkingComponent, "Walking replacement is not rendered");
for (const ref of ["winterLeftArmRef", "winterRightArmRef", "winterLeftFootRef", "winterRightFootRef", "winterSideFaceRef", "winterSideFaceSmileRef"]) {
  assert(walkingComponent.includes(`={${ref}}`), `${ref} not connected to replacement`);
}
console.log("Autumn/winter passed: 5 + 13 nodes, small eyes/pivots, four original walking axes, source and approved spring/summer unchanged.");
