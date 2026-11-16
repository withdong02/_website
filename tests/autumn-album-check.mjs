import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Box3, Matrix4, Object3D, Raycaster, Triangle, Vector3 } from "three";
import { createCurves } from "../src/Experience/components/Curves.js";

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
const wall = get("autumn-gold-backdrop");
const ground = get("autumn-gold-ground");
assert.equal(wall.userData.paper_color, ground.userData.paper_color, "Wall and floor must share the gold base");
for (let i = 0; i < 3; i++) {
  get(`autumn-tree-crown-${i}`);
  get(`autumn-tree-trunk-${i}`);
}
get("autumn-window-sky");
get("autumn-window-sill");
assert(gltf.scene.children.some(node => node.name.startsWith("autumn-plant-")), "Keep independent foreground foliage");
gltf.scene.updateMatrixWorld(true);
for (const [dx, dz] of [[0, 0], [2.2, 0], [-2.2, 0], [0, 2.2], [0, -2.2]]) {
  const ray = new Raycaster(new Vector3(-2.22 + dx, 1, -3.106 + dz), new Vector3(0, -1, 0));
  const [hit] = ray.intersectObjects([ground, get("autumn-ground-inlay")]);
  assert(hit && hit.point.y > -1.14 && hit.point.y < -1.10, "Fill the recess with a thin inlay clear of the floor to avoid coplanar flicker");
}
const worldPoints = node => Array.from({ length: node.geometry.attributes.position.count }, (_, i) =>
  node.localToWorld(new Vector3().fromBufferAttribute(node.geometry.attributes.position, i)));
const bounds = node => new Box3().setFromObject(node);
const assertFullImageUV = node => {
  assert.equal(node.userData.photo_uv_channel, 1);
  const uv = node.geometry.attributes.uv1;
  assert(uv, `${node.name}: keep a second UV set for replacing image content`);
  const uvCorners = new Set(Array.from({ length: uv.count }, (_, i) => `${uv.getX(i)},${uv.getY(i)}`));
  assert.deepEqual(uvCorners, new Set(["0,0", "0,1", "1,0", "1,1"]));
};
assertFullImageUV(get("autumn-gallery-title"));
for (let i = 0; i < 2; i++) {
  const text = get(`autumn-book-text-${i}`);
  assertFullImageUV(text);
  assert.equal(text.userData.book_page, i);
}
const assertGrounded = node => {
  const points = worldPoints(node);
  const bottom = Math.min(...points.map(point => point.y));
  for (const point of points.filter(point => point.y < bottom + .012)) {
    const ray = new Raycaster(new Vector3(point.x, 10, point.z), new Vector3(0, -1, 0));
    const [hit] = ray.intersectObjects([ground, get("autumn-ground-inlay")]);
    assert(hit && Math.abs(point.y - hit.point.y) < .04, `${node.name}: feet must meet the terrace`);
  }
};
for (let i = 0; i < 3; i++) assertGrounded(get(`autumn-tree-trunk-${i}`));
const benchLegs = gltf.scene.children.filter(node => node.name.startsWith("autumn-bench-leg-"));
assert(benchLegs.length >= 2, "The bench needs grounded supports");
for (const node of benchLegs) assertGrounded(node);
for (let i = 0; i < 2; i++) {
  const squirrel = get(`autumn-squirrel-${i}`);
  assertGrounded(squirrel);
  const { position, normal } = squirrel.geometry.attributes;
  const indices = squirrel.geometry.index;
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), facing = new Vector3();
  for (let j = 0; j < indices.count; j += 3) {
    a.fromBufferAttribute(position, indices.getX(j));
    b.fromBufferAttribute(position, indices.getX(j + 1));
    c.fromBufferAttribute(position, indices.getX(j + 2));
    facing.fromBufferAttribute(normal, indices.getX(j));
    assert(b.sub(a).cross(c.sub(a)).dot(facing) > 0,
      `${squirrel.name}: silhouette triangles must face forward without missing tail sections`);
  }
}

