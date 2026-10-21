#!/usr/bin/env node
/* Validate the packed Mr.Doc character before the frontend loads it.
   Usage: node tools/validate_mrdoc_glb.mjs [path ...]
   Default path: assets/mrdoc.glb
   Exit code 0 only when every required clip is present in every file. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED = ['idle', 'wave', 'think', 'talk_one', 'explain', 'reassure'];
const ALIASES = {
  idle: ['idle', 'breathing idle', 'breathingidle', 'breathing'],
  wave: ['wave', 'standing greeting', 'standinggreeting', 'greeting'],
  think: ['think', 'thinking'],
  talk_one: ['talk one', 'talkone', 'talking', 'talk'],
  explain: ['explain', 'explaining', 'arguing'],
  reassure: ['reassure', 'thoughtful head nod', 'head nod', 'nod'],
};

const normalize = (name) =>
  String(name || '')
    .split('|')
    .pop()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();

export function readGlbJson(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.readUInt32LE(0) !== 0x46546c67) {
    throw new Error('Not a GLB file (missing glTF magic).');
  }
  const version = buffer.readUInt32LE(4);
  const length = buffer.readUInt32LE(8);
  if (version !== 2) throw new Error(`Expected glTF 2.0, found version ${version}.`);
  if (length !== buffer.length) {
    throw new Error(`GLB length ${length} does not match the file size ${buffer.length}.`);
  }
  let offset = 12;
  while (offset < buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    offset += 8;
    if (chunkType === 0x4e4f534a) {
      return JSON.parse(buffer.subarray(offset, offset + chunkLength).toString('utf8'));
    }
    offset += chunkLength;
  }
  throw new Error('GLB has no JSON chunk.');
}

export function inspect(file) {
  const gltf = readGlbJson(file);
  const clips = (gltf.animations || []).map((animation) => animation.name || '(unnamed)');
  const found = new Set();
  const unmatched = [];
  for (const clip of clips) {
    const name = normalize(clip);
    const slot = REQUIRED.find((key) => ALIASES[key].some((alias) => name === alias || name.startsWith(alias) || name.endsWith(alias)));
    if (slot) found.add(slot);
    else unmatched.push(clip);
  }
  const skins = gltf.skins || [];
  const joints = Math.max(0, ...skins.map((skin) => (skin.joints || []).length));
  return {
    file,
    bytes: fs.statSync(file).size,
    clips,
    found: REQUIRED.filter((slot) => found.has(slot)),
    missing: REQUIRED.filter((slot) => !found.has(slot)),
    unmatched,
    meshes: (gltf.meshes || []).length,
    skins: skins.length,
    joints,
    materials: (gltf.materials || []).length,
    textures: (gltf.textures || []).length,
    generators: (gltf.asset && gltf.asset.generator) || 'unknown',
  };
}

function report(result) {
  const mib = result.bytes / 1024 / 1024;
  console.log(`\n${path.relative(process.cwd(), result.file)}  (${mib.toFixed(2)} MiB)`);
  console.log(`  generator : ${result.generators}`);
  console.log(`  meshes    : ${result.meshes}   skins: ${result.skins}   joints: ${result.joints}`);
  console.log(`  materials : ${result.materials}   textures: ${result.textures}`);
  console.log(`  clips     : ${result.clips.length ? result.clips.join(', ') : '(none)'}`);
  if (result.unmatched.length) {
    console.log(`  unmatched : ${result.unmatched.join(', ')}`);
  }
  if (result.missing.length) {
    console.error(`  MISSING   : ${result.missing.join(', ')}`);
  } else {
    console.log('  status    : all six clips found');
  }
  if (!result.joints) {
    console.error('  MISSING   : skin/joints (the export is not rigged)');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const files = process.argv.slice(2);
  if (!files.length) files.push('assets/mrdoc.glb');
  let failed = false;
  for (const file of files) {
    try {
      const result = inspect(file);
      report(result);
      if (result.missing.length || !result.joints) failed = true;
    } catch (error) {
      failed = true;
      console.error(`\n${file}: ${error.message}`);
    }
  }
  process.exit(failed ? 1 : 0);
}
