import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const bytes = await readFile(new URL("../../public/models/summer-blog.glb", import.meta.url));
assert.equal(bytes.readUInt32LE(8), bytes.length, "Complete GLB output required");
assert(bytes.length < 1200000, "Keep the replacement scene compact");
const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
assert(doc.extensionsRequired.includes("KHR_draco_mesh_compression"));
assert(!doc.images && !doc.materials, "Reuse explicit local runtime atlases");
const meshes = doc.nodes.filter(node => node.mesh !== undefined);
const get = name => {
  const node = meshes.find(node => node.name === name);
  assert(node, `Missing scene node: ${name}`);
  return node;
};
for (const accessor of doc.accessors) {
  assert(accessor.count > 0);
  for (const field of ["min", "max"]) if (accessor[field]) assert(accessor[field].every(Number.isFinite));
}

const wall = get("summer-Scene_3_Summer_3");
const kept = new Set(wall.extras.source_parts.split(",").map(Number));
const route = [...Array.from({ length: 15 }, (_, i) => i + 10),
  ...Array.from({ length: 11 }, (_, i) => i + 26),
  ...Array.from({ length: 13 }, (_, i) => i + 58),
  ...Array.from({ length: 11 }, (_, i) => i + 73)];
assert.equal(route.length, 50);
assert.deepEqual([...kept].sort((a, b) => a - b), [0, ...route].sort((a, b) => a - b), "Retain original backdrop and every route segment; remove camera, old ink and city captions");
assert.equal(get("summer-Scene_3_Summer_1").extras.source_parts, "0,15", "Retain title paper and original red photo-corner decoration");
const props = new Set(get("summer-Scene_3_Summer_4_Bike_Sign_Summer_3_2").extras.source_parts.split(",").map(Number));
for (const id of [0, 1, 2, 4, 5, 6, 25]) assert(props.has(id), "Keep original pins, question mark, X and paper arrows");
for (const id of [3, 7, 24]) assert(!props.has(id), "Remove camera residue and original city letters");
assert(!meshes.some(node => /Starbucks|Figma|Psychiatrist|Blender_Sign/.test(node.name)), "Old hover plaques must not survive in the live scene");

for (const [slug, waypoint, title, description, anchor] of [
  ["articles", "Scene_3_Summer_Shanghai", "Articles", "Notes, experiments, and projects.", [-3.85275, 2.65109, 13.40910]],
  ["tags", "Scene_3_Summer_Austin", "Tags", "Explore by keyword.", [-7.83241, 5.81359, 11.61004]],
  ["categories", "Scene_3_Summer_1_Cali", "Categories", "Browse by topic.", [-10.89719, 3.63839, 8.57412]],
  ["archives", "Scene_3_Summer_1_Boston", "Archives", "Browse by date.", [-12.79890, 4.38675, 4.77734]],
]) {
  const paper = get(`summer-${slug}-paper`);
  assert.equal(paper.extras.module, slug);
  assert.equal(paper.extras.source_waypoint, waypoint, "Maintain independently addressable original waypoints");
  const box = doc.accessors[doc.meshes[paper.mesh].primitives[0].attributes.POSITION];
  const center = box.min.map((value, i) => (value + box.max[i]) / 2);
  assert(Math.hypot(center[0] - anchor[0], center[2] - anchor[2]) < .15, "Keep waypoints at their original horizontal locations");
  assert(Math.abs(center[1] - anchor[1]) < .01, "Only the documented small vertical paper offset is allowed");
  for (const [suffix, expected] of [["title", title], ["description", description]]) {
    const text = get(`summer-${slug}-${suffix}`);
    assert.equal(text.extras.text.replace(/\s+/g, " "), expected);
    const primitive = doc.meshes[text.mesh].primitives[0];
    assert(primitive.attributes.TEXCOORD_0 !== undefined);
    assert(doc.accessors[primitive.attributes.POSITION].count <= 250, "Use light paper planes for text");
  }
}
assert.equal(get("summer-intro").extras.text.replace(/\s+/g, " "), "I'm a student focused on backend development. Here I share my notes, experiments, and projects.");
assert.equal(get("summer-topics").extras.text.replace(/\s+/g, " "), "AI Coding · Java · Spring MySQL · Algorithms · Security");
const animated = meshes.filter(node => node.extras?.motion);
assert.equal(animated.length, 6, "Retain four seaweeds, crab and umbrella animation pivots");
for (const node of animated) assert(node.translation?.some(value => Math.abs(value) > .1), "Animated components keep original local pivots");

const chime = meshes.filter(node => node.extras?.wind_chime);
const hanger = get("summer-chime-hanger");
assert(hanger.translation[1] > 7, "Hang from the actual ceiling");
assert.equal(chime.filter(node => node.extras.shell !== undefined).length, 3);
for (const node of chime) {
  assert.deepEqual(node.translation, hanger.translation, "Strings and shells must swing around the same ceiling anchor");
  const box = doc.accessors[doc.meshes[node.mesh].primitives[0].attributes.POSITION];
  assert(box.max[1] < .001, "Chime must hang below its ceiling anchor");
  assert(box.min[1] + node.translation[1] > 6.3, "Keep pendants above the wall text region");
}

for (const [file, digest] of [
  ["assets/source/models/Scene_3_Summer-transformed.glb", "f43c1f58f8544da08601301a32e05f02e179ef167b1a8027b44a28978e19ebd3"],
  ["assets/source/textures/Scene_3_Summer_1.webp", "7686048de6b68e49a54e413c42358af0472cb062356c906158cd5d31a9999316"],
  ["assets/source/textures/Scene_3_Summer_2.webp", "4f7f870d6c7e12d6fe6843c9b10c4727aaa8a5656d87acfe8df57a95312e5bfc"],
  ["assets/source/textures/Scene_3_Summer_3.webp", "a9b93f8e35383ad369f783e1d38f539dfc08a35910f8a25f5ae5082d4ab814c6"],
  ["public/textures/Scene_3_Summer_4.webp", "fb83053ecc8406f004ad6b20e6fd10b78f3a4442b2f96d26f6ac93d85e92e930"],
]) assert.equal(createHash("sha256").update(await readFile(new URL(`../../${file}`, import.meta.url))).digest("hex"), digest, `${file}: original changed`);
console.log("Summer blog passed: complete 50-piece route, four independently labelled waypoints, student introduction, retained animation pivots and original source hashes.");
