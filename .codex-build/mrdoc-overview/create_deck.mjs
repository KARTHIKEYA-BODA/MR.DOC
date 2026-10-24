import fs from 'node:fs/promises';
import path from 'node:path';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const root = 'C:/Users/BODA SHIVA KUMAR/OneDrive/Desktop/V2_MR.DOC';
const build = path.join(root, '.codex-build/mrdoc-overview');
const out = path.join(build, 'draft.pptx');
const W = 1280, H = 720;
const C = { navy:'#123B54', deep:'#0D2C40', teal:'#1684A6', cyan:'#D9F0F4', ink:'#183E54', body:'#36586C', muted:'#5B7788', paper:'#F3F7F9', white:'#FFFFFF', coral:'#D75C58', line:'#C8DCE5', green:'#2B7A67' };
const FONT = 'Arial';
const pres = Presentation.create({ slideSize:{width:W,height:H} });

async function bytes(p) { const b = await fs.readFile(p); return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength); }
function shape(slide, pos, fill='none', lineFill='none', lineWidth=0, geometry='rect') {
  return slide.shapes.add({geometry,position:pos,fill,line:{style:'solid',fill:lineFill,width:lineWidth}});
}
function text(slide, value, pos, opts={}) {
  const s=shape(slide,pos);
  s.text=value;
  s.text.style={typeface:FONT,fontSize:opts.size??22,color:opts.color??C.ink,bold:opts.bold??false,alignment:opts.align??'left',verticalAlignment:opts.valign??'middle',wrap:true};
  return s;
}
function image(slide, blob, pos, alt, fit='contain') {
  slide.images.add({blob,contentType:'image/png',alt,fit,position:pos});
}
function base(title, section, page, dark=false) {
  const s=pres.slides.add();
  s.background.fill=dark?C.deep:C.paper;
  if (!dark) {
    text(s,section.toUpperCase(),{left:64,top:28,width:850,height:24},{size:13,bold:true,color:C.teal});
    text(s,title,{left:64,top:62,width:1148,height:62},{size:38,bold:true,color:C.navy});
    shape(s,{left:64,top:686,width:1152,height:1},C.line);
    text(s,'MR.DOC  /  PROJECT OVERVIEW',{left:64,top:690,width:500,height:18},{size:11,bold:true,color:C.muted});
    text(s,String(page).padStart(2,'0'),{left:1160,top:690,width:56,height:18},{size:11,bold:true,color:C.muted,align:'right'});
  }
  return s;
}
function bullets(slide, rows, x, y, w, opts={}) {
  const gap=opts.gap??64;
  rows.forEach((row,i)=>{
    const yy=y+i*gap;
    text(slide,row[0],{left:x,top:yy,width:w,height:30},{size:opts.headSize??21,bold:true,color:opts.headColor??C.ink});
    if (row[1]) text(slide,row[1],{left:x,top:yy+31,width:w,height:opts.bodyHeight??42},{size:opts.bodySize??16,color:opts.bodyColor??C.body,valign:'top'});
  });
}

// 1. Cover
{
  const s=base('', '', 1, true);
  const doc=await bytes(path.join(root,'assets/welcome-doctor.png'));
  text(s,'Mr.Doc',{left:78,top:108,width:565,height:82},{size:68,bold:true,color:C.white});
  text(s,'Personal health copilot',{left:82,top:202,width:565,height:56},{size:35,bold:true,color:'#7ED4E0'});
  text(s,'Project overview, technology stack, and the experience updates you requested',{left:84,top:286,width:515,height:112},{size:23,color:'#D8E7EC',valign:'top'});
  shape(s,{left:84,top:430,width:450,height:2},C.teal);
  text(s,'Product and UX summary  ·  24 October 2026',{left:84,top:455,width:520,height:32},{size:16,color:'#B7D1DC'});
  image(s,doc,{left:738,top:34,width:440,height:650},'Mr.Doc illustrated doctor guide','contain');
}

