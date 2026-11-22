import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? files(target) : [target];
  }));
  return nested.flat();
}

const publicFiles = await files(path.join(root, "public"));
const exactPaths = new Set(publicFiles.map((file) => path.relative(path.join(root, "public"), file).split(path.sep).join("/")));
const sources = new Map();
async function visit(file) {
  if (sources.has(file) || !/\.(jsx?|css)$/.test(file)) return;
  const source = await readFile(file, "utf8");
  sources.set(file, source);
  for (const match of source.matchAll(/\b(?:import|export)\s+(?:[^;"']*?\s+from\s*)?["'](\.[^"']+)["']/g)) {
    const base = path.resolve(path.dirname(file), match[1]);
    const candidates = [base, `${base}.js`, `${base}.jsx`, path.join(base, "index.js")];
    let found;
    for (const candidate of candidates) {
      try { await readFile(candidate); found = candidate; break; }
      catch (error) { if (error.code !== "ENOENT" && error.code !== "EISDIR") throw error; }
    }
    assert(found, `Missing source import: ${match[1]} in ${file}`);
    await visit(found);
  }
}
await visit(path.join(root, "src/main.jsx"));
const sourceFiles = (await files(path.join(root, "src"))).filter(file => /\.(jsx?|css)$/.test(file));
for (const file of sourceFiles) assert(sources.has(file), `Unreachable runtime source: ${path.relative(root, file)}`);
let references = 0;
for (const [file, source] of sources) {
  for (const match of source.matchAll(/["'`](\/(?:models|images|textures|fonts|basis|draco)\/[^"'`\s]+)["'`]/g)) {
    const resource = match[1].slice(1);
    if (resource.includes("${") || resource.endsWith("/")) continue;
    assert(exactPaths.has(resource), `Missing or case-mismatched resource: ${resource} in ${path.relative(root, file)}`);
    references++;
  }
}

let compressed = 0;
for (const file of publicFiles.filter((file) => file.endsWith(".glb"))) {
  const bytes = await readFile(file);
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, `Invalid GLB: ${file}`);
  assert.equal(bytes.readUInt32LE(8), bytes.length, `Truncated GLB: ${file}`);
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  if (json.extensionsRequired?.includes("KHR_draco_mesh_compression")) compressed++;
  for (const resource of [...(json.buffers ?? []), ...(json.images ?? [])]) {
    assert(!resource.uri || resource.uri.startsWith("data:"), `GLB requires an external resource: ${file}`);
  }
}
assert(compressed > 0, "Expected Draco-compressed scene models");

for (const name of ["draco_decoder.js", "draco_wasm_wrapper.js", "draco_decoder.wasm"]) {
  const installed = await readFile(path.join(root, "node_modules/three/examples/jsm/libs/draco/gltf", name));
  const hosted = await readFile(path.join(root, "public/draco", name));
  assert.equal(digest(hosted), digest(installed), `Decoder does not match locked Three.js: ${name}`);
}
const entry = await readFile(path.join(root, "src/main.jsx"), "utf8");
assert(entry.indexOf("import './scene/loaders/configure-loaders.js'") >= 0 && entry.indexOf("import './scene/loaders/configure-loaders.js'") < entry.indexOf("import App"), "Configure loaders before preloading models");
assert((await readFile(path.join(root, "public/draco/LICENSE"), "utf8")).includes("Apache License"));
console.log(`Static assets passed: ${sources.size} reachable source files, ${references} resource references, ${compressed} compressed models, local decoder hashes and Linux asset filename case.`);
