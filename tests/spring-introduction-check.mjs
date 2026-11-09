import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Box3, Raycaster, Vector3 } from "three";

const bytes = await readFile(new URL("../public/models/spring-introduction.glb", import.meta.url));
assert(bytes.length < 100000, "Text must use small paper planes, not dense letter geometry");
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
const meshes = [];
gltf.scene.traverse(node => {
  if (!node.isMesh) return;
  meshes.push(node);
  for (const attribute of Object.values(node.geometry.attributes)) assert([...attribute.array].every(Number.isFinite));
  assert(node.geometry.attributes.uv, `${node.name}: missing UVs`);
});
assert.equal(meshes.length, 3);
const backdrop = gltf.scene.getObjectByName("spring-introduction-backdrop");
assert.equal(backdrop.userData.source_parts, "0", "Keep the original backdrop without its old text planes");
assert.equal(backdrop.geometry.attributes.position.count, 966);
for (const [side, expected] of [
  ["left", "Hi, I'm withdong02. You can call me ddd. I'm an information security student at HDU. Glad to meet you here."],
  ["right", "A little corner for things I learn, moments I want to remember, and music I enjoy. Take your time and wander around."],
]) {
  const node = gltf.scene.getObjectByName(`spring-introduction-${side}`);
  assert.equal(node.userData.text.replace(/\s+/g, " "), expected);
  const positions = node.geometry.attributes.position;
  assert(positions.count > 4 && positions.count <= 250, "Paper must follow the curved wall with a small grid");
  const box = new Box3().setFromObject(node);
  assert(box.max.y-box.min.y <= node.userData.max_height + 1e-5);
  const center = box.getCenter(new Vector3());
  const normal = new Vector3().fromBufferAttribute(node.geometry.attributes.normal, 0);
  assert(normal.dot(new Vector3(-center.x, 0, -center.z)) > 0, "Text must face the scene, not the rear of the wall");
  const inward = new Vector3(-center.x,0,-center.z).normalize();
  for (let i=0;i<positions.count;i++) {
    const point = new Vector3().fromBufferAttribute(positions,i);
    const ray = new Raycaster(point.clone().add(inward),inward.clone().negate());
    const [hit] = ray.intersectObject(backdrop);
    assert(hit && point.distanceTo(hit.point)>.01 && point.distanceTo(hit.point)<.08, "Letters must sit just in front of the curved backdrop");
  }
  assert([...node.geometry.attributes.uv.array].every(v => v >= 0 && v <= 1));
}
for (const [path, expected] of [
  ["models/Scene_2_Spring-transformed.glb", "07d82fc3bbde38755325dbb97c77689a7e938c7179f92b0c124acefddcce65d7"],
  ["textures/Scene_2_Spring_1.webp", "ff71410b788561110427dfafe07c1a03e5825b5511dfdbcee3ba4d22ce7d6c7c"],
  ["fonts/SlimeBox.woff", "9276c94fbe06ec76516bdb7579a5fac10376cce71db758e65a44a86102c1781a"],
]) {
  const original = await readFile(new URL(`../public/${path}`, import.meta.url));
  assert.equal(createHash("sha256").update(original).digest("hex"), expected, `${path}: original changed`);
}
for (const name of ["spring-introduction.webp", "spring-introduction-text.webp"]) {
  const texture = await readFile(new URL(`../public/textures/${name}`, import.meta.url));
  assert.equal(texture.toString("ascii", 8, 12), "WEBP");
}
console.log("Spring introduction passed: approved left/right copy, 3 small meshes, inward-facing UV planes, original backdrop/model/font retained.");
