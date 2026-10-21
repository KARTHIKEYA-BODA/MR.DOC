#!/usr/bin/env node
/* Build a skinned chibi-doctor GLB with the six Mr.Doc clip names.
   This is a stand-in until Mixamo + Blender write assets/mrdoc.glb.
   Usage: node tools/make_placeholder_mrdoc.mjs [output] */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const output = path.resolve(
  process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'mrdoc.glb'),
);

const MATERIALS = {
  coat: [0.93, 0.95, 0.97],
  skin: [0.93, 0.75, 0.62],
  hair: [0.16, 0.11, 0.09],
  navy: [0.16, 0.24, 0.38],
  shoe: [0.12, 0.12, 0.14],
  glass: [0.18, 0.2, 0.24],
  teal: [0.22, 0.62, 0.6],
  lens: [0.55, 0.72, 0.78],
};

const BONES = [
  { name: 'Hips', parent: null, t: [0, 0.82, 0] },
  { name: 'Spine', parent: 'Hips', t: [0, 0.1, 0.01] },
  { name: 'Chest', parent: 'Spine', t: [0, 0.16, 0] },
  { name: 'Neck', parent: 'Chest', t: [0, 0.16, 0] },
  { name: 'Head', parent: 'Neck', t: [0, 0.1, 0.02] },
  { name: 'LeftShoulder', parent: 'Chest', t: [0.12, 0.12, 0] },
  { name: 'LeftArm', parent: 'LeftShoulder', t: [0.12, -0.02, 0] },
  { name: 'LeftForeArm', parent: 'LeftArm', t: [0.2, 0, 0] },
  { name: 'LeftHand', parent: 'LeftForeArm', t: [0.16, 0, 0] },
  { name: 'RightShoulder', parent: 'Chest', t: [-0.12, 0.12, 0] },
  { name: 'RightArm', parent: 'RightShoulder', t: [-0.12, -0.02, 0] },
  { name: 'RightForeArm', parent: 'RightArm', t: [-0.2, 0, 0] },
  { name: 'RightHand', parent: 'RightForeArm', t: [-0.16, 0, 0] },
  { name: 'LeftUpLeg', parent: 'Hips', t: [0.08, -0.04, 0] },
  { name: 'LeftLeg', parent: 'LeftUpLeg', t: [0, -0.36, 0] },
  { name: 'LeftFoot', parent: 'LeftLeg', t: [0, -0.34, 0.04] },
  { name: 'RightUpLeg', parent: 'Hips', t: [-0.08, -0.04, 0] },
  { name: 'RightLeg', parent: 'RightUpLeg', t: [0, -0.36, 0] },
  { name: 'RightFoot', parent: 'RightLeg', t: [0, -0.34, 0.04] },
];

function matIdentity() {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

function matTranslate(x, y, z) {
  const m = matIdentity();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

function matMul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] =
        a[r] * b[c * 4] +
        a[4 + r] * b[c * 4 + 1] +
        a[8 + r] * b[c * 4 + 2] +
        a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}

