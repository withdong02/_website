import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Raycaster, Vector3 } from "three";

const bytes = await readFile(new URL("../public/models/autumn-album-sample.glb", import.meta.url));
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
const get = name => {
  const node = gltf.scene.getObjectByName(name);
  assert(node?.isMesh, `Missing separate part: ${name}`);
  return node;
};
let count = 0;
gltf.scene.traverse(node => {
  if (!node.isMesh) return;
  count++;
  for (const attribute of Object.values(node.geometry.attributes)) {
    assert([...attribute.array].every(Number.isFinite), `${node.name}: nonfinite geometry`);
    assert.equal(attribute.count, node.geometry.attributes.position.count);
  }
  assert(node.geometry.attributes.uv, `${node.name}: missing baked paper UVs`);
  assert.equal(node.geometry.index.count % 3, 0);
  for (const index of node.geometry.index.array) assert(index < node.geometry.attributes.position.count);
});
assert.equal(count, 51);
const wall = get("autumn-gold-backdrop");
const ground = get("autumn-gold-ground");
assert.equal(wall.userData.paper_color, ground.userData.paper_color, "Wall and floor must share the gold base");
assert.equal(wall.userData.paper_color, "#c18424");
for (let i = 0; i < 3; i++) {
  const crown = get(`autumn-tree-crown-${i}`);
  const color = crown.userData.paper_color;
  const [r, g, b] = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16));
  assert(r > 230 && g > 155 && g < 200 && b < 60, "Tree canopies must read as golden yellow leaves");
}
gltf.scene.updateMatrixWorld(true);
for (const [dx, dz] of [[0, 0], [2.2, 0], [-2.2, 0], [0, 2.2], [0, -2.2]]) {
  const ray = new Raycaster(new Vector3(-2.22 + dx, 1, -3.106 + dz), new Vector3(0, -1, 0));
  const [hit] = ray.intersectObjects([ground, get("autumn-ground-inlay")]);
  assert(hit && hit.point.y > -1.14 && hit.point.y < -1.10, "Fill the recess with a thin inlay clear of the floor to avoid coplanar flicker");
}
get("autumn-album-spine");
for (const side of ["left", "right"]) {
  for (let layer = 0; layer < 4; layer++) get(`autumn-album-${side}-${layer}`);
}
const photo = get("autumn-photo-insert");
assert(photo.userData.placeholder && photo.userData.replaceable_photo);
assert.equal(photo.userData.photo_uv_channel, 1);
const uv = photo.geometry.attributes.uv1;
assert(uv, "Keep a second UV set for swapping in a real photo");
const corners = new Set(Array.from({ length: uv.count }, (_, i) => `${uv.getX(i)},${uv.getY(i)}`));
assert.deepEqual(corners, new Set(["0,0", "0,1", "1,0", "1,1"]));
get("autumn-photo-frame");
get("autumn-photo-clip");
let leafCount = 0;
for (const name of ["left-tree", "right-trees", "foreground"]) {
  const bed = get(`autumn-leaves-${name}`);
  leafCount += bed.userData.leaf_count;
  const positions = bed.geometry.attributes.position;
  const normals = bed.geometry.attributes.normal;
  for (let i = 0; i < positions.count; i++) {
    assert(normals.getY(i) > 0, "Leaf fronts must face upward in the browser");
    const point = bed.localToWorld(new Vector3().fromBufferAttribute(positions, i));
    const ray = new Raycaster(new Vector3(point.x, 2, point.z), new Vector3(0, -1, 0));
    const [hit] = ray.intersectObjects([ground, get("autumn-ground-inlay")]);
    assert(hit && point.y - hit.point.y > -.04 && point.y - hit.point.y < .15, "Leaves must stay on the floor rather than float");
  }
}
assert(leafCount >= 350, "Deep autumn needs a carpet of leaves");
get("autumn-bench-seat-0");
get("autumn-bench-back-1");
for (let i = 0; i < 2; i++) {
  const cap = get(`autumn-mushroom-cap-${i}`);
  assert(cap.geometry.attributes.normal.getZ(0) > 0, "Mushroom faces must face the camera side");
}

for (const [file, expected] of [
  ["models/Scene_4_Fall-transformed.glb", "a87f6c2cf3a14504325d8ee7040082080b52a69f8b8150cafc61f43e27349b4d"],
  ["textures/Scene_4_Fall_1.webp", "8dc98d3fcc1cf57f44edf15c626e565c1a6b5cbfff72af83a930496735a6d55a"],
  ["textures/Scene_4_Fall_3.webp", "27eb5c808cd626ffdff319b1b348213ff056882d79a40028939d083bd68f0dad"],
]) {
  const original = await readFile(new URL(`../public/${file}`, import.meta.url));
  assert.equal(createHash("sha256").update(original).digest("hex"), expected, `${file}: original changed`);
}
const texture = await readFile(new URL("../public/textures/autumn-album-sample.webp", import.meta.url));
assert.equal(texture.toString("ascii", 8, 12), "WEBP");
const runtime = await readFile(new URL("../src/Experience/models/autumn-album-sample.jsx", import.meta.url), "utf8");
assert(runtime.includes('copy.setAttribute("uv", copy.attributes.uv1)'), "A replacement photo must use its full-image UVs");
const scene = await readFile(new URL("../src/Experience/Scene.jsx", import.meta.url), "utf8");
assert(scene.includes('"./models/autumn-album-sample"'));
assert((await readFile(new URL("../src/Experience/models/Scene_4_Fall.jsx", import.meta.url), "utf8")).includes("Scene_4_Fall-transformed.glb"));
console.log(`Autumn sample passed: ${count} parts, ${leafCount} folded leaves, yellow canopies, bench, mushrooms, independent photo UVs and original assets retained.`);
