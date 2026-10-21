const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const stage = read('mrdoc3d.js');
const app = read('app.js');
const html = read('Mr.Doc – Health Copilot (3).html');

test('the packed model must expose all six clips', async () => {
  const { inspect } = await import(
    pathToFileURL(path.join(root, 'tools/validate_mrdoc_glb.mjs')).href
  );
  const result = inspect(path.join(root, 'tests/fixtures/mrdoc.test.glb'));
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.found, ['idle', 'wave', 'think', 'talk_one', 'explain', 'reassure']);
});

test('the stage crossfades over 0.35 seconds and keeps the 2D fallback', () => {
  assert.match(stage, /FADE_SECONDS = 0\.35/);
  assert.match(stage, /crossFadeTo\(next, fade, false\)/);
  assert.match(stage, /stage-3d/);
  assert.match(stage, /Keeping the 2D sprite stage/);
  for (const clip of ['idle', 'wave', 'think', 'talk_one', 'explain', 'reassure']) {
    assert.match(stage, new RegExp(`"${clip}"`));
  }
});

test('app.js drives expressions, speech length, and greetings through the stage', () => {
  assert.match(app, /window\.MrDocStage\?\.setExpression\(k\)/);
  assert.match(app, /window\.MrDocStage\?\.speak\(text\)/);
  assert.match(app, /window\.MrDocStage\?\.greet\(\)/);
});

test('the stage queues a wave until the GLB is ready', () => {
  assert.match(stage, /pendingWave/);
});

test('the stage canvas and module load after the sprite markup', () => {
  const canvas = html.indexOf('id="mrdoc3d"');
  const sprites = html.indexOf('id="bd"');
  assert.ok(canvas > 0 && sprites > canvas, 'canvas should sit before the sprite layers');
  assert.match(html, /mrdocStage\.type = "module"/);
  assert.match(html, /mrdocStage\.src = "mrdoc3d\.js"/);
});