function matInvert(m) {
  const out = new Float32Array(16);
  const n = m;
  out[0] = n[5] * n[10] * n[15] - n[5] * n[11] * n[14] - n[9] * n[6] * n[15] + n[9] * n[7] * n[14] + n[13] * n[6] * n[11] - n[13] * n[7] * n[10];
  out[4] = -n[4] * n[10] * n[15] + n[4] * n[11] * n[14] + n[8] * n[6] * n[15] - n[8] * n[7] * n[14] - n[12] * n[6] * n[11] + n[12] * n[7] * n[10];
  out[8] = n[4] * n[9] * n[15] - n[4] * n[11] * n[13] - n[8] * n[5] * n[15] + n[8] * n[7] * n[13] + n[12] * n[5] * n[11] - n[12] * n[7] * n[9];
  out[12] = -n[4] * n[9] * n[14] + n[4] * n[10] * n[13] + n[8] * n[5] * n[14] - n[8] * n[6] * n[13] - n[12] * n[5] * n[10] + n[12] * n[6] * n[9];
  out[1] = -n[1] * n[10] * n[15] + n[1] * n[11] * n[14] + n[9] * n[2] * n[15] - n[9] * n[3] * n[14] - n[13] * n[2] * n[11] + n[13] * n[3] * n[10];
  out[5] = n[0] * n[10] * n[15] - n[0] * n[11] * n[14] - n[8] * n[2] * n[15] + n[8] * n[3] * n[14] + n[12] * n[2] * n[11] - n[12] * n[3] * n[10];
  out[9] = -n[0] * n[9] * n[15] + n[0] * n[11] * n[13] + n[8] * n[1] * n[15] - n[8] * n[3] * n[13] - n[12] * n[1] * n[11] + n[12] * n[3] * n[9];
  out[13] = n[0] * n[9] * n[14] - n[0] * n[10] * n[13] - n[8] * n[1] * n[14] + n[8] * n[2] * n[13] + n[12] * n[1] * n[10] - n[12] * n[2] * n[9];
  out[2] = n[1] * n[6] * n[15] - n[1] * n[7] * n[14] - n[5] * n[2] * n[15] + n[5] * n[3] * n[14] + n[13] * n[2] * n[7] - n[13] * n[3] * n[6];
  out[6] = -n[0] * n[6] * n[15] + n[0] * n[7] * n[14] + n[4] * n[2] * n[15] - n[4] * n[3] * n[14] - n[12] * n[2] * n[7] + n[12] * n[3] * n[6];
  out[10] = n[0] * n[5] * n[15] - n[0] * n[7] * n[13] - n[4] * n[1] * n[15] + n[4] * n[3] * n[13] + n[12] * n[1] * n[7] - n[12] * n[3] * n[5];
  out[14] = -n[0] * n[5] * n[14] + n[0] * n[6] * n[13] + n[4] * n[1] * n[14] - n[4] * n[2] * n[13] - n[12] * n[1] * n[6] + n[12] * n[2] * n[5];
  out[3] = -n[1] * n[6] * n[11] + n[1] * n[7] * n[10] + n[5] * n[2] * n[11] - n[5] * n[3] * n[10] - n[9] * n[2] * n[7] + n[9] * n[3] * n[6];
  out[7] = n[0] * n[6] * n[11] - n[0] * n[7] * n[10] - n[4] * n[2] * n[11] + n[4] * n[3] * n[10] + n[8] * n[2] * n[7] - n[8] * n[3] * n[6];
  out[11] = -n[0] * n[5] * n[11] + n[0] * n[7] * n[9] + n[4] * n[1] * n[11] - n[4] * n[3] * n[9] - n[8] * n[1] * n[7] + n[8] * n[3] * n[5];
  out[15] = n[0] * n[5] * n[10] - n[0] * n[6] * n[9] - n[4] * n[1] * n[10] + n[4] * n[2] * n[9] + n[8] * n[1] * n[6] - n[8] * n[2] * n[5];
  const det = n[0] * out[0] + n[1] * out[4] + n[2] * out[8] + n[3] * out[12];
  if (Math.abs(det) < 1e-8) return matIdentity();
  for (let i = 0; i < 16; i++) out[i] /= det;
  return out;
}

function quatFromEuler(x, y, z) {
  const cx = Math.cos(x / 2);
  const sx = Math.sin(x / 2);
  const cy = Math.cos(y / 2);
  const sy = Math.sin(y / 2);
  const cz = Math.cos(z / 2);
  const sz = Math.sin(z / 2);
  return [
    sx * cy * cz - cx * sy * sz,
    cx * sy * cz + sx * cy * sz,
    cx * cy * sz - sx * sy * cz,
    cx * cy * cz + sx * sy * sz,
  ];
}

function rotMat(rx, ry, rz) {
  const q = quatFromEuler(rx, ry, rz);
  const [x, y, z, w] = q;
  return new Float32Array([
    1 - 2 * y * y - 2 * z * z, 2 * x * y + 2 * w * z, 2 * x * z - 2 * w * y, 0,
    2 * x * y - 2 * w * z, 1 - 2 * x * x - 2 * z * z, 2 * y * z + 2 * w * x, 0,
    2 * x * z + 2 * w * y, 2 * y * z - 2 * w * x, 1 - 2 * x * x - 2 * y * y, 0,
    0, 0, 0, 1,
  ]);
}

function transformPoint(m, x, y, z) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

function transformDir(m, x, y, z) {
  return [
    m[0] * x + m[4] * y + m[8] * z,
    m[1] * x + m[5] * y + m[9] * z,
    m[2] * x + m[6] * y + m[10] * z,
  ];
}