// 2. Technology and framework overview
{
  const s=base('Languages and framework choices','Technology',2);
  text(s,'No large frontend framework',{left:68,top:148,width:510,height:44},{size:28,bold:true,color:C.navy});
  text(s,'The interface uses native HTML, CSS and JavaScript. The Python backend uses the standard library for its local web server and API requests.',{left:68,top:196,width:495,height:93},{size:19,color:C.body,valign:'top'});
  bullets(s,[
    ['Three.js','Interactive 3D anatomy and character scenes.'],
    ['QRCode.js','Offline QR generation in the browser.'],
    ['Python standard library','HTTP server, JSON, file handling and outbound API requests.'],
    ['Pillow + pypdfium2','Optional image and PDF support for OCR workflows.'],
  ],68,312,494,{gap:76,headSize:20,bodySize:15,bodyHeight:38});
  // Editable architecture flow, kept as a functional diagram rather than decoration.
  text(s,'APP FLOW',{left:655,top:150,width:500,height:25},{size:13,bold:true,color:C.teal});
  const nodes=[
    {x:650,y:205,w:225,h:118,title:'Browser app',sub:'HTML · CSS · JavaScript'},
    {x:950,y:205,w:240,h:118,title:'Python server',sub:'Standard library · port 8000'},
    {x:950,y:430,w:240,h:118,title:'AI services',sub:'Gemini · optional Claude'},
    {x:650,y:430,w:225,h:118,title:'Local browser data',sub:'localStorage · FHIR-style JSON'},
  ];
  for(const n of nodes){
    shape(s,{left:n.x,top:n.y,width:n.w,height:n.h},C.white,C.line,1,'roundRect');
    text(s,n.title,{left:n.x+16,top:n.y+23,width:n.w-32,height:32},{size:20,bold:true,color:C.navy});
    text(s,n.sub,{left:n.x+16,top:n.y+62,width:n.w-32,height:44},{size:15,color:C.body,valign:'top'});
  }
  text(s,'Requests',{left:880,top:245,width:65,height:24},{size:13,bold:true,color:C.teal,align:'center'});
  text(s,'OCR · chat · voice',{left:1008,top:350,width:160,height:25},{size:13,bold:true,color:C.teal,align:'center'});
  text(s,'Saved records',{left:855,top:476,width:90,height:26},{size:13,bold:true,color:C.teal,align:'center'});
  text(s,'FHIR-style means structured data; it is not an ABDM/ABHA integration.',{left:650,top:576,width:540,height:34},{size:14,color:C.muted});
  text(s,'Interface languages: English, Hindi, Telugu and Tamil. Voice uses Gemini TTS with browser speech fallback.',{left:68,top:646,width:1120,height:25},{size:15,bold:true,color:C.ink});
}

// 3. Appointment flow and requested UX
{
  const s=base('Appointment planning','Product experience',3);
  const p='C:/Users/BODASH~1/AppData/Local/Temp/codex-clipboard-ecef5531-4c32-4878-8597-6d5f761106d5.png';
  image(s,await bytes(p),{left:64,top:150,width:635,height:475},'Appointment screen supplied by the user','contain');
  text(s,'Appointment details',{left:752,top:158,width:450,height:35},{size:25,bold:true,color:C.navy});
  bullets(s,[
    ['Date and time','Use clear dropdown controls for date and available time.'],
    ['Doctor or department','Offer common specialties and clinician types as selectable options.'],
    ['Questions for the visit','Generate questions from the appointment and specialty.'],
    ['Compact result','Show highlighted discussion points in a small popup, not a full page or editable question field.'],
  ],752,212,445,{gap:92,headSize:19,bodySize:16,bodyHeight:55});
  text(s,'The screenshot shows the current form with generated questions inline. The popup behavior above is the requested refinement.',{left:752,top:590,width:440,height:58},{size:14,color:C.muted,valign:'top'});
}

