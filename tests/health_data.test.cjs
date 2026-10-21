const test = require('node:test');
const assert = require('node:assert/strict');
globalThis.crypto ||= require('node:crypto').webcrypto;
const api = require('../health-data.js');
const patient = {resourceType:'Patient',id:'p1',name:[{text:'Fictional Patient'}]};
function external(resources) {
  return {resourceType:'Bundle',type:'collection',entry:[{fullUrl:'urn:uuid:p1',resource:patient},...resources.map((resource,i)=>({fullUrl:'urn:uuid:r'+i,resource}))]};
}
const observation = () => ({resourceType:'Observation',id:'o1',subject:{reference:'Patient/p1'},status:'final',code:{text:'Example marker'},effectiveDateTime:'2026-01-02',valueQuantity:{value:5,unit:'mg/dL',comparator:'<'}});
test('backup round trip retains original scripts, review state, and healing links',()=>{
 const records=[{id:'REC-OCR-fictional',recordType:'Prescription',patientName:'Fictional Patient',summary:'తెలుగు · हिन्दी',medicines:[{name:'ExampleMed',strength:'10 mg',needsReview:true,userVerified:false}],labTests:[{test:'Example marker',value:'<5',unit:'mg/dL',needsReview:true,status:'HIGH'}],diagnoses:['Recorded condition'],ocrVersion:2}];
 const progress=[{id:'progress1',recordId:records[0].id,healed:true}];
 const bundle=api.exportHealth({name:'Fictional Patient',age:'30',gender:'female'},records,progress);
 const result=api.parseHealthFile(JSON.parse(JSON.stringify(bundle)));
 assert.deepEqual(result.records,records);assert.deepEqual(result.healthItems,progress);assert.equal(result.profile.age,'30');
 assert.equal(new Set(bundle.entry.map(e=>e.fullUrl)).size,bundle.entry.length);
 for(const e of bundle.entry) if(e.resource.subject) assert.ok(bundle.entry.some(p=>p.fullUrl===e.resource.subject.reference));
 const lab=bundle.entry.find(e=>e.resource.resourceType==='Observation').resource;
 assert.equal(lab.status,'preliminary');assert.equal(lab.interpretation,undefined);assert.equal(lab.valueString,'<5');
 assert.ok(!JSON.stringify(bundle).includes('StructureDefinition/DocumentBundle'));
});
test('external result preserves comparator, unit, date, and missing reference range',()=>{
 const result=api.parseHealthFile(external([observation()]));
 assert.equal(result.records[0].labTests[0].value,'<5');assert.equal(result.records[0].labTests[0].unit,'mg/dL');
 assert.equal(result.records[0].labTests[0].referenceRange,'');assert.equal(result.records[0].date,'2026-01-02');
 assert.equal(result.records[0].labTests[0].status,'UNKNOWN');
 assert.equal(api.parseHealthFile(external([observation()])).records[0].id,result.records[0].id);
});
test('pending results and imported medicines stay marked for review',()=>{
 const lab=observation();lab.status='preliminary';
 const result=api.parseHealthFile(external([lab,{resourceType:'MedicationRequest',status:'active',intent:'order',subject:{reference:'Patient/p1'},medicationCodeableConcept:{text:'ExampleMed'},dosageInstruction:[{text:'As written in the source'}]}]));
 const meds=result.records.flatMap(r=>r.medicines);assert.equal(meds[0].userVerified,false);assert.equal(meds[0].needsReview,true);
 assert.ok(result.records.some(r=>r.reviewItems.length));
});
test('local medication references resolve without fetching external resources',()=>{
 const result=api.parseHealthFile(external([{resourceType:'Medication',id:'m1',code:{text:'ExampleMed'}},{resourceType:'MedicationRequest',status:'unknown',intent:'order',subject:{reference:'Patient/p1'},medicationReference:{reference:'Medication/m1'}}]));
 assert.equal(result.records[0].medicines[0].name,'ExampleMed');
});
test('ambiguous patient files and references stop the import',()=>{
 const multiple=external([observation()]);multiple.entry.push({resource:{...patient,id:'p2'}});
 assert.throws(()=>api.parseHealthFile(multiple),/exactly one Patient/);
 const wrong=observation();wrong.subject.reference='Patient/another';assert.throws(()=>api.parseHealthFile(external([wrong])),/mixing records/);
});
test('transaction requests, duplicate URLs, and malformed bundles are rejected',()=>{
 const bundle=external([observation()]);bundle.type='transaction';assert.throws(()=>api.parseHealthFile(bundle),/Transaction/);
 bundle.type='collection';bundle.entry[1].request={method:'DELETE',url:'Patient/p1'};assert.throws(()=>api.parseHealthFile(bundle),/transaction requests/);
 delete bundle.entry[1].request;bundle.entry[1].fullUrl=bundle.entry[0].fullUrl;assert.throws(()=>api.parseHealthFile(bundle),/duplicate/);
 assert.throws(()=>api.parseHealthFile({resourceType:'Bundle',entry:[]}),/1–2,000/);
});
test('results entered in error are not imported as medical findings',()=>{
 const lab=observation();lab.status='entered-in-error';assert.throws(()=>api.parseHealthFile(external([lab])),/No supported/);
});
test('ABHA syntax and profile matching do not imply verification',()=>{
 assert.equal(api.formatAbha('12345678901234'),'12-3456-7890-1234');
 assert.throws(()=>api.validateAbha(api.formatAbha('1234567890123456'),''),/14 digits/);
 assert.throws(()=>api.validateAbha('12-3456',''),/14 digits/);
 assert.throws(()=>api.validateAbha('','name@example.com'),/@abdm/);
 assert.equal(api.canUseProfile({name:'Mr. Fictional Patient'},'Fictional Patient'),true);
 assert.equal(api.canUseProfile({name:'Fictional Patient'},'Different Patient'),false);
});
test('unnamed records are not silently assigned to the same patient',()=>{
 const bundle=api.exportHealth({},[{id:'one',recordType:'Lab Report',summary:'Synthetic one'},{id:'two',recordType:'Lab Report',summary:'Synthetic two'}]);
 const docs=bundle.entry.filter(e=>e.resource.resourceType==='DocumentReference' && e.resource.type?.text!=='Mr.Doc profile backup');
 assert.notEqual(docs[0].resource.subject.reference,docs[1].resource.subject.reference);
});