function minMax(values, stride) {
  const min = Array(stride).fill(Infinity);
  const max = Array(stride).fill(-Infinity);
  for (let i = 0; i < values.length; i += stride) {
    for (let s = 0; s < stride; s++) {
      const v = values[i + s];
      if (v < min[s]) min[s] = v;
      if (v > max[s]) max[s] = v;
    }
  }
  return { min, max };
}

const boneIndex = Object.fromEntries(BONES.map((bone, i) => [bone.name, i]));
const world = BONES.map(() => matIdentity());
for (let i = 0; i < BONES.length; i++) {
  const local = matTranslate(...BONES[i].t);
  world[i] = BONES[i].parent == null ? local : matMul(world[boneIndex[BONES[i].parent]], local);
}

const groups = Object.fromEntries(Object.keys(MATERIALS).map((name) => [name, {
  positions: [],
  normals: [],
  joints: [],
  weights: [],
  indices: [],
}]));

function box(jointName, material, cx, cy, cz, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  const joint = boneIndex[jointName];
  const group = groups[material];
  const xf = matMul(matTranslate(cx, cy, cz), rotMat(rx, ry, rz));
  const faces = [
    { n: [0, 0, 1], corners: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
    { n: [0, 0, -1], corners: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
    { n: [0, 1, 0], corners: [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]] },
    { n: [0, -1, 0], corners: [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]] },
    { n: [1, 0, 0], corners: [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]] },
    { n: [-1, 0, 0], corners: [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]] },
  ];
  for (const face of faces) {
    const start = group.positions.length / 3;
    const n = transformDir(xf, ...face.n);
    const len = Math.hypot(...n) || 1;
    for (const corner of face.corners) {
      const p = transformPoint(xf, (corner[0] * sx) / 2, (corner[1] * sy) / 2, (corner[2] * sz) / 2);
      group.positions.push(...p);
      group.normals.push(n[0] / len, n[1] / len, n[2] / len);
      group.joints.push(joint, 0, 0, 0);
      group.weights.push(1, 0, 0, 0);
    }
    group.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
}

function w(name) {
  return transformPoint(world[boneIndex[name]], 0, 0, 0);
}

const hips = w('Hips');
const chest = w('Chest');
const head = w('Head');
const lArm = w('LeftArm');
const lFore = w('LeftForeArm');
const lHand = w('LeftHand');
const rArm = w('RightArm');
const rFore = w('RightForeArm');
const rHand = w('RightHand');
const lUp = w('LeftUpLeg');
const lLeg = w('LeftLeg');
const lFoot = w('LeftFoot');
const rUp = w('RightUpLeg');
const rLeg = w('RightLeg');
const rFoot = w('RightFoot');

