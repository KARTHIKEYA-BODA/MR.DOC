const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const start = source.indexOf('function hasDocumentedBodySite(record) {');
const end = source.indexOf('function renderBodyMapPage()', start);
assert.ok(start >= 0 && end > start, 'Body map helpers are present');

const context = vm.createContext({
  esc: (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]),
});
vm.runInContext(`${source.slice(start, end)}\nglobalThis.api = { hasDocumentedBodySite, bodyLocation, bodyMarkerX, anatomyImage };`, context);
const { hasDocumentedBodySite, bodyLocation, bodyMarkerX, anatomyImage } = context.api;

test('diagnosis alone can select an illustration but never creates an injury marker', () => {
  const record = { diagnoses: ['Type 2 diabetes'], bodySite: '', injuryDescription: '' };
  assert.equal(hasDocumentedBodySite(record), false);
  const html = anatomyImage(record);
  assert.match(html, /assets\/anatomy\/full-body\.jpg/);
  assert.match(html, /health illustration · no location recorded/);
  assert.doesNotMatch(html, /class="anatomy-marker"/);
});

test('an explicit body site creates a correctly placed red marker', () => {
  const record = { bodySite: 'left foot sole', diagnoses: ['Diabetes'] };
  assert.equal(hasDocumentedBodySite(record), true);
  assert.equal(bodyLocation(record).y, 96);
  const html = anatomyImage(record);
  assert.match(html, /assets\/anatomy\/foot-sole\.jpg/);
  assert.match(html, /class="anatomy-marker"/);
});

test('an injury description with a clear body area can place a marker', () => {
  const record = { injuryDescription: 'Pain around the left knee', diagnoses: [] };
  assert.equal(hasDocumentedBodySite(record), true);
  assert.equal(bodyLocation(record).y, 76);
  assert.equal(bodyMarkerX(record, 0), 14);
  assert.equal(bodyMarkerX(record, 0.5), 46);
  assert.equal(bodyMarkerX(record, 1), 78);
});

test('unspecified site text does not create a marker', () => {
  const record = { bodySite: 'unspecified', injuryDescription: 'general symptoms' };
  assert.equal(hasDocumentedBodySite(record), false);
  assert.doesNotMatch(anatomyImage(record), /class="anatomy-marker"/);
});
