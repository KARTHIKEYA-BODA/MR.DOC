// Pure data-path checks using the actual app functions, without a browser/model.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
function section(start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, `Missing app function section: ${start}`);
  return source.slice(a, b);
}
const context = vm.createContext({});
vm.runInContext([
  'const S = { records: [] };',
  section('const esc =', 'let statusTimer;'),
  section('function comparableLabNumber(', 'function renderLabTrendComparisons('),
  section('function applyReviewedLabValue(', 'function openOcrReview('),
  'globalThis.api = { normalizeRecord, htmlData, buildLabTrendGroups, applyReviewedLabValue, syncReviewedRecordBundle };',
].join('\n'), context);
const { normalizeRecord, htmlData, buildLabTrendGroups, applyReviewedLabValue, syncReviewedRecordBundle } = context.api;

function record() {
  return {
    id: 'REC-OCR-SYNTHETIC', ocrVersion: 2, recordType: 'Lab Report', summary: 'Synthetic record',
    patientName: 'Fictional patient', date: '2026-01-01',
    labTests: [{ test: 'Example Marker', value: '140', unit: 'mg/dL', status: 'HIGH', interpretation: 'Original printed flag', needsReview: true }],
    medicines: [{ name: 'ExampleMed', strength: '10 mg' }],
    fhirBundle: { entry: [
      { resource: { resourceType: 'Observation', valueQuantity: { value: 140, unit: 'mg/dL' }, interpretation: [{ text: 'HIGH' }], note: [{ text: 'OCR value awaiting confirmation against the original report.' }] } },
      { resource: { resourceType: 'MedicationRequest', medicationCodeableConcept: { text: 'Old OCR name' } } },
    ] },
  };
}

test('reviewed low-confidence values remain reviewed after save/reload normalization', () => {
  const input = record();
  input.labTests[0] = { ...input.labTests[0], needsReview: false, userVerified: true, ocrConfidence: 40, sourceText: 'Example Marker 140 mg/dL' };
  input.medicines[0] = { ...input.medicines[0], userVerified: true, needsReview: false, ocrConfidence: 40, sourceText: 'ExampleMed 10 mg' };
  const loaded = normalizeRecord(input);
  assert.equal(loaded.labTests[0].needsReview, false);
  assert.equal(loaded.labTests[0].userVerified, true);
  assert.equal(loaded.medicines[0].needsReview, false);
});

test('unresolved results cannot become trend points', () => {
  const first = record();
  first.labTests[0].needsReview = false;
  const second = record();
  second.date = '2026-02-01';
  assert.equal(buildLabTrendGroups([first, second]).length, 0);
  second.labTests[0].needsReview = false;
  assert.equal(buildLabTrendGroups([first, second]).length, 1);
});

test('different people and different units do not form a comparison', () => {
  const first = record(); first.labTests[0].needsReview = false;
  const second = record(); second.labTests[0].needsReview = false; second.date = '2026-02-01';
  second.patientName = 'Another fictional patient';
  assert.equal(buildLabTrendGroups([first, second]).length, 0);
  second.patientName = first.patientName; second.labTests[0].unit = 'mmol/L';
  assert.equal(buildLabTrendGroups([first, second]).length, 0);
});

test('correcting a value clears the old clinical flag and updates exported numbers', () => {
  const input = record();
  assert.equal(applyReviewedLabValue(input, 'lab:0:value', '120'), 0);
  input.labTests[0].needsReview = false;
  syncReviewedRecordBundle(input);
  const exported = input.fhirBundle.entry[0].resource;
  assert.equal(exported.valueQuantity.value, 120);
  assert.equal(exported.status, 'final');
  assert.equal(exported.interpretation[0].text, 'UNKNOWN');
  assert.equal(input.labTests[0].interpretation, '');
  assert.equal(exported.note, undefined);
});

test('confirming an unchanged number retains its recorded flag', () => {
  const input = record();
  applyReviewedLabValue(input, 'lab:0:value', '140');
  assert.equal(input.labTests[0].status, 'HIGH');
});

test('blank or malformed corrections do not silently replace data', () => {
  const input = record();
  assert.equal(applyReviewedLabValue(input, 'lab:0:value', ''), null);
  assert.equal(applyReviewedLabValue(input, 'lab:9:value', '120'), null);
  assert.equal(applyReviewedLabValue(input, 'lab:0:status', 'NORMAL'), null);
  assert.equal(input.labTests[0].value, '140');
});

test('unresolved exports stay preliminary and medicine exports follow corrections', () => {
  const input = record();
  syncReviewedRecordBundle(input);
  assert.equal(input.fhirBundle.entry[0].resource.status, 'preliminary');
  assert.equal(input.fhirBundle.entry[0].resource.note.length, 1);
  assert.equal(input.fhirBundle.entry[1].resource.medicationCodeableConcept.text, 'ExampleMed');
  assert.equal(input.fhirBundle.entry[1].resource.dosageInstruction[0].text, '10 mg');
});

test('reader metadata survives normalization and transcript HTML remains escaped', () => {
  const input = record();
  input.secondaryOcrStatus = 'used';
  input.ocrReaders = ['Gemini Vision', 'Unlimited-OCR', 'unrecognized reader'];
  input.secondaryOcrText = '<script>not markup</script> నమూనా';
  const loaded = normalizeRecord(input);
  assert.equal(loaded.secondaryOcrStatus, 'used');
  assert.equal(loaded.ocrReaders.length, 2);
  assert.ok(htmlData(loaded).secondaryOcrText.startsWith('&lt;script&gt;'));
});