box('Hips', 'navy', hips[0], hips[1] - 0.04, hips[2], 0.28, 0.16, 0.16);
box('Spine', 'coat', (hips[0] + chest[0]) / 2, hips[1] + 0.12, 0.02, 0.3, 0.28, 0.18);
box('Chest', 'coat', chest[0], chest[1] + 0.02, 0.03, 0.36, 0.28, 0.2);
box('Chest', 'coat', chest[0], chest[1] + 0.02, -0.06, 0.4, 0.32, 0.08); // coat back
box('Chest', 'teal', chest[0], chest[1] + 0.04, 0.12, 0.16, 0.03, 0.03); // stethoscope bar
box('Chest', 'teal', 0.09, chest[1] - 0.04, 0.12, 0.03, 0.16, 0.03);
box('Chest', 'teal', -0.09, chest[1] - 0.04, 0.12, 0.03, 0.16, 0.03);
box('Chest', 'teal', 0, chest[1] - 0.12, 0.13, 0.08, 0.08, 0.04); // chest piece
box('Neck', 'skin', 0, w('Neck')[1], 0.02, 0.1, 0.12, 0.1);
box('Head', 'skin', head[0], head[1] + 0.16, head[2], 0.32, 0.34, 0.3);
box('Head', 'hair', head[0], head[1] + 0.3, head[2] - 0.02, 0.34, 0.14, 0.32);
box('Head', 'hair', head[0], head[1] + 0.22, head[2] - 0.14, 0.32, 0.18, 0.08);
box('Head', 'glass', 0.08, head[1] + 0.16, head[2] + 0.14, 0.12, 0.08, 0.02);
box('Head', 'glass', -0.08, head[1] + 0.16, head[2] + 0.14, 0.12, 0.08, 0.02);
box('Head', 'lens', 0.08, head[1] + 0.16, head[2] + 0.145, 0.09, 0.06, 0.01);
box('Head', 'lens', -0.08, head[1] + 0.16, head[2] + 0.145, 0.09, 0.06, 0.01);
box('Head', 'glass', 0, head[1] + 0.16, head[2] + 0.14, 0.04, 0.02, 0.02);
box('Head', 'skin', 0.17, head[1] + 0.14, head[2], 0.05, 0.08, 0.06);
box('Head', 'skin', -0.17, head[1] + 0.14, head[2], 0.05, 0.08, 0.06);
box('LeftArm', 'coat', lArm[0] + 0.08, lArm[1], lArm[2], 0.2, 0.1, 0.1);
box('LeftForeArm', 'coat', lFore[0] + 0.06, lFore[1], lFore[2], 0.18, 0.08, 0.08);
box('LeftHand', 'skin', lHand[0] + 0.04, lHand[1], lHand[2], 0.1, 0.07, 0.07);
box('RightArm', 'coat', rArm[0] - 0.08, rArm[1], rArm[2], 0.2, 0.1, 0.1);
box('RightForeArm', 'coat', rFore[0] - 0.06, rFore[1], rFore[2], 0.18, 0.08, 0.08);
box('RightHand', 'skin', rHand[0] - 0.04, rHand[1], rHand[2], 0.1, 0.07, 0.07);
box('LeftUpLeg', 'navy', lUp[0], lUp[1] - 0.16, lUp[2], 0.12, 0.36, 0.12);
box('LeftLeg', 'navy', lLeg[0], lLeg[1] - 0.16, lLeg[2], 0.1, 0.34, 0.1);
box('LeftFoot', 'shoe', lFoot[0], lFoot[1] - 0.04, lFoot[2] + 0.04, 0.1, 0.08, 0.18);
box('RightUpLeg', 'navy', rUp[0], rUp[1] - 0.16, rUp[2], 0.12, 0.36, 0.12);
box('RightLeg', 'navy', rLeg[0], rLeg[1] - 0.16, rLeg[2], 0.1, 0.34, 0.1);
box('RightFoot', 'shoe', rFoot[0], rFoot[1] - 0.04, rFoot[2] + 0.04, 0.1, 0.08, 0.18);

function rad(deg) {
  return (deg * Math.PI) / 180;
}

function pose(map) {
  const rotations = BONES.map(() => [0, 0, 0, 1]);
  for (const [name, euler] of Object.entries(map)) {
    rotations[boneIndex[name]] = quatFromEuler(rad(euler[0]), rad(euler[1]), rad(euler[2]));
  }
  return rotations;
}

