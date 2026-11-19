import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Box3, Raycaster, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const read = path => readFile(new URL(`../${path}`,import.meta.url));
const hash = value => createHash("sha256").update(value).digest("hex");
const svg = (await read("public/images/spring-echo.svg")).toString();
const outline = svg.match(/\bd="([^"]+)"/)[1];
assert.equal(hash(outline),"d149a5111d2bccf3aa41b93b2df00396017fe91e4e145c836735344f23ff7c50","Keep the copied original outline");
const eyes = [...svg.matchAll(/<rect fill="[^"]+" x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)" rx="([^"]+)"/g)].map(m => m.slice(1).map(Number));
assert.equal(eyes.length, 2, "Only two eyes");
assert.deepEqual(await read("blog/assets/images/echo.svg"), await read("public/images/spring-echo.svg"), "Blog and spring share the capsule-eyed Echo");
const bytes = await read("public/models/spring-echo.glb");
assert(bytes.length<100000);
const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),"");
const meshes = [];
scene.traverse(node => { if(node.isMesh) meshes.push(node); });
assert.equal(meshes.length,3,"Only body and two eyes; no extra features");
const body = scene.getObjectByName("spring-echo-body");
const bounds = new Box3().setFromObject(body);
assert(Math.abs(bounds.max.y-bounds.min.y-1.23817823)<.001,"Retain the original decoration height");
const normal = new Vector3(-.4654,0,-.8851).normalize();
let min=Infinity,max=-Infinity;
for(const mesh of meshes) {
  assert.equal(mesh.userData.source_outline,outline);
  assert.equal(mesh.userData.paper_color,mesh===body?"#6299a1":"#e8e2d0");
  for(const attribute of Object.values(mesh.geometry.attributes)) assert([...attribute.array].every(Number.isFinite));
  assert([...mesh.geometry.attributes.uv.array].every(v=>v>=0&&v<=1));
}
const vertices=body.geometry.attributes.position;
for(let i=0;i<vertices.count;i++) {
  const d=new Vector3().fromBufferAttribute(vertices,i).dot(normal);
  min=Math.min(min,d);max=Math.max(max,d);
}
assert(max-min<.019,"Keep a thin paper edge");
let previousEye = -Infinity;
const right = new Vector3(normal.z,0,-normal.x);
for(let i=0;i<eyes.length;i++) {
  const eye=scene.getObjectByName(`spring-echo-eye-${i+1}`);
  assert.deepEqual(eye.userData.source_eye,eyes[i]);
  const [, , width, height, radius] = eyes[i];
  assert(height > width && width === radius * 2, "Keep vertical capsule eyes");
  const positions = eye.geometry.attributes.position;
  let minRight = Infinity, maxRight = -Infinity;
  for (let v = 0; v < positions.count; v++) {
    const value = new Vector3().fromBufferAttribute(positions, v).dot(right);
    minRight = Math.min(minRight, value); maxRight = Math.max(maxRight, value);
  }
  const eyeBounds = new Box3().setFromObject(eye);
  assert(Math.abs((eyeBounds.max.y - eyeBounds.min.y) / (maxRight - minRight) - height / width) < .02, "Model must retain capsule proportions");
  const center=new Box3().setFromObject(eye).getCenter(new Vector3());
  assert(center.dot(right)>previousEye,"Keep the original left/right orientation");
  previousEye=center.dot(right);
  const ray=new Raycaster(center.clone().add(normal),normal.clone().negate());
  const [hit]=ray.intersectObject(body);
  assert(hit&&center.distanceTo(hit.point)>.01&&center.distanceTo(hit.point)<.03,"Eye must sit in front of the body");
}
for(const [path,expected] of [
  ["public/models/Scene_2_Spring-transformed.glb","07d82fc3bbde38755325dbb97c77689a7e938c7179f92b0c124acefddcce65d7"],
  ["public/textures/Scene_2_Spring_1.webp","ff71410b788561110427dfafe07c1a03e5825b5511dfdbcee3ba4d22ce7d6c7c"],
  ["public/textures/Scene_2_Spring_2.webp","fb6d2bfbaa6eb997e96d0a4c0219d13b7e56196d74f0b415272dd90e4fab3948"],
]) assert.equal(hash(await read(path)),expected,`${path}: original changed`);
assert.equal((await read("public/textures/spring-echo.webp")).toString("ascii",8,12),"WEBP");
console.log("Spring Echo passed: original outline, shared capsule eyes, 3 thin paper meshes, eye layering, UVs and upstream preservation.");