// 4. Family profiles
{
  const s=base('Family profiles','Product experience',4);
  const before='C:/Users/BODASH~1/AppData/Local/Temp/codex-clipboard-85e5efe1-cf70-442b-ba88-0b1922fcbb33.png';
  const after='C:/Users/BODASH~1/AppData/Local/Temp/codex-clipboard-a5452010-b684-48bd-8e72-375338e83cdc.png';
  image(s,await bytes(before),{left:58,top:150,width:520,height:320},'Earlier identity selection screen','contain');
  image(s,await bytes(after),{left:58,top:422,width:520,height:245},'Family selection screen showing core roles and custom member','contain');
  text(s,'Two-step setup',{left:636,top:158,width:530,height:38},{size:27,bold:true,color:C.navy});
  bullets(s,[
    ['1  Choose who is using Mr.Doc','Father, Mother, Son or Daughter, with a simple custom option.'],
    ['2  Confirm, then add family','Show family choices only after the user confirms their own profile.'],
    ['Separate records','Each selected relationship gets its own profile and health history.'],
  ],636,222,535,{gap:112,headSize:20,bodySize:17,bodyHeight:54});
  text(s,'The requested experience removes extra relationship choices from the initial identity screen.',{left:636,top:586,width:520,height:54},{size:15,color:C.muted,valign:'top'});
}

// 5. QR and navigation
{
  const s=base('Health QR and navigation','Product experience',5);
  const p='C:/Users/BODASH~1/AppData/Local/Temp/codex-clipboard-c11c42ab-dd8e-45cd-9cd3-675b5fd4b674.png';
  image(s,await bytes(p),{left:84,top:145,width:400,height:500},'My health QR modal with reports link','contain');
  text(s,'A patient-controlled profile identifier',{left:560,top:164,width:600,height:36},{size:26,bold:true,color:C.navy});
  bullets(s,[
    ['QR screen','Include a clear “Check your reports” action beside the profile QR.'],
    ['Top navigation','Remove the duplicate “Your reports” button because reports already have a sidebar entry.'],
    ['My Health menu','Open on click and stay open while the user selects an option.'],
    ['Profile menu','Keep My Profile and My Family; remove the duplicate My Health QR item.'],
  ],560,228,600,{gap:96,headSize:19,bodySize:16,bodyHeight:48});
  text(s,'The local QR identifies a Mr.Doc profile. Hospital report delivery needs authenticated hospital API or FHIR integration.',{left:560,top:615,width:600,height:48},{size:14,color:C.muted,valign:'top'});
}

// 6. Anatomy and reminders
{
  const s=base('Anatomy view and medicine reminders','Product experience',6);
  const anatomy='C:/Users/BODASH~1/AppData/Local/Temp/codex-clipboard-e62d50c3-653c-416d-854a-8355814fddd8.png';
  const medicine='C:/Users/BODASH~1/AppData/Local/Temp/codex-clipboard-2f3e4382-fbef-4639-9c28-dd1d0f14c361.png';
  image(s,await bytes(anatomy),{left:58,top:156,width:565,height:460},'3D anatomy screen with body labels','contain');
  image(s,await bytes(medicine),{left:685,top:173,width:520,height:228},'Medicine reminder card with timing safety note','contain');
  text(s,'Requested refinements',{left:685,top:416,width:500,height:34},{size:25,bold:true,color:C.navy});
  bullets(s,[
    ['Keep rotation in place','Rotate the model around its own center; keep labels anchored to their correct body parts.'],
    ['Reduce reminder size','Make “Add reminder” compact but easy to find.'],
    ['Do not infer dosing times','If the prescription gives no clock time, ask the user to check clinician instructions.'],
  ],685,458,515,{gap:72,headSize:18,bodySize:15,bodyHeight:38});
}