const rest = pose({});
const clips = {
  idle: {
    times: [0, 1, 2, 3],
    poses: [
      pose({ Hips: [0, 2, 0], Spine: [3, 0, 0], Chest: [2, 0, 0] }),
      pose({ Hips: [0, -2, 0], Spine: [6, 0, 0], Chest: [5, 0, 0] }),
      pose({ Hips: [0, 2, 0], Spine: [3, 0, 0], Chest: [2, 0, 0] }),
      pose({ Hips: [0, 2, 0], Spine: [3, 0, 0], Chest: [2, 0, 0] }),
    ],
  },
  wave: {
    times: [0, 0.25, 0.5, 0.75, 1.1, 1.45],
    poses: [
      rest,
      pose({ RightShoulder: [0, 0, 20], RightArm: [0, 0, -110], RightForeArm: [0, 20, -20], Head: [0, -8, 0] }),
      pose({ RightShoulder: [0, 0, 20], RightArm: [0, 0, -110], RightForeArm: [0, -35, -20], Head: [0, -8, 0] }),
      pose({ RightShoulder: [0, 0, 20], RightArm: [0, 0, -110], RightForeArm: [0, 35, -20], Head: [0, -8, 0] }),
      pose({ RightShoulder: [0, 0, 20], RightArm: [0, 0, -110], RightForeArm: [0, -20, -20], Head: [0, -6, 0] }),
      rest,
    ],
  },
  think: {
    times: [0, 0.5, 1.4, 2.2],
    poses: [
      rest,
      pose({ RightArm: [15, 40, -70], RightForeArm: [0, 70, -50], RightHand: [0, 20, 0], Head: [8, -12, 8], Neck: [6, -6, 0] }),
      pose({ RightArm: [12, 38, -68], RightForeArm: [0, 72, -48], RightHand: [0, 18, 0], Head: [10, -10, 6], Neck: [6, -6, 0] }),
      pose({ RightArm: [15, 40, -70], RightForeArm: [0, 70, -50], RightHand: [0, 20, 0], Head: [8, -12, 8], Neck: [6, -6, 0] }),
    ],
  },
  talk_one: {
    times: [0, 0.35, 0.7, 1.1],
    poses: [
      rest,
      pose({ RightArm: [8, 8, -28], RightForeArm: [0, 18, -12], Head: [0, 6, 0], Spine: [2, 4, 0] }),
      pose({ RightArm: [4, -6, -18], RightForeArm: [0, -8, -8], Head: [0, -4, 0], Spine: [1, -3, 0] }),
      rest,
    ],
  },
  explain: {
    times: [0, 0.4, 0.85, 1.3, 1.8],
    poses: [
      rest,
      pose({ LeftArm: [10, -20, 55], RightArm: [10, 20, -55], LeftForeArm: [0, -25, 10], RightForeArm: [0, 25, -10], Spine: [4, 0, 0] }),
      pose({ LeftArm: [6, 8, 40], RightArm: [16, -8, -70], LeftForeArm: [0, 10, 8], RightForeArm: [0, 10, -18], Head: [0, 8, 0] }),
      pose({ LeftArm: [16, -8, 70], RightArm: [6, 8, -40], LeftForeArm: [0, -10, 18], RightForeArm: [0, -10, -8], Head: [0, -8, 0] }),
      pose({ LeftArm: [10, -20, 55], RightArm: [10, 20, -55], LeftForeArm: [0, -25, 10], RightForeArm: [0, 25, -10], Spine: [4, 0, 0] }),
    ],
  },
  reassure: {
    times: [0, 0.28, 0.55, 0.85, 1.2],
    poses: [
      rest,
      pose({ Head: [14, 0, 0], Neck: [8, 0, 0], Spine: [4, 0, 0] }),
      pose({ Head: [2, 0, 0], Neck: [1, 0, 0], Spine: [1, 0, 0] }),
      pose({ Head: [12, 0, 0], Neck: [7, 0, 0], Spine: [3, 0, 0] }),
      rest,
    ],
  },
};

