const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
const start=source.indexOf('async function handleFileUpload(file) {');
const end=source.indexOf('async function preparePrescriptionImage(file)',start);
function setup(fails) {
 const elements=new Map();
 const node=()=>({hidden:true,textContent:'',dataset:{},attributes:{},classList:{add(){},remove(){}},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];}});
 const progress=node();
 const context=vm.createContext({setTimeout,clearTimeout,URL:{createObjectURL:()=> 'blob:synthetic'},Error});
 context.$=selector=>{if(!elements.has(selector)) elements.set(selector,node());return elements.get(selector);};
 context.$('#upload-progress-fill').parentElement=progress;
 context.readFileBase64=async()=> 'synthetic';context.updateUploadUI=()=>{};context.stopSpeech=()=>{};context.setExp=()=>{};
 context.sleep=async()=>{};context.notify=message=>{context.notice=message;};context.handleAnalyzedRecord=record=>{context.savedRecord=record;};
 context.requestJson=async()=>{context.calls=(context.calls||0)+1;if(fails)throw new Error('Service temporarily busy.');return {record:{id:'synthetic'},audio:''};};
 vm.runInContext('let uploading=false,lastUploadFile=null,speechActive=false;const S={profile:{},lang:"en"},CONFIG={ocrEndpoint:"/api/analyze-record"};const voice=false;'+source.slice(start,end)+';globalThis.upload=handleFileUpload;globalThis.state=()=>({uploading,lastUploadFile});',context);
 return {context,elements,progress};
}
const file=()=>({name:'fictional.pdf',type:'application/pdf',size:100});
test('service failure keeps the exact file for retry and releases the loading screen',async()=>{
 const {context,elements}=setup(true),upload=file();await context.upload(upload);
 assert.equal(context.state().lastUploadFile,upload);assert.equal(context.state().uploading,false);
 assert.equal(elements.get('#analysis-overlay').hidden,true);assert.equal(elements.get('#upload-retry-banner').hidden,false);
 assert.equal(elements.get('#upload-retry-btn').textContent,'Try again');assert.equal(context.savedRecord,undefined);
 assert.equal(elements.get('#upload-retry-file').textContent,upload.name);
 await context.upload(context.state().lastUploadFile);assert.equal(context.calls,2);
});
test('successful upload completes the progress bar and drops the retained file',async()=>{
 const {context,elements,progress}=setup(false);await context.upload(file());
 assert.equal(context.savedRecord.id,'synthetic');assert.equal(context.state().lastUploadFile,null);
 assert.equal(progress.attributes['aria-valuenow'],'100');assert.equal(elements.get('#upload-retry-banner').hidden,true);
 assert.equal(elements.get('#analysis-file-name').textContent,'fictional.pdf');
 assert.equal(context.state().uploading,false);
});
test('invalid file selection makes no provider request',async()=>{
 const {context}=setup(false);await context.upload({name:'bad.exe',type:'application/octet-stream',size:100});
 assert.equal(context.calls,undefined);assert.equal(context.savedRecord,undefined);assert.match(context.notice,/PNG/);
});

test('choosing an invalid replacement clears the older file retry',async()=>{
 const {context,elements}=setup(true);await context.upload(file());
 await context.upload({name:'different.exe',type:'application/octet-stream',size:100});
 assert.equal(context.calls,1);assert.equal(context.state().lastUploadFile,null);
 assert.equal(elements.get('#upload-retry-banner').hidden,true);
});