// 7. Personal guidance, safety and tutorial
{
  const s=base('Personal guidance and patient safety','Product experience',7);
  text(s,'Support built around the person’s saved information',{left:72,top:154,width:1020,height:38},{size:27,bold:true,color:C.navy});
  bullets(s,[
    ['Wellness guidance','Diet, sleep, habits and general wellbeing can use saved age and records as context.'],
    ['Doctor discussion support','Summarize relevant history and prepare questions for the clinician.'],
    ['English, Hindi, Telugu and Tamil','Telugu voice input and spoken answers follow the selected language.'],
    ['Record gaps stay visible','Missing medicine names, dosage, timing or clinical details are left unclear, never guessed.'],
    ['Mr.Doc does not diagnose','It helps explain records and organize care conversations.'],
  ],72,224,540,{gap:88,headSize:20,bodySize:16,bodyHeight:48});
  // A distinct visual source from the project assets keeps this slide grounded in the app identity.
  const chibi=await bytes(path.join(root,'assets/auth-character/idle.png')).catch(()=>null);
  if(chibi) image(s,chibi,{left:710,top:190,width:375,height:395},'Mr.Doc guide character','contain');
  else {
    const guide=await bytes(path.join(root,'assets/mrdoc-reference/mrdoc-idle.png')).catch(()=>null);
    if(guide) image(s,guide,{left:710,top:190,width:375,height:395},'Mr.Doc animated guide','contain');
  }
  text(s,'Tutorial update',{left:710,top:580,width:425,height:32},{size:21,bold:true,color:C.teal});
  text(s,'Refresh the walkthrough so it matches the current navigation, appointment popup and family setup.',{left:710,top:615,width:435,height:43},{size:16,color:C.body,valign:'top'});
}

// 8. External integrations and summary
{
  const s=base('Integration boundaries','Connections and next steps',8);
  text(s,'Available within the current prototype',{left:70,top:153,width:520,height:38},{size:26,bold:true,color:C.navy});
  bullets(s,[
    ['Local profile QR','Generated offline and used to identify a local Mr.Doc profile.'],
    ['Browser notifications','Appointment and report reminders depend on browser permission and app state.'],
    ['Health data','Saved in browser localStorage and represented with FHIR-style JSON resources.'],
  ],70,214,510,{gap:110,headSize:19,bodySize:16,bodyHeight:55});
  shape(s,{left:628,top:166,width:2,height:430},C.line);
  text(s,'Requires provider access',{left:688,top:153,width:500,height:38},{size:26,bold:true,color:C.navy});
  bullets(s,[
    ['Hospital reports','Authenticated hospital API or FHIR connection.'],
    ['Smartwatch data','Apple Health, Android Health Connect, Fitbit or another provider API.'],
    ['ABDM / ABHA','FHIR-style data does not itself authenticate an ABHA ID or connect to ABDM.'],
  ],688,214,500,{gap:110,headSize:19,bodySize:16,bodyHeight:55});
  text(s,'Project stack',{left:70,top:572,width:140,height:24},{size:14,bold:true,color:C.teal});
  text(s,'HTML · CSS · JavaScript · Python · Three.js · QRCode.js · Gemini · optional Anthropic Claude',{left:70,top:604,width:1100,height:30},{size:18,bold:true,color:C.ink});
  text(s,'Based on the project README, code and screenshots supplied for this overview.',{left:70,top:644,width:1080,height:24},{size:13,color:C.muted});
}

await fs.mkdir(path.dirname(out),{recursive:true});
for (let i=0;i<pres.slides.items.length;i++) {
  const slide=pres.slides.items[i];
  const png=await pres.export({slide,format:'png',scale:1});
  await fs.writeFile(path.join(build,`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await png.arrayBuffer()));
}
const pptx=await PresentationFile.exportPptx(pres);
await pptx.save(out);
console.log(JSON.stringify({out,slides:pres.slides.items.length}));