class Bin {
  constructor() {
    this.chunks = [];
    this.length = 0;
  }
  align() {
    const pad = (4 - (this.length % 4)) % 4;
    if (pad) this.push(new Uint8Array(pad));
  }
  push(typed) {
    this.align();
    const bytes = typed instanceof Uint8Array ? typed : new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
    const copy = new Uint8Array(bytes);
    this.chunks.push(copy);
    const offset = this.length;
    this.length += copy.byteLength;
    return offset;
  }
  concat() {
    const out = new Uint8Array(this.length);
    let offset = 0;
    for (const chunk of this.chunks) {
      out.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return out;
  }
}

const bin = new Bin();
const accessors = [];
const bufferViews = [];

function addAccessor(typed, type, componentType, extra = {}) {
  const offset = bin.push(typed);
  bufferViews.push({
    buffer: 0,
    byteOffset: offset,
    byteLength: typed.byteLength,
    ...extra.view,
  });
  const stride = { SCALAR: 1, VEC3: 3, VEC4: 4, MAT4: 16 }[type];
  const stats = extra.minMax ? minMax(Array.from(typed), stride) : {};
  accessors.push({
    bufferView: bufferViews.length - 1,
    componentType,
    count: typed.length / stride,
    type,
    ...(stats.min ? { min: stats.min, max: stats.max } : {}),
  });
  return accessors.length - 1;
}

const ibm = new Float32Array(BONES.length * 16);
for (let i = 0; i < BONES.length; i++) ibm.set(matInvert(world[i]), i * 16);
const ibmAccessor = addAccessor(ibm, 'MAT4', 5126);

const primitives = [];
const materialList = [];
for (const [name, color] of Object.entries(MATERIALS)) {
  const group = groups[name];
  if (!group.indices.length) continue;
  materialList.push({
    name,
    pbrMetallicRoughness: {
      baseColorFactor: [...color, 1],
      metallicFactor: name === 'glass' || name === 'lens' ? 0.6 : 0.05,
      roughnessFactor: name === 'glass' || name === 'lens' ? 0.15 : 0.7,
    },
  });
  primitives.push({
    attributes: {
      POSITION: addAccessor(new Float32Array(group.positions), 'VEC3', 5126, { view: { target: 34962 }, minMax: true }),
      NORMAL: addAccessor(new Float32Array(group.normals), 'VEC3', 5126, { view: { target: 34962 } }),
      JOINTS_0: addAccessor(new Uint16Array(group.joints), 'VEC4', 5123, { view: { target: 34962 } }),
      WEIGHTS_0: addAccessor(new Float32Array(group.weights), 'VEC4', 5126, { view: { target: 34962 } }),
    },
    indices: addAccessor(new Uint16Array(group.indices), 'SCALAR', 5123, { view: { target: 34963 } }),
    material: materialList.length - 1,
  });
}

const nodes = BONES.map((bone, i) => {
  const node = { name: bone.name, translation: bone.t };
  const children = [];
  for (let j = 0; j < BONES.length; j++) if (BONES[j].parent === bone.name) children.push(j);
  if (children.length) node.children = children;
  return node;
});
const meshNode = nodes.length;
nodes.push({ name: 'MrDocMesh', mesh: 0, skin: 0 });
const armatureNode = nodes.length;
nodes.push({ name: 'Armature', children: [0] });

const animations = Object.entries(clips).map(([name, clip]) => {
  const times = new Float32Array(clip.times);
  const timeAccessor = addAccessor(times, 'SCALAR', 5126, { minMax: true });
  const samplers = [];
  const channels = [];
  for (let bone = 0; bone < BONES.length; bone++) {
    const values = [];
    let changing = false;
    for (const frame of clip.poses) {
      values.push(...frame[bone]);
      if (frame[bone].some((v, i) => Math.abs(v - rest[bone][i]) > 1e-6)) changing = true;
    }
    if (!changing && name !== 'idle') continue;
    if (!changing && bone > 4) continue;
    const output = addAccessor(new Float32Array(values), 'VEC4', 5126);
    samplers.push({ input: timeAccessor, interpolation: 'LINEAR', output });
    channels.push({ sampler: samplers.length - 1, target: { node: bone, path: 'rotation' } });
  }
  return { name, samplers, channels };
});

const json = {
  asset: { version: '2.0', generator: 'V2_MR.DOC placeholder doctor' },
  scene: 0,
  scenes: [{ nodes: [armatureNode, meshNode] }],
  nodes,
  meshes: [{ name: 'MrDoc', primitives }],
  materials: materialList,
  skins: [{ name: 'MrDocSkin', joints: BONES.map((_, i) => i), inverseBindMatrices: ibmAccessor, skeleton: 0 }],
  animations,
  accessors,
  bufferViews,
  buffers: [{ byteLength: bin.length }],
};

function pad4(bytes, fill = 0x20) {
  const pad = (4 - (bytes.length % 4)) % 4;
  if (!pad) return bytes;
  const out = new Uint8Array(bytes.length + pad);
  out.set(bytes);
  out.fill(fill, bytes.length);
  return out;
}

const jsonBytes = pad4(Buffer.from(JSON.stringify(json)), 0x20);
const binBytes = pad4(bin.concat(), 0);
const glb = Buffer.alloc(12 + 8 + jsonBytes.length + 8 + binBytes.length);
glb.writeUInt32LE(0x46546c67, 0);
glb.writeUInt32LE(2, 4);
glb.writeUInt32LE(glb.length, 8);
glb.writeUInt32LE(jsonBytes.length, 12);
glb.writeUInt32LE(0x4e4f534a, 16);
glb.set(jsonBytes, 20);
const binHeader = 20 + jsonBytes.length;
glb.writeUInt32LE(binBytes.length, binHeader);
glb.writeUInt32LE(0x004e4942, binHeader + 4);
glb.set(binBytes, binHeader + 8);

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, glb);
console.log(`Wrote ${output} (${(glb.length / 1024).toFixed(1)} KiB) clips=${Object.keys(clips).join(',')}`);