// Bound the whole crane, including entry overshoot, rather than only the rider.
const boyBytes = await readFile(new URL("../public/models/autumn-boy.glb", import.meta.url));
const boy = await new GLTFLoader().parseAsync(boyBytes.buffer.slice(boyBytes.byteOffset, boyBytes.byteOffset + boyBytes.byteLength), "");
const local = new Box3().setFromObject(boy.scene);
const corners = [];
for (const x of [local.min.x, local.max.x]) for (const y of [local.min.y, local.max.y]) for (const z of [local.min.z, local.max.z]) corners.push(new Vector3(x, y, z));
const curve = createCurves().movingCharactersCurve;
const anchor = new Object3D();
const up = new Vector3(0, 1, 0), look = new Vector3(), point = new Vector3();
const rotation = new Matrix4(), transform = new Matrix4();
const entryOvershoot = 5.23 * 4 * 1.2 ** 3 / (27 * 2.2 ** 2);
const bob = new Matrix4().makeTranslation(0, .23 + entryOvershoot + .28, 0);
const routeCenter = new Vector3(-.035392, 0, .457284);
const supportRoots = [0, 1].map(i => get(`autumn-tree-trunk-${i}`).getWorldPosition(new Vector3()));
const tangent = supportRoots[1].clone().sub(supportRoots[0]).setY(0).normalize();
const photoOutward = new Vector3(-tangent.z, 0, tangent.x);
if (supportRoots[0].clone().sub(routeCenter).dot(photoOutward) < 0) photoOutward.negate();
let highestBoy = -Infinity, outerBoyRadius = 0, furthestBoy = -Infinity;
for (let step = 0; step <= 1000; step++) {
  const progress = .74 + .25 * step / 1000;
  anchor.position.copy(curve.getPointAt(progress));
  anchor.lookAt(look.crossVectors(curve.getTangentAt(progress), up));
  anchor.updateMatrixWorld(true);
  for (let angle = 0; angle <= 20; angle++) {
    transform.copy(anchor.matrixWorld).multiply(bob).multiply(rotation.makeRotationY(-.3 + .03 * angle));
    for (const corner of corners) {
      point.copy(corner).applyMatrix4(transform);
      highestBoy = Math.max(highestBoy, point.y);
      outerBoyRadius = Math.max(outerBoyRadius, Math.hypot(point.x - routeCenter.x, point.z - routeCenter.z));
      furthestBoy = Math.max(furthestBoy, point.clone().sub(routeCenter).dot(photoOutward));
    }
  }
}
// Allow for the finite path/angle sampling; abrupt scrolling still needs runtime review.
highestBoy += .02;
outerBoyRadius += .02;
furthestBoy += .02;
// A separating plane permits normal screen overlap while preventing 3D intersections.
const assertBehindRoute = node => {
  for (const vertex of worldPoints(node)) {
    assert(vertex.sub(routeCenter).dot(photoOutward) > furthestBoy + .05,
      `${node.name}: leave physical depth behind the whole moving crane`);
  }
};
assertBehindRoute(get("autumn-gallery-sign"));
for (let i = 0; i < 2; i++) {
  const trunk = get(`autumn-tree-trunk-${i}`);
  const outward = trunk.getWorldPosition(new Vector3()).sub(routeCenter).setY(0).normalize();
  for (const vertex of worldPoints(trunk)) {
    assert(vertex.sub(routeCenter).dot(outward) > outerBoyRadius,
      `Support tree ${i}: branches and roots must remain outside the crane's route`);
  }
}
const distanceToSurface = (node, target) => {
  const positions = node.geometry.attributes.position, indices = node.geometry.index;
  const triangle = new Triangle(), closest = new Vector3();
  let distance = Infinity;
  for (let i = 0; i < indices.count; i += 3) {
    for (const [vertex, offset] of [[triangle.a, 0], [triangle.b, 1], [triangle.c, 2]]) {
      vertex.fromBufferAttribute(positions, indices.getX(i + offset)).applyMatrix4(node.matrixWorld);
    }
    triangle.closestPointToPoint(target, closest);
    distance = Math.min(distance, closest.distanceTo(target));
  }
  return distance;
};
for (let row = 0; row < 2; row++) {
  const rope = get(`autumn-photo-rope-${row}`);
  assertBehindRoute(rope);
  const points = worldPoints(rope);
  const roots = [0, 1].map(i => bounds(get(`autumn-tree-trunk-${i}`)).getCenter(new Vector3()));
  const direction = roots[1].sub(roots[0]).setY(0).normalize();
  points.sort((a, b) => a.dot(direction) - b.dot(direction));
  for (const [i, endpoint] of [[0, points[0]], [1, points.at(-1)]]) {
    assert(distanceToSurface(get(`autumn-tree-trunk-${i}`), endpoint) < .12, `Rope ${row}: end must attach to support tree ${i}`);
  }
}
for (let i = 0; i < 5; i++) {
  const photo = get(`autumn-photo-insert-${i}`);
  const frame = get(`autumn-photo-frame-${i}`);
  const clip = get(`autumn-photo-clip-${i}`);
  assert(photo.userData.replaceable_photo && photo.userData.demo_photo);
  assert.equal(photo.userData.photo_index, i);
  assertFullImageUV(photo);
  for (const node of [photo, frame, clip]) assertBehindRoute(node);
  assert(bounds(frame).expandByScalar(.03).containsBox(bounds(photo)), `Photo ${i}: insert must remain in its frame`);
  assert([0, 1].includes(frame.userData.rope_row));
  assert(frame.userData.rope_t > 0 && frame.userData.rope_t < 1);
  assert.equal(frame.userData.rope_anchor?.length, 3);
  const attachment = new Vector3(...frame.userData.rope_anchor);
  assert(distanceToSurface(get(`autumn-photo-rope-${frame.userData.rope_row}`), attachment) < .03, `Photo ${i}: attachment must reach its rope`);
  assert(bounds(clip).expandByScalar(.02).containsPoint(attachment), `Photo ${i}: clip must reach the rope attachment`);
  assert(bounds(clip).expandByScalar(.02).intersectsBox(bounds(frame)), `Photo ${i}: clip must grip the frame`);
}
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
get("autumn-bench-seat-0");
get("autumn-bench-back-1");
assert(!gltf.scene.getObjectByName("autumn-gold-ceiling"), "Remove the old disconnected lantern wires");
for (let i = 0; i < 3; i++) {
  const crane = get(`autumn-paper-crane-${i}`), thread = get(`autumn-crane-thread-${i}`);
  assert(bounds(crane).min.y > highestBoy + .2, "Ceiling ornaments must clear the moving crane");
  const ceilingAnchor = new Vector3(...thread.userData.ceiling_anchor);
  assert(distanceToSurface(get("autumn-gold-ceiling-shell"), ceilingAnchor) < .025, "Thread must meet the actual ceiling");
  const bottom = bounds(thread).getCenter(new Vector3());
  bottom.y = bounds(thread).min.y;
  assert(distanceToSurface(crane, bottom) < .025, "Paper crane must attach to its thread");
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
const preview = await readFile(new URL("../public/textures/autumn-photo-previews.webp", import.meta.url));
assert.equal(preview.toString("ascii", 8, 12), "WEBP");
const label = await readFile(new URL("../public/textures/autumn-gallery-label.webp", import.meta.url));
assert.equal(label.toString("ascii", 8, 12), "WEBP");
const bookText = await readFile(new URL("../public/textures/autumn-book-text.webp", import.meta.url));
assert.equal(bookText.toString("ascii", 8, 12), "WEBP");
const runtime = await readFile(new URL("../src/Experience/models/autumn-album-sample.jsx", import.meta.url), "utf8");
assert(runtime.includes("copy.attributes.uv1") && runtime.includes('copy.setAttribute("uv", uv)'), "A replacement photo must use its full-image UVs");
const scene = await readFile(new URL("../src/Experience/Scene.jsx", import.meta.url), "utf8");
assert(scene.includes('"./models/autumn-album-sample"'));
assert((await readFile(new URL("../src/Experience/models/Scene_4_Fall.jsx", import.meta.url), "utf8")).includes("Scene_4_Fall-transformed.glb"));
console.log(`Autumn courtyard passed: ${count} parts, ${leafCount} grounded leaves, five photos behind the crane route, two book pages, attached ceiling cranes, grounded supports and original assets retained.`);
