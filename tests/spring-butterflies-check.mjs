import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const bytes = await readFile(new URL("../public/models/spring-butterflies.glb",import.meta.url));
assert(bytes.length<600000,"Keep this decoration small");
assert.equal(bytes.readUInt32LE(8),bytes.length);
const gltf = JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
assert(gltf.extensionsRequired.includes("KHR_draco_mesh_compression"));
const nodes = gltf.nodes.filter(n=>n.mesh!==undefined);
assert.equal(nodes.length,10);
const get = name => {
  const node=nodes.find(n=>n.name===`spring-butterfly-${name}`);
  assert(node,`Missing ${name}`);
  return node;
};
const bounds = node => gltf.accessors[gltf.meshes[node.mesh].primitives[0].attributes.POSITION];
const surroundings = get("surroundings");
assert.deepEqual(surroundings.extras.source_parts.split(",").map(Number),Array.from({length:93},(_,i)=>i+1),"Keep every unrelated component");
const thread=get("thread"),threadBox=bounds(thread);
assert.equal(thread.extras.source_parts,"0");
assert(Math.abs(threadBox.max[1]-7.5574593544)<1e-4,"Thread top must stay fixed");
assert(Math.abs(threadBox.min[1]-thread.extras.raised_bottom)<1e-4);
const main=get("main-body");
assert(Math.abs(main.translation[1]-3.85)<1e-4);
assert(main.translation[1]+bounds(get("main-wings")).min[1]>3.3002,"Main butterfly must clear the full gate frame");
assert(Math.abs(main.translation[1]-threadBox.min[1])<.03,"Shortened thread must meet the body");
for(const [name,color,height] of [["apricot","#ddbd80",3.35],["lilac","#b5a2c2",3.75],["blue","#86b8be",2.8]]) {
  const body=get(`${name}-body`),wings=get(`${name}-wings`);
  assert(body.extras.size<1,"Companions should be smaller than the main butterfly");
  assert.deepEqual(body.translation,wings.translation);
  assert(Math.abs(body.translation[1]-height)<1e-4);
  assert.equal(wings.extras.paper_color,color);
  assert.equal(body.extras.source_parts,"0");
  assert.equal(wings.extras.source_parts,"1,2");
}
for(const accessor of gltf.accessors) {
  assert(accessor.count>0);
  for(const key of ["min","max"]) if(accessor[key]) assert(accessor[key].every(Number.isFinite));
}
for(const [file,expected] of [
  ["models/Scene_2_Spring-transformed.glb","07d82fc3bbde38755325dbb97c77689a7e938c7179f92b0c124acefddcce65d7"],
  ["textures/Scene_2_Spring_2.webp","fb6d2bfbaa6eb997e96d0a4c0219d13b7e56196d74f0b415272dd90e4fab3948"],
]) assert.equal(createHash("sha256").update(await readFile(new URL(`../public/${file}`,import.meta.url))).digest("hex"),expected);
console.log("Spring butterflies passed: raised main, shortened thread with fixed top, 3 small companions, surrounding components retained.");
