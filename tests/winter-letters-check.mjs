import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Box3, Matrix4, Quaternion, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createCurves } from "../src/Experience/components/Curves.js";
import { winterSnowflake } from "../src/Experience/models/winter-snow.js";

const root = new URL("../", import.meta.url);
const read = file => readFile(new URL(file, root));
const parse = bytes => JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
const bytes = await read("public/models/winter-letters.glb");
assert.equal(bytes.readUInt32LE(8), bytes.length);
assert(bytes.length < 700000, "Keep the replacement winter model compressed");
const doc = parse(bytes);
assert(doc.extensionsRequired.includes("KHR_draco_mesh_compression"));
assert(!doc.materials && !doc.images, "Reuse explicit local paper atlases");
const nodes = doc.nodes.filter(node => node.mesh !== undefined);
const get = name => {
  const node = nodes.find(node => node.name === name);
  assert(node, `Missing winter prop: ${name}`);
  return node;
};
const bounds = node => {
  const accessor = doc.accessors[doc.meshes[node.mesh].primitives[0].attributes.POSITION];
  const matrix = new Matrix4().compose(new Vector3(...(node.translation ?? [0, 0, 0])),
    new Quaternion(...(node.rotation ?? [0, 0, 0, 1])), new Vector3(...(node.scale ?? [1, 1, 1])));
  return new Box3(new Vector3(...accessor.min), new Vector3(...accessor.max)).applyMatrix4(matrix);
};
for (const accessor of doc.accessors) {
  assert(accessor.count > 0);
  for (const field of ["min", "max"]) if (accessor[field]) assert(accessor[field].every(Number.isFinite));
}
const cabin = get("winter-cabin-wood");
const woodParts = new Set(cabin.extras.source_parts.split(",").map(Number));
assert(!woodParts.has(59), "Snow on the roof must retain its cool white paper");
for (const id of [96, 98, 121]) assert(woodParts.has(id), "Keep original cabin walls and door");
const window = bounds(get("winter-cabin-window-light"));
const lamp = bounds(get("winter-cabin-lamp-light"));
assert(window.min.y > bounds(cabin).min.y && window.max.y < bounds(cabin).max.y);
assert(lamp.min.y > .8 && lamp.max.y < 2, "Keep the door lamp at cabin scale");

const mailbox = get("winter-mailbox-body"), post = get("winter-mailbox-post");
const floorY = mailbox.extras.mailbox_root[1];
assert(floorY < -1.1, "Place the mailbox below the stairs on the lowest terrace");
assert(Math.abs(bounds(post).min.y - floorY) < .02, "The mailbox post must meet the floor");
assert(bounds(post).intersectsBox(bounds(mailbox)), "The post must support the mailbox");
const label = get("winter-contact-label");
assert.equal(label.extras.text, "contact me");
assert(bounds(mailbox).expandByScalar(.05).containsBox(bounds(label)), "Keep the label on the mailbox front");

// The inner mailbox must clear the entire walking/standing boy, including moving limbs.
const boyBytes = await read("public/models/winter-boy.glb");
const boy = await new GLTFLoader().parseAsync(boyBytes.buffer.slice(boyBytes.byteOffset, boyBytes.byteOffset + boyBytes.byteLength), "");
const local = new Box3().setFromObject(boy.scene);
const localRadius = Math.hypot(Math.max(Math.abs(local.min.x), Math.abs(local.max.x)),
  Math.max(Math.abs(local.min.z), Math.abs(local.max.z))) + .4;
const curve = createCurves().movingCharactersCurve;
const center = new Vector3(-.035392, 0, .457284);
let innerRoute = Infinity;
for (let i = 0; i <= 1000; i++) {
  const point = curve.getPointAt(.0124 + .215 * i / 1000);
  innerRoute = Math.min(innerRoute, Math.hypot(point.x - center.x, point.z - center.z) - localRadius);
}
const box = bounds(mailbox);
for (const x of [box.min.x, box.max.x]) for (const z of [box.min.z, box.max.z]) {
  assert(Math.hypot(x - center.x, z - center.z) < innerRoute - .1, "Keep the mailbox outside the boy's swept path");
}

const originalBytes = await read("public/models/Scene_1_Winter-transformed.glb");
assert.equal(createHash("sha256").update(originalBytes).digest("hex"), "8153fb3039a434ec3f98d057b53ad42da19ba2c0f6c7467fa950d0225d42435b");
for (const [i, expected] of [
  [1, "e93a867a6e5463645a3a122ad2ab193cc4f05f73b76d069ce8ca99da1a09ab2a"],
  [2, "61e932d8ab4e37bf8e1b62bbf185b0e1cd5454d8bd18d0f5451d9c790b3d6cc1"],
  [3, "5b16779f27e09f1979e53e435819e7043ea39384b3fdfeb494bec4fa613c8dbe"],
  [4, "0a42f4095fadba8de47de1ab67fda974d4b2ac108d75b365f672a9ac1dc523a9"],
]) {
  assert.equal(createHash("sha256").update(await read(`public/textures/Scene_1_Winter_${i}.webp`)).digest("hex"), expected);
}
const original = parse(originalBytes);
const moving = nodes.filter(node => node.extras?.motion);
assert.equal(moving.length, 9, "Keep the deer, fire, notes and snowman animation pivots");
for (const node of moving) {
  const source = original.nodes.find(candidate => candidate.name === node.extras.original_node);
  assert.deepEqual(node.translation, source.translation, `${node.name}: preserve the original animation pivot`);
}
const scenery = new Set(get("winter-Scene_1_Winter_2_Baked").extras.source_parts.split(",").map(Number));
assert(scenery.has(59) && scenery.has(64), "Retain both roof layers");
for (let i = 15; i < 39; i++) assert(!scenery.has(i), "Remove original author lettering and plaque");
assert(!nodes.some(node => /Mail_box_stick|mail_box_red|Baked_mailbox/.test(node.name)), "Remove the former mailbox before adding its replacement");
for (const file of ["winter-contact-label.webp", "winter-snow-wall.webp"]) {
  assert.equal((await read(`public/textures/${file}`)).toString("ascii", 8, 12), "WEBP");
}
for (let i = 0; i < 56; i++) {
  const period = 1 / (.022 + (i % 7) * .002);
  for (const time of [0, 1, 30, 10000]) {
    const flake = winterSnowflake(i, time);
    assert(Object.values(flake).every(Number.isFinite));
    assert(flake.x > 0 && flake.z < .46, "Confine snowfall to the winter quadrant");
    assert(Math.hypot(flake.x + .035392, flake.z - .457284) < 12.5, "Snow must stay inside the curved backdrop");
    assert(flake.y > -1.21 && flake.y <= 6.9 && flake.size >= 0 && flake.size <= .0631);
    const repeat = winterSnowflake(i, time + period);
    assert(Math.abs(flake.y - repeat.y) < 1e-8 && Math.abs(flake.size - repeat.size) < 1e-8,
      "Snow must wrap through its fall cycle without a visible size jump");
  }
}
console.log(`Winter letters passed: ${nodes.length} parts, warm cabin, grounded lower mailbox, label and nine retained pivots.`);
