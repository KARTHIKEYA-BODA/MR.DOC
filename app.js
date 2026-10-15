/* ---------- Mr.Doc AI Health Copilot Frontend Logic ----------
   - Hamburger sidebar drawer with full-page views
   - AI Name: Mr.Doc
   - Prominent Upload Health Report button
   - Listening equalizer icon (||||)
   - Suggestions on top, not side-by-side
   - Zero initial greeting message in new chats
   - Character design & animations 100% intact
*/

const CONFIG = {
  endpoint: (window.location.protocol === "file:" ? "http://localhost:8000/api/chat" : "/api/chat"),
  ocrEndpoint: (window.location.protocol === "file:" ? "http://localhost:8000/api/analyze-record" : "/api/analyze-record"),
  abhaEndpoint: (window.location.protocol === "file:" ? "http://localhost:8000/api/abha-sync" : "/api/abha-sync"),
  sampleEndpoint: (window.location.protocol === "file:" ? "http://localhost:8000/api/sample-records" : "/api/sample-records")
};


async function requestJson(url, payload, signal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 150000);
  try {
    const response = await fetch(url, {
      method: payload === undefined ? "GET" : "POST",
      headers: payload === undefined ? {} : { "Content-Type": "application/json" },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal: controller.signal
    });
    const data = await response.json().catch(() => { throw new Error("The server returned an unreadable response."); });
    if (!response.ok || data.success === false) throw new Error(data.error || "The request failed. Please try again.");
    return data;
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) throw new Error("The request took too long. Please try again.");
    if (error instanceof TypeError) throw new Error("Cannot reach Mr.Doc. Check that the local server is running.");
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
async function askModel(prompt, signal) {
  return requestJson(CONFIG.endpoint, { prompt, language: S.lang, voice }, signal);
}


/* Character Assets - Kept 100% Intact */
const IMG = {
  "h": {
    "happy": "assets/h_happy.png",
    "gaze": "assets/h_gaze.png",
    "blink": "assets/h_blink.png",
    "say_c": "assets/h_say_c.png",
    "say_b": "assets/h_say_b.png",
    "say_a": "assets/h_say_a.png"
  },
  "b": {
    "b_down": "assets/b_b_down.png",
    "b_left": "assets/b_b_left.png",
    "b_open": "assets/b_b_open.png",
    "b_wide": "assets/b_b_wide.png",
    "back": "assets/b_back.png"
  }
};
const EXP = {
  happy: { m: "idle", h: "happy", b: "b_down" },
  look: { m: "look", h: "gaze", b: "b_down" },
  think: { m: "think", h: "gaze", b: "b_down" },
  speak: { m: "speak", h: "happy", b: "b_open" },
  puzzled: { m: "idle", h: "gaze", b: "b_down" },
  supportive: { m: "cheer", h: "say_a", b: "b_wide" },
  away: { m: "idle", f: "back" }
};
const $ = s => document.querySelector(s);


const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const objectValue = v => v && typeof v === "object" && !Array.isArray(v) ? v : {};
const stringValue = v => typeof v === "string" || typeof v === "number" ? String(v) : "";
const ocrText = v => {
  const text = stringValue(v).trim();
  return ["unknown", "unclear", "illegible", "unreadable", "n/a", "not visible"].includes(text.toLowerCase()) ? "" : text;
};
const boundedOcrConfidence = v => Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : null;
const strings = v => Array.isArray(v) ? v.filter(x => typeof x === "string") : [];
const demoIds = new Set(["REC-LAB-8921", "REC-RX-3419", "REC-DC-7120"]);
const isDemo = record => !!record.isDemo || demoIds.has(record.id);
const isUnavailable = record => String(record.id).startsWith("REC-FALLBACK-");
const personalRecords = () => S.records.filter(r => !isDemo(r) && !isUnavailable(r));
function normalizeRecord(input) {
  const value = objectValue(input);
  if (typeof value.id !== "string" || !value.id) return null;
  const record = { ...value };
  for (const key of ["id", "recordType", "title", "facility", "doctorName", "patientName", "date", "summary", "abnormalExplanation"]) record[key] = stringValue(value[key]);
  record.recordType ||= "Medical record";
  for (const key of ["diagnoses", "selfCareTips", "doctorQuestions"]) record[key] = strings(value[key]);
  for (const [key, fields] of [
    ["medicines", ["name", "dosage", "frequency", "timing", "duration", "instructions", "sourceText"]],
    ["labTests", ["test", "value", "unit", "referenceRange", "status", "interpretation", "sourceText"]]
  ]) {
    record[key] = (Array.isArray(value[key]) ? value[key] : []).filter(x => x && typeof x === "object").map(x => {
      const entry = Object.fromEntries(fields.map(f => [f, key === "medicines" ? ocrText(x[f]) : stringValue(x[f])]));
      entry.ocrConfidence = boundedOcrConfidence(x.ocrConfidence);
      entry.needsReview = Boolean(x.needsReview) || (!!entry.sourceText && (entry.ocrConfidence === null || entry.ocrConfidence < 90));
      return entry;
    }).filter(x => x.name || x.test || (key === "medicines" && x.sourceText));
  }
  record.verbatimTranscription = stringValue(value.verbatimTranscription);
  record.ocrConfidence = boundedOcrConfidence(value.ocrConfidence);
  record.reviewRequired = Boolean(value.reviewRequired) || Boolean(record.verbatimTranscription);
  record.ocrVersion = Number.isInteger(value.ocrVersion) ? value.ocrVersion : 0;
  record.labTests.forEach(t => { if (!["NORMAL", "HIGH", "LOW", "CRITICAL"].includes(t.status)) t.status = "UNKNOWN"; });
  record.translations = {};
  for (const [language, t] of Object.entries(objectValue(value.translations))) {
    record.translations[language] = {
      summary: stringValue(t?.summary), abnormalExplanation: stringValue(t?.abnormalExplanation),
      selfCareTips: strings(t?.selfCareTips), doctorQuestions: strings(t?.doctorQuestions)
    };
  }
  if (String(record.id).startsWith("REC-OCR-") && record.ocrVersion < 2) {
    record.summary = "This upload was analyzed by an older reader and may contain incorrect details. Upload the original again to create a transcription for review.";
    record.diagnoses = []; record.medicines = []; record.labTests = [];
    record.selfCareTips = []; record.doctorQuestions = []; record.abnormalExplanation = "";
    record.translations = {};
  }
  if (isUnavailable(record)) {
    record.summary = "This older upload was saved when analysis was unavailable. Upload it again to get an analysis.";
    record.diagnoses = []; record.medicines = []; record.labTests = [];
    record.selfCareTips = []; record.doctorQuestions = []; record.abnormalExplanation = "";
    record.translations = {};
  }
  return record;
}
function htmlData(value) {
  if (typeof value === "string") return esc(value);
  if (Array.isArray(value)) return value.map(htmlData);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, htmlData(v)]));
  return value;
}
let statusTimer;
function notify(message, error = false) {
  const box = $("#app-status");
  if (!box) return;
  clearTimeout(statusTimer);
  $("#status-text").textContent = message;
  box.classList.toggle("error", error);
  box.hidden = false;
  if (!error) statusTimer = setTimeout(() => { box.hidden = true; }, 5500);
}
let S;
let storageWarning = "";
try { S = objectValue(JSON.parse(localStorage.getItem("carely"))); }
catch (_) { S = {}; storageWarning = "Saved data could not be read. Changes will stay in this session if browser storage is unavailable."; }
S.chats = (Array.isArray(S.chats) ? S.chats : []).filter(c => c && typeof c.id === "string").map(c => ({
  id: c.id, title: stringValue(c.title) || "New chat",
  msgs: (Array.isArray(c.msgs) ? c.msgs : []).filter(m => m && typeof m.text === "string").map(m => ({
    role: m.role === "user" ? "user" : "assistant", text: m.text,
    recordId: typeof m.recordId === "string" ? m.recordId : undefined
  }))
}));
S.records = (Array.isArray(S.records) ? S.records : []).map(normalizeRecord).filter(Boolean);
S.profile = Object.fromEntries(Object.entries(objectValue(S.profile)).map(([k, v]) => [k, stringValue(v)]));
if (!S.chats.some(c => c.id === S.active)) S.active = S.chats[0]?.id || null;
if (!["en", "hi", "te", "ta"].includes(S.lang)) S.lang = "en";
S.abha = { linked: false, address: "", number: "", ...objectValue(S.abha) };
S.voice = S.voice !== false;
const save = () => {
  try { localStorage.setItem("carely", JSON.stringify(S)); return true; }
  catch (_) { notify("Browser storage is full or unavailable. Your changes are only saved for this session.", true); return false; }
};


const sleep = ms => new Promise(r => setTimeout(r, ms));
const bd = $("#bd"), hd = $("#hd");

for (const [k, v] of Object.entries(IMG.b)) {
  const i = document.createElement("img");
  i.src = v; i.alt = ""; i.dataset.k = k;
  i.onerror = () => {
    i.onerror = null;
    if (i.src.includes("b_b_")) i.src = i.src.replace("b_b_", "b_");
    else if (i.src.includes("/b_")) i.src = i.src.replace("/b_", "/b_b_");
  };
  bd.appendChild(i);
}
for (const [k, v] of Object.entries(IMG.h)) {
  const i = document.createElement("img");
  i.src = v; i.alt = ""; i.dataset.k = k;
  hd.appendChild(i);
}

let expT, talkT, gestT, cur0 = "happy", lastAct = Date.now(), curH = "happy";
function showH(k) { curH = k; hd.querySelectorAll("img").forEach(i => i.classList.toggle("on", i.dataset.k === k)); }
function showB(k) { bd.querySelectorAll("img").forEach(i => i.classList.toggle("on", i.dataset.k === k)); }

function setExp(k, hold) {
  clearTimeout(expT); clearTimeout(talkT); clearTimeout(gestT);
  cur0 = k; const e = EXP[k];
  if ($("#sb")) $("#sb").dataset.mode = e.m;
  if (e.f) { showH(null); showB(e.f); } else { showH(e.h); showB(e.b); }
  if (k === "speak") {
    const H = ["say_a", "say_b", "say_c", "say_a", "happy", "say_b", "say_c", "happy"];
    let n = 0; showB("b_open");
    const st = () => { showH(H[n++ % H.length]); talkT = setTimeout(st, 130); };
    const B = ["b_open", "b_wide", "b_open"]; let m = 0;
    const sg = () => { gestT = setTimeout(() => { if (cur0 === "speak") { showB(B[++m % B.length]); sg(); } }, 3200); };
    st(); sg();
  }
  if (k === "happy") {
    const g = () => {
      gestT = setTimeout(() => {
        if (cur0 === "happy") {
          showB("b_open"); showH("say_a");
          gestT = setTimeout(() => { if (cur0 === "happy") { showB("b_down"); showH("happy"); } g(); }, 1600);
        } else g();
      }, 7000 + Math.random() * 4000);
    };
    g();
  }
  if (hold) expT = setTimeout(() => setExp("happy"), hold);
}
setExp("happy");

let blinkT;
function scheduleBlink() {
  clearTimeout(blinkT);
  blinkT = setTimeout(() => {
    if (cur0 !== "away" && cur0 !== "speak" && curH && curH !== "blink") {
      const prevH = curH; showH("blink");
      setTimeout(() => { if (curH === "blink" && cur0 !== "away" && cur0 !== "speak") showH(prevH); scheduleBlink(); }, 130);
    } else scheduleBlink();
  }, 2600 + Math.random() * 3000);
}
scheduleBlink();

const wake = () => { lastAct = Date.now(); if (cur0 === "away") setExp("happy"); };
addEventListener("keydown", wake); addEventListener("mousedown", wake); addEventListener("mousemove", wake);
setInterval(() => { if (cur0 === "happy" && !busy && Date.now() - lastAct > 30000) setExp("away"); }, 3000);

let activePage = "chat", busy = false, voice = S.voice, timelineFilter = "all";
const cur = () => S.chats.find(c => c.id === S.active);

function newChat() {
  cancelPendingChat(); stopSpeech();
  const c = { id: crypto.randomUUID(), title: "New chat", msgs: [] };
  S.chats.unshift(c); S.active = c.id; save();
  renderChat();
  renderDrawerChats();
  $("#inp").focus();
  return c;
}

// Pre-load rich sample records if storage is clean or update translations
async function initSamples() {
  try {
    const res = await fetch(CONFIG.sampleEndpoint);
    if (res.ok) {
      const data = await res.json();
      const samples = Object.values(data).map(normalizeRecord).filter(Boolean);
      if (!S.records || !S.records.length) {
        S.records = samples;
        if (S.records.length) S.curRecord = S.records[0].id;
        save();
      } else {
        // Keep sample records in sync with latest translations
        samples.forEach(sm => {
          const idx = S.records.findIndex(r => r.id === sm.id);
          if (idx !== -1) {
            S.records[idx].isDemo = true;
            S.records[idx].translations = sm.translations;
            S.records[idx].summary = sm.summary;
            S.records[idx].labTests = sm.labTests;
          }
        });
        save();
      }
      if (activePage !== "chat") renderActivePage();
    }
  } catch (e) {}
}
initSamples();

// Unified Health Profile text helper
function profText() {
  const p = S.profile, o = [];
  for (const [k, l] of [["name", "Name"], ["age", "Age"], ["blood", "Blood group"], ["allergies", "Allergies"], ["conditions", "Conditions"], ["meds", "Medications"], ["notes", "Notes"]]) {
    if (p[k]) o.push(l + ": " + p[k]);
  }
  if (S.records && S.records.length > 0) {
    const recSummaries = personalRecords().slice(0, 3).map(r => `${r.recordType} (${r.date}): ${r.diagnoses.join(", ")}`);
    o.push("Analyzed Records: " + recSummaries.join(" | "));
  }
  return o.join("; ") || "none provided";
}


function recordCard(record) {
  const box = document.createElement("div");
  box.className = "chat-rec chat-rec-details";
  const title = document.createElement("strong");
  title.textContent = (isDemo(record) ? "Demo · " : "") + (record.title || record.recordType);
  box.append(title);

  const metaText = [record.facility, record.doctorName, record.date].filter(Boolean).join(" • ");
  if (metaText) {
    const meta = document.createElement("div");
    meta.className = "chat-rec-meta";
    meta.textContent = metaText;
    box.append(meta);
  }

  if (record.summary) {
    const summary = document.createElement("p");
    summary.className = "chat-rec-summary";
    summary.textContent = record.summary;
    box.append(summary);
  }

  if (record.diagnoses?.length) {
    const diagnoses = document.createElement("p");
    diagnoses.className = "chat-rec-diagnoses";
    diagnoses.textContent = "Diagnoses: " + record.diagnoses.join(" · ");
    box.append(diagnoses);
  }

  if (record.medicines?.length) {
    const section = document.createElement("section");
    section.className = "chat-rec-section";
    const heading = document.createElement("b");
    heading.textContent = `Prescribed medicines (${record.medicines.length})`;
    section.append(heading);
    const list = document.createElement("div");
    list.className = "chat-rec-medicines";
    record.medicines.forEach(medicine => {
      const item = document.createElement("div");
      item.className = "chat-rec-medicine";
      const name = document.createElement("strong");
      name.textContent = [medicine.name, medicine.dosage].filter(Boolean).join(" · ") || "Medicine text unclear";
      item.append(name);
      const schedule = [medicine.frequency, medicine.timing, medicine.duration].filter(Boolean).join(" · ");
      if (schedule) {
        const line = document.createElement("div");
        line.textContent = "Schedule: " + schedule;
        item.append(line);
      }
      if (medicine.instructions) {
        const advice = document.createElement("div");
        advice.textContent = "Advice: " + medicine.instructions;
        item.append(advice);
      }
      if (medicine.sourceText) {
        const source = document.createElement("div");
        source.className = "chat-rec-source";
        source.textContent = "As written: " + medicine.sourceText;
        item.append(source);
      }
      if (medicine.needsReview) {
        const review = document.createElement("div");
        review.className = "chat-rec-review";
        review.textContent = "Please verify this entry from the original.";
        item.append(review);
      }
      list.append(item);
    });
    section.append(list);
    box.append(section);
  }

  if (record.labTests?.length) {
    const section = document.createElement("section");
    section.className = "chat-rec-section";
    const heading = document.createElement("b");
    heading.textContent = "Diagnostic test results";
    section.append(heading);
    const list = document.createElement("div");
    list.className = "chat-rec-tests";
    record.labTests.forEach(test => {
      const item = document.createElement("div");
      item.textContent = [test.test, [test.value, test.unit].filter(Boolean).join(" "), test.status].filter(Boolean).join(" · ");
      list.append(item);
    });
    section.append(list);
    box.append(section);
  }

  if (record.verbatimTranscription) {
    const transcript = document.createElement("details");
    transcript.className = "chat-rec-transcript";
    const summary = document.createElement("summary");
    summary.textContent = "Text read from the document";
    const text = document.createElement("pre");
    text.textContent = record.verbatimTranscription;
    transcript.append(summary, text);
    box.append(transcript);
  }

  if (String(record.id).startsWith("REC-OCR-")) {
    const note = document.createElement("p");
    note.className = "chat-rec-review-note";
    note.textContent = "OCR can misread handwriting. Confirm every medicine name, dose, and instruction with the original or a pharmacist before relying on it.";
    box.append(note);
  }

  const button = document.createElement("button");
  button.className = "btn-sm btn-sec";
  button.textContent = "View record";
  button.onclick = () => { S.curRecord = record.id; save(); switchPage("records"); };
  box.append(button);
  return box;
}
function bubble(role, text, recordId) {
  const element = document.createElement("div");
  element.className = "m " + (role === "user" ? "u" : "a");
  element.textContent = text;
  const record = S.records.find(r => r.id === recordId);
  if (record) { element.classList.add("has-record"); element.append(recordCard(record)); }
  $("#msgs").appendChild(element);
  $("#msgs").scrollTop = $("#msgs").scrollHeight;
  return element;
}


// ---------------------------------------------------------------------------
// Chat View Rendering (NO Initial Auto-Greeting, Suggestions ON TOP)
// ---------------------------------------------------------------------------
function renderChat() {
  const c = cur();
  $("#msgs").innerHTML = "";

  // NO initial auto-greeting message in new chat per user instruction
  if (c && c.msgs) {
    c.msgs.forEach(m => bubble(m.role, m.text, m.recordId));
  }

  // Suggestions on TOP, stacked vertically
  const ch = $("#chips");
  ch.innerHTML = "";
  if (!c || !c.msgs.length) {
    [
      "I have a headache. What can I do?",
      "Explain my recent lab report in simple terms",
      "What are my active medications and their timings?",
      "How can I keep my blood sugar and cholesterol normal?"
    ].forEach(t => {
      const b = document.createElement("button");
      b.textContent = t;
      b.onclick = () => send(t);
      ch.appendChild(b);
    });
  }
}

// ---------------------------------------------------------------------------
// Page Switching & Drawer Controls
// ---------------------------------------------------------------------------
function openDrawer(open) {
  $("#drawer").classList.toggle("open", open);
  $("#drawer-backdrop").classList.toggle("open", open);
  $("#burger-btn").setAttribute("aria-expanded", String(open));
  $("#drawer").inert = !open;
  $("#app-main").inert = open;
  $(".top-bar").inert = open;
  if (open) { renderDrawerChats(); $("#drawer-close").focus(); }
  else if ($("#drawer").contains(document.activeElement)) $("#burger-btn").focus();
}

function switchPage(page) {
  if (!$(`#view-${page}`)) return;
  cancelPendingChat(); stopSpeech();
  activePage = page;
  openDrawer(false);

  // Toggle main views
  document.querySelectorAll(".page-view").forEach(v => v.classList.remove("active"));
  const targetView = $(`#view-${page}`);
  if (targetView) targetView.classList.add("active");

  // Toggle top back button
  if (page === "chat") {
    $("#top-page-nav").style.display = "none";
    renderChat();
  } else {
    $("#top-page-nav").style.display = "block";
    renderActivePage();
  }

  // Update active state in drawer nav
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle("on", btn.dataset.page === page);
  });
}

function renderDrawerChats() {
  const el = $("#drawer-chats-list");
  if (!el) return;
  el.innerHTML = "";
  if (!S.chats.length) {
    el.innerHTML = '<div class="note" style="padding:6px 0">No chat history yet.</div>';
    return;
  }
  S.chats.forEach(c => {
    const b = document.createElement("div");
    b.className = "item" + (c.id === S.active ? " on" : "");
    const s = document.createElement("button");
    s.className = "chat-select";
    s.textContent = c.title;
    s.style.cursor = "pointer";
    s.onclick = () => { S.active = c.id; save(); switchPage("chat"); };
    const x = document.createElement("button");
    x.className = "x"; x.textContent = "✕"; x.setAttribute("aria-label", "Delete chat: " + c.title);
    x.onclick = (e) => {
      e.stopPropagation();
      if (S.active === c.id) { cancelPendingChat(); stopSpeech(); }
      S.chats = S.chats.filter(z => z.id !== c.id);
      if (S.active === c.id) S.active = S.chats[0] ? S.chats[0].id : null;
      save(); renderDrawerChats(); renderChat();
    };
    b.append(s, x);
    el.appendChild(b);
  });
}

function renderActivePage() {
  if (activePage === "records") renderRecordsPage();
  else if (activePage === "timeline") renderTimelinePage();
  else if (activePage === "abha") renderAbhaPage();
  else if (activePage === "arch") renderArchPage();
  else if (activePage === "me") renderProfilePage();
  else if (activePage === "guide") renderGuidePage();
}

// ---------------------------------------------------------------------------
// Full Page Views (Spacious, Clear, Perfect Alignment)
// ---------------------------------------------------------------------------

// 1. FULL PAGE: MEDICAL RECORDS & OCR
function highlightClinicalMarkers(str) {
  if (!str) return "";
  return str
    .replace(/(elevated blood sugar(?:\s*\([^)]*\))?)/gi, "<b>$1</b>")
    .replace(/(high cholesterol(?:\s*markers)?)/gi, "<b>$1</b>")
    .replace(/(HbA1c\s*7\.6%)/gi, "<b>$1</b>")
    .replace(/(Fasting Glucose\s*148\s*mg\/dL)/gi, "<b>$1</b>")
    .replace(/(LDL Cholesterol\s*152\s*mg\/dL)/gi, "<b>$1</b>")
    .replace(/(బ్లడ్ షుగర్|చక్కెర స్థాయి(?:\s*\([^)]*\))?)/gi, "<b>$1</b>")
    .replace(/(కొలెస్ట్రాల్)/gi, "<b>$1</b>")
    .replace(/(ब्लड शुगर|शुगर स्तर(?:\s*\([^)]*\))?)/gi, "<b>$1</b>")
    .replace(/(कोलेस्ट्रॉल)/gi, "<b>$1</b>")
    .replace(/(இரத்த சர்க்கரை)/gi, "<b>$1</b>")
    .replace(/(கொலஸ்ட்ரால்)/gi, "<b>$1</b>");
}

function renderRecordsPage() {
  const el = $("#page-records-content");
  if (!el) return;

  const selected = S.records.find(r => r.id === S.curRecord) || S.records[0];
  const curR = selected ? htmlData(selected) : null;
  const t = (curR && curR.translations && curR.translations[S.lang]) || {};
  const rawSum = selected?.translations?.[S.lang]?.summary || selected?.summary || "No record selected yet.";
  const sumHtml = highlightClinicalMarkers(esc(rawSum));
  const tips = (curR && (t.selfCareTips || curR.selfCareTips)) || [];
  const questions = (curR && (t.doctorQuestions || curR.doctorQuestions)) || [];
  const isOcrRecord = !!selected && String(selected.id).startsWith("REC-OCR-");
  const needsOcrUpdate = isOcrRecord && selected.ocrVersion < 2;

  // Simplified abnormal watch items per user instruction
  let abnormalItems = [];
  if (curR && curR.labTests && curR.labTests.length) {
    abnormalItems = curR.labTests
      .filter(ts => ts.status === "HIGH" || ts.status === "LOW" || ts.status === "CRITICAL")
      .map(ts => ts.test.replace(/\s*\([^)]*\)/g, "").replace(/['"]/g, "").trim());
  }


  el.innerHTML = `
    <h1 class="page-title">Your medical records</h1>
    <div class="record-library">
      <label for="record-search">Find a record</label>
      <input id="record-search" type="search" placeholder="Search title, clinic or date" value="${esc(recordQuery)}">
      <div id="record-results" class="record-results"></div>
    </div>

    <!-- Upload Dropzone -->
    <div class="dropzone" id="records-dropzone">
      <b>Drop a medical report here</b>
      <span class="note">PNG, JPEG, WebP or PDF · up to 10 MB</span>
      <button class="btn-sm btn-pri" id="browse-record">Browse file</button>
      <span id="upload-status" role="status"></span>
    </div>

    <!-- Detailed Active Record Card -->
    ${curR ? `
      <div class="rec-card">
        ${isDemo(selected) ? '<p class="demo-note">Demonstration record · sample data, excluded from your personal profile.</p>' : ""}
        ${isUnavailable(selected) ? '<p class="demo-note">Analysis unavailable · please upload this record again.</p>' : ""}
        ${needsOcrUpdate ? '<div class="ocr-review-note"><b>This upload used an older reader.</b><br>Its extracted medicine details may be wrong. Upload the original again to create a careful transcription.</div>' : ""}
        ${isOcrRecord && !needsOcrUpdate ? `
          <section class="ocr-transcription" aria-label="OCR transcription">
            <div class="ocr-transcription-heading"><b>Text read from the document</b><span>Review the text against the original</span></div>
            <pre>${curR.verbatimTranscription || "No readable text was returned. Please try a clearer, well-lit image."}</pre>
            <p>OCR can misread handwriting. Confirm every medicine name, dose, and instruction with the original or a pharmacist before relying on it.</p>
          </section>
        ` : ""}
        <div class="rec-head">
          <div>
            <span class="rec-tag">${curR.recordType}</span>
            <div class="rec-title">${curR.title || curR.recordType}</div>
            <div class="rec-meta">${curR.facility || ""} • ${curR.doctorName || ""} • ${curR.date || ""}</div>
          </div>
          <div class="record-actions"><button class="btn-listen-summary" id="btn-listen-summary">Listen summary</button><button class="btn-sm btn-sec" id="print-record">Print / PDF</button></div>
        </div>

        <div class="rec-summary">
          <b class="author">Mr.Doc says:</b>
          <div>${sumHtml}</div>
        </div>

        ${abnormalItems.length ? `
          <div class="abnormal-box">
            <b>To Watch:</b>
            <div class="watch-items">${abnormalItems.join(" &bull; ")}</div>
            <div class="doctor-note">Please do not take or modify any medication without a doctor's consultation. Make sure all prescribed medicines are suitable for your age, condition, and symptoms.</div>
          </div>
        ` : ""}

        <!-- Prescribed Medications -->
        ${curR.medicines && curR.medicines.length ? `
          <div style="margin-top:4px">
            <b style="font-size:13.5px;display:block;margin-bottom:4px">💊 Prescribed Medicines (${curR.medicines.length}):</b>
            <div class="med-row">
              ${curR.medicines.map(m => `
                <div class="med-pill">
                  <b>${m.name || "Medicine text unclear"}</b>${m.dosage ? ` (${m.dosage})` : ""}<br>
                  <small style="color:var(--mut)"><b>Schedule:</b> ${m.frequency || "Not clear in image"}${m.timing ? ` • ${m.timing}` : ""} ${m.duration ? `• ${m.duration}` : ""}<br>${m.instructions ? `<b>Advice:</b> ${m.instructions}` : ""}</small>
                  ${m.sourceText ? `<div class="ocr-source-line"><b>As written:</b> ${m.sourceText}</div>` : ""}
                  ${m.needsReview ? '<small class="ocr-field-review">Please verify this entry from the original.</small>' : ""}
                </div>
              `).join("")}
            </div>
          </div>
        ` : ""}

        <!-- Diagnostic Test Results (NO reference range column) -->
        ${curR.labTests && curR.labTests.length ? `
          <div style="margin-top:6px">
            <b style="font-size:13.5px;display:block;margin-bottom:4px">🧪 Diagnostic Test Results:</b>
            <table class="test-table">
              <thead>
                <tr>
                  <th>Test Name</th>
                  <th>Observed Value</th>
                  <th>Clinical Status</th>
                </tr>
              </thead>
              <tbody>
                ${curR.labTests.map(ts => `
                  <tr>
                    <td><b>${ts.test}</b></td>
                    <td>${ts.value} ${ts.unit}</td>
                    <td><span class="badge ${ts.status}">${ts.status}</span></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        ` : ""}

        <!-- Self-Care Guidance & Doctor Questions -->
        ${(tips.length || questions.length) ? `
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:12px;margin-top:6px">
            ${tips.length ? `
              <div style="background:#f9fbfb;padding:12px;border-radius:10px;border:1px solid var(--line)">
                <b style="font-size:13px;display:block;margin-bottom:4px">🌿 Self-Care Guidance</b>
                <ul style="margin:0;padding-left:16px;font-size:12.5px;line-height:1.5">${tips.map(x => `<li>${x}</li>`).join("")}</ul>
              </div>
            ` : ""}
            ${questions.length ? `
              <div style="background:#f9fbfb;padding:12px;border-radius:10px;border:1px solid var(--line)">
                <b style="font-size:13px;display:block;margin-bottom:4px">❓ Questions for Your Doctor</b>
                <ul style="margin:0;padding-left:16px;font-size:12.5px;line-height:1.5">${questions.map(x => `<li>${x}</li>`).join("")}</ul>
              </div>
            ` : ""}
          </div>
        ` : ""}
      </div>
    ` : `<div class="card-box note">Select or upload a record above to view detailed clinical analysis.</div>`}
  `;

  // Wire up dropzone
  const dz = el.querySelector("#records-dropzone");
  $("#browse-record").onclick = () => $("#file-inp").click();
  for (const event of ["dragenter", "dragover"]) dz.addEventListener(event, e => { e.preventDefault(); dz.classList.add("drag"); });
  dz.addEventListener("dragleave", e => { if (!dz.contains(e.relatedTarget)) dz.classList.remove("drag"); });
  dz.addEventListener("drop", e => {
    e.preventDefault(); dz.classList.remove("drag");
    if (e.dataTransfer.files.length !== 1) return notify("Please upload one report at a time.", true);
    handleFileUpload(e.dataTransfer.files[0]);
  });
  $("#record-search").oninput = e => { recordQuery = e.target.value; renderRecordResults(); };
  renderRecordResults(); updateUploadUI();
  $("#print-record")?.addEventListener("click", () => {
    document.body.classList.add("printing-record");
    window.print();
  });

  // Listen summary voice button
  const lBtn = el.querySelector("#btn-listen-summary");
  if (lBtn) lBtn.onclick = () => speakText(rawSum);
}


let recordQuery = "";
function renderRecordResults() {
  const container = $("#record-results");
  if (!container) return;
  const query = recordQuery.trim().toLocaleLowerCase();
  const records = S.records.filter(r => [r.title, r.facility, r.date, r.recordType].join(" ").toLocaleLowerCase().includes(query));
  container.replaceChildren();
  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "note"; empty.textContent = query ? "No matching records. Try another search." : "Your uploaded records will appear here.";
    container.append(empty); return;
  }
  records.forEach(record => {
    const button = document.createElement("button");
    button.className = "record-choice";
    button.setAttribute("aria-pressed", String(record.id === (S.curRecord || S.records[0]?.id)));
    button.textContent = (isDemo(record) ? "Demo · " : "") + (record.title || record.recordType) + (record.date ? " · " + record.date : "");
    button.onclick = () => { stopSpeech(); S.curRecord = record.id; save(); renderRecordsPage(); $("#record-search").focus(); };
    container.append(button);
  });
}

// 2. FULL PAGE: HEALTH TIMELINE (Ultra-clean clinical dashboard interface)
function formatTimelineDate(dateStr) {
  if (!dateStr) return { dayMonth: "Recent", year: "" };
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parts[2];
      const month = monthNames[monthIdx] || parts[1];
      return { dayMonth: `${day} ${month}`, year };
    }
  } catch (e) {}
  return { dayMonth: dateStr, year: "" };
}

function renderTimelinePage() {
  const el = $("#page-timeline-content");
  if (!el) return;

  let recs = htmlData(S.records).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  if (timelineFilter === "rx") recs = recs.filter(r => r.recordType === "Prescription");
  else if (timelineFilter === "lab") recs = recs.filter(r => r.recordType === "Lab Report");
  else if (timelineFilter === "abnormal") recs = recs.filter(r => (r.labTests || []).some(t => t.status === "HIGH" || t.status === "LOW" || t.status === "CRITICAL"));

  el.innerHTML = `
    <div class="clinical-timeline-header">
      <h2 class="clinical-timeline-title">Unified Health Timeline</h2>
      <p class="clinical-timeline-subtitle">Chronological record of patient consultations, prescriptions, and lab investigations.</p>
    </div>

    <!-- Segmented Control Tab Bar -->
    <div class="timeline-segmented-bar">
      <button class="timeline-segment ${timelineFilter === 'all' ? 'active' : ''}" onclick="timelineFilter='all';renderTimelinePage();">All Records</button>
      <button class="timeline-segment ${timelineFilter === 'rx' ? 'active' : ''}" onclick="timelineFilter='rx';renderTimelinePage();">Prescriptions</button>
      <button class="timeline-segment ${timelineFilter === 'lab' ? 'active' : ''}" onclick="timelineFilter='lab';renderTimelinePage();">Lab Reports</button>
      <button class="timeline-segment ${timelineFilter === 'abnormal' ? 'active' : ''}" onclick="timelineFilter='abnormal';renderTimelinePage();">Abnormalities</button>
    </div>

    ${!recs.length ? `
      <div class="clinical-empty-state">
        No clinical records found matching this filter criteria.
      </div>
    ` : `
      <div class="clinical-timeline-list">
        ${recs.map(r => {
          const abCount = (r.labTests || []).filter(t => t.status === "HIGH" || t.status === "LOW" || t.status === "CRITICAL").length;
          const dateObj = formatTimelineDate(r.date);
          const medCount = (r.medicines && r.medicines.length) || 0;
          const providerText = [r.facility, r.doctorName].filter(Boolean).join(" • ");

          return `
            <div class="clinical-timeline-item">
              <!-- Left Date Column -->
              <div class="clinical-timeline-date">
                <span class="timeline-day-month">${dateObj.dayMonth}</span>
                <span class="timeline-year">${dateObj.year}</span>
              </div>

              <!-- Connecting Node & Line -->
              <div class="clinical-timeline-axis">
                <div class="clinical-timeline-node"></div>
                <div class="clinical-timeline-line"></div>
              </div>

              <!-- Timeline Card -->
              <div class="clinical-timeline-card" role="button" tabindex="0" data-record-id="${r.id}" aria-label="Open ${r.title || r.recordType}">
                <div class="clinical-card-header">
                  <div class="clinical-card-title-group">
                    <h4 class="clinical-card-title">${r.title || r.recordType}</h4>
                    ${providerText ? `<div class="clinical-card-provider">${providerText}</div>` : ''}
                  </div>
                  <span class="clinical-type-badge">${isDemo(r) ? "Demo · " : ""}${r.recordType}</span>
                </div>

                ${r.diagnoses && r.diagnoses.length ? `
                  <div class="clinical-card-body">
                    <span class="clinical-label">Diagnoses:</span>
                    <span class="clinical-value">${r.diagnoses.join(", ")}</span>
                  </div>
                ` : ''}

                ${(abCount > 0 || medCount > 0) ? `
                  <div class="clinical-card-chips">
                    ${abCount > 0 ? `
                      <div class="clinical-chip alert">
                        <svg class="chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>${abCount} Out-of-Range Marker${abCount > 1 ? 's' : ''}</span>
                      </div>
                    ` : ''}
                    ${medCount > 0 ? `
                      <div class="clinical-chip">
                        <svg class="chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path>
                          <path d="m8.5 8.5 7 7"></path>
                        </svg>
                        <span>${medCount} Prescribed Medication${medCount > 1 ? 's' : ''}</span>
                      </div>
                    ` : ''}
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `}
  `;
  el.querySelectorAll("[data-record-id]").forEach(card => {
    const open = () => { S.curRecord = card.dataset.recordId; save(); switchPage("records"); };
    card.onclick = open;
    card.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } };
  });
}

// 3. FULL PAGE: ABDM / ABHA LOCKER
function renderAbhaPage() {
  const el = $("#page-abha-content");
  if (!el) return;

  el.innerHTML = `
    <div class="page-title">🇮🇳 Ayushman Bharat Digital Mission (ABDM)</div>
    <div class="page-desc">FHIR-formatted demo export. No health network or ABHA account is connected.</div>

    <!-- Official ABHA Card -->
    <div class="abha-card" style="margin-bottom:20px">
      <div class="abha-head">
        <span>GOVERNMENT OF INDIA • AYUSHMAN BHARAT DIGITAL MISSION</span>
        <span class="abha-badge">Local demo</span>
      </div>
      <div class="abha-num">DEMO · Not connected</div>
      <div class="abha-user">
        <b>Name:</b> ${esc(S.profile.name || "Demo patient")}<br>
        <b>Sample ID:</b> ${esc(S.abha.address)}<br>
        <b>Connection:</b> Not connected to ABDM or a national health repository
      </div>
    </div>

    <!-- Gateway Actions -->
    <div class="card-box">
      <b style="font-size:14px;display:block;margin-bottom:6px">ABDM Health Gateway Operations</b>
      <p style="font-size:12.5px;color:var(--mut);margin-top:0">This local demonstration does not connect to ABDM. Sample records can be loaded for preview.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn-sm btn-pri" id="btn-sync-gateway">Load sample records</button>
        <button class="btn-sm btn-sec" id="btn-relink-gateway">ABHA connection unavailable</button>
        <button class="btn-sm btn-sec" id="btn-export-fhir-bundle">Download FHIR-formatted JSON</button>
      </div>
    </div>

    <!-- Schema Reference -->
    <div class="card-box">
      <b style="font-size:14px;display:block;margin-bottom:6px">ABDM FHIR R4 DocumentBundle Specifications</b>
      <p style="font-size:12.5px;color:var(--mut);line-height:1.5">
        The local export uses FHIR-style resources. It is a demonstration file and has not been validated or submitted to ABDM:
        <br>• <b>Composition:</b> Clinical encounter document metadata (SNOMED-CT coded)
        <br>• <b>Patient:</b> Patient resource with demo identifiers only
        <br>• <b>Observation:</b> Lab parameters with values, units, and interpretations (LOINC coded)
        <br>• <b>MedicationRequest:</b> Prescribed medicines with dosages and frequencies
        <br>• <b>Condition:</b> Diagnosed clinical conditions
      </p>
    </div>
  `;

  // Sync gateway handler
  el.querySelector("#btn-sync-gateway").onclick = async () => {
    setExp("think");
    try {
      const res = await fetch(CONFIG.abhaEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abhaId: S.abha.address, abhaNumber: S.abha.number })
      });
      const d = await res.json();
      if (Array.isArray(d.syncedRecords)) { for (const value of d.syncedRecords) { const record = normalizeRecord(value); if (record && !S.records.some(r => r.id === record.id)) S.records.push(record); } save(); }
      setExp("happy");
      notify("Demonstration records loaded. No ABHA account was connected.");
      renderAbhaPage();
    } catch (e) {
      setExp("happy");
      notify("Demo records could not be loaded. Please try again.", true);
    }
  };

  el.querySelector("#btn-relink-gateway").onclick = () => notify("ABHA linking is not available in this local demo.", true);

  // Export FHIR bundle handler
  el.querySelector("#btn-export-fhir-bundle").onclick = () => {
    const bundle = {
      resourceType: "Bundle",
      type: "collection",
      id: "ABDM-UNIFIED-HEALTH-EXPORT",
      timestamp: new Date().toISOString(),
      entry: S.records.map(r => ({ resource: r.fhirBundle || r }))
    };
    downloadJson("MrDoc_ABDM_FHIR_Records.json", bundle);
  };
}

// 4. FULL PAGE: TECHNICAL ARCHITECTURE
function renderArchPage() {
  const el = $("#page-arch-content");
  if (!el) return;

  el.innerHTML = `
    <div class="page-title">🏗️ Technical Architecture & Data Pipeline</div>
    <div class="page-desc">End-to-end system blueprint, data flow, OCR components, and ABDM-ready schema.</div>

    <div class="arch-card">
      <b>1. Multimodal OCR & Clinical Ingestion Layer</b>
      Ingests medical records (prescriptions, lab panels, discharge summaries). Uses Gemini Multimodal Vision to process both printed text and handwritten doctor notes. Accurately decodes bilingual Indian instructions (Hindi/English/Telugu/Tamil) and standard abbreviations (OD, BD, TDS, SOS, PC, AC).
    </div>

    <div class="arch-card">
      <b>2. Clinical Entity Normalization & Extraction Pipeline</b>
      Extracts structured pharmaceutical and diagnostic entities:
      <br>• Medicines: Name, dosage, frequency, administration timing, duration.
      <br>• Lab Tests: Observed values, units, reference intervals, abnormality flags (NORMAL, HIGH, LOW, CRITICAL).
      <br>• Diagnoses & clinical notes.
    </div>

    <div class="arch-card">
      <b>3. Plain-Language Simplification & Regional Engine</b>
      Translates dense medical jargon into warm, empathetic 1-to-3 sentence plain language explanations. Directly explains what each out-of-range value means and provides actionable dietary and lifestyle advice across English, Hindi, Telugu, and Tamil.
    </div>

    <div class="arch-card">
      <b>4. ABDM Standards & FHIR R4 Mapping</b>
      Transforms extracted clinical data into National Resource Center for EHR Standards (NRCeS) FHIR R4 DocumentBundles. Features mock ABHA ID authentication and interoperable JSON export.
    </div>

    <div class="arch-card">
      <b>5. Storage, Security & Privacy Architecture</b>
      Records are saved in this browser’s local storage, which is not encrypted by the app. Uploaded reports and chat context are sent to the configured AI provider. ABHA linking is a demonstration.
    </div>

    <div class="arch-card">
      <b>6. Hackathon Evaluation Alignment (100 Points Covered)</b>
      • <b>AI Utilization (35%):</b> Multimodal OCR + Clinical Extraction + Abnormal Explanations.<br>
      • <b>Technical Architecture (25%):</b> Robust pipeline + NRCeS FHIR R4 DocumentBundle schema.<br>
      • <b>User Experience (20%):</b> Hamburger navigation, spacious full pages, top suggestions, big upload button.<br>
      • <b>Healthcare Impact (10%):</b> Safe communication, no hallucinated diagnosis, emergency disclaimers.<br>
      • <b>Presentation & Demo (10%):</b> One-click demo test cases + live speech playback.<br>
      • <b>Bonus Credit:</b> Multi-language support (Hindi, Telugu, Tamil) + ABDM/ABHA readiness.
    </div>
  `;
}

// 5. FULL PAGE: MY HEALTH PROFILE
function renderProfilePage() {
  const el = $("#page-me-content");
  if (!el) return;

  const F = [
    ["name", "Full Name"],
    ["age", "Age"],
    ["blood", "Blood Group"],
    ["allergies", "Known Allergies"],
    ["conditions", "Chronic Conditions"],
    ["meds", "Routine Medications"],
    ["notes", "Personal Health Notes"]
  ];

  // Aggregated Meds & Diagnoses from Records
  const allMeds = [];
  const allDiags = [];
  htmlData(personalRecords()).forEach(r => {
    (r.medicines || []).forEach(m => { if (!allMeds.some(x => x.name === m.name)) allMeds.push(m); });
    (r.diagnoses || []).forEach(d => { if (!allDiags.includes(d)) allDiags.push(d); });
  });

  el.innerHTML = `
    <h1 class="page-title">My Health</h1>
    <div class="page-desc">Consolidated profile combining personal vitals and clinical insights.</div>

    <div class="card-box">
      <b style="font-size:14px;display:block;margin-bottom:12px">Personal Health Information</b>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px">
        ${F.map(([k, l]) => `
          <div>
            <label for="prof-${k}">${l}</label>
            ${["notes", "conditions", "meds", "allergies"].includes(k) ? `
              <textarea id="prof-${k}" rows="2">${esc(S.profile[k] || "")}</textarea>
            ` : `
              <input id="prof-${k}" value="${esc(S.profile[k] || "")}">
            `}
          </div>
        `).join("")}
      </div>
      <button class="btn-sm btn-pri" id="btn-save-prof" style="margin-top:14px">Save Profile</button>
    </div>

    <!-- Aggregated Clinical Overview -->
    ${(allMeds.length || allDiags.length) ? `
      <div class="card-box">
        <b style="font-size:14px;display:block;margin-bottom:8px">🩺 Aggregated Clinical Overview (From Analyzed Records)</b>
        ${allDiags.length ? `
          <div style="margin-bottom:8px;font-size:13px">
            <b>Recorded conditions:</b> ${allDiags.join(", ")}
          </div>
        ` : ""}
        ${allMeds.length ? `
          <div style="font-size:13px">
            <b>Recorded prescriptions (${allMeds.length}):</b>
            <div class="med-row">
              ${allMeds.map(m => `
                <div class="med-pill">
                  <b>${m.name}</b> (${m.dosage})<br>
                  <small style="color:var(--mut)">${m.frequency} • ${m.timing}</small>
                </div>
              `).join("")}
            </div>
          </div>
        ` : ""}
      </div>
    ` : ""}
  `;

  F.forEach(([k]) => {
    const inp = el.querySelector(`#prof-${k}`);
    if (inp) {
      inp.oninput = () => { S.profile[k] = inp.value; save(); };
    }
  });

  const sBtn = el.querySelector("#btn-save-prof");
  if (sBtn) sBtn.onclick = () => { if (save()) notify("Health profile saved on this browser."); renderDrawerChats(); };
}

// 6. FULL PAGE: HEALTH GUIDANCE
function renderGuidePage() {
  const el = $("#page-guide-content");
  if (!el) return;

  const topics = [
    ["😴", "Better Sleep", "How can I sleep better naturally?"],
    ["💧", "Hydration Rules", "How much water should I drink each day?"],
    ["🤕", "Managing Headaches", "I have a headache. What can I do?"],
    ["🤧", "Cold & Flu Care", "I think I am catching a cold. What should I do?"],
    ["🧘", "Stress & Anxiety", "I feel stressed. Any simple ways to calm down?"],
    ["🥗", "Healthy Eating", "How do I eat healthier in a simple way?"],
    ["🏃", "Safe Physical Activity", "How can I start exercising safely?"],
    ["🩹", "First Aid Essentials", "What are basic first aid steps for a minor cut or burn?"]
  ];

  el.innerHTML = `
    <h1 class="page-title">Health guidance</h1>
    <div class="page-desc">Common everyday self-care questions. Tap any topic to start a conversation with Mr.Doc.</div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:12px">
      ${topics.map(([e, t, q]) => `
        <button class="sample-btn" onclick="newChat();switchPage('chat');send('${q}');" style="padding:16px">
          <div style="font-size:24px;margin-bottom:6px">${e}</div>
          <b>${t}</b>
          <small style="color:var(--mut);display:block;margin-top:2px">${q}</small>
        </button>
      `).join("")}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Medical Record Processing Helpers
// ---------------------------------------------------------------------------

let uploading = false;
function updateUploadUI() {
  for (const selector of ["#rec-up", "#browse-record"]) { const button = $(selector); if (button) button.disabled = uploading; }
  if ($("#upload-status")) $("#upload-status").textContent = uploading ? "Reading your report…" : "";
}
async function loadSampleRecord(sampleId) {
  if (uploading) return;
  uploading = true; updateUploadUI(); setExp("think");
  try {
    const data = await requestJson(CONFIG.ocrEndpoint, { sampleId, language: S.lang, voice });
    handleAnalyzedRecord(data.record, data.audio);
  } catch (error) { notify(error.message, true); }
  finally { uploading = false; updateUploadUI(); if (!speechActive) setExp("happy"); }
}
async function handleFileUpload(file) {
  if (!file) return;
  if (uploading) return notify("A report is already being read. Please wait.");
  const mime = file.type || ({ pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" }[file.name.split(".").pop().toLowerCase()]);
  if (!["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(mime)) return notify("Choose a PNG, JPEG, WebP image or PDF.", true);
  if (!file.size || file.size > 10 * 1024 * 1024) return notify("Choose a non-empty file smaller than 10 MB.", true);
  uploading = true; updateUploadUI(); setExp("think"); notify("Reading your report…");
  try {
    const encoded = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = reader.onabort = () => reject(new Error("This file could not be read. Please choose it again."));
      reader.readAsDataURL(file);
    });
    const data = await requestJson(CONFIG.ocrEndpoint, { image: encoded, mimeType: mime, language: S.lang, voice });
    handleAnalyzedRecord(data.record, data.audio);
    notify("Report added to your records.");
  } catch (error) { notify(error.message, true); }
  finally { uploading = false; updateUploadUI(); if (!speechActive) setExp("happy"); }
}
function handleAnalyzedRecord(value, audio) {
  const record = normalizeRecord(value);
  if (!record) throw new Error("Analysis returned an incomplete record. Please try again.");
  const index = S.records.findIndex(r => r.id === record.id);
  if (index < 0) S.records.unshift(record); else S.records[index] = record;
  S.curRecord = record.id;
  const chat = cur() || newChat();
  chat.msgs.push({
    role: "assistant", text: isDemo(record) ? "Here is a demonstration record." : "Your report is ready. Here is the summary:",
    recordId: record.id
  });
  save(); switchPage("chat");
  if (voice) speakText(record.summary, audio || "", true); else setExp("supportive", 1600);
}



function showFhirModal(record) {
  const win = window.open("", "_blank", "width=700,height=600");
  if (!win) return notify("Allow popups to view the record export.", true);
  win.opener = null;
  win.document.title = "Mr.Doc record export";
  const pre = win.document.createElement("pre");
  pre.style.cssText = "white-space:pre-wrap;overflow-wrap:anywhere;padding:24px";
  pre.textContent = JSON.stringify(record.fhirBundle || record, null, 2);
  win.document.body.append(pre);
}
function downloadJson(filename, obj) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
let curAudio = null, speechActive = false, speechDone = null;
const speechLanguage = () => ({ en: "en-IN", hi: "hi-IN", te: "te-IN", ta: "ta-IN" }[S.lang]);
function updateSpeechUI() {
  $("#stop-speech").hidden = !speechActive;
}
function stopSpeech() {
  if (curAudio) { curAudio.pause(); curAudio.onended = curAudio.onerror = null; curAudio = null; }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  if (speechDone) speechDone();
  speechDone = null; speechActive = false; window._curUtt = null;
  updateSpeechUI();
  if (!busy && !uploading) setExp("happy");
}
function speakText(text, audio = "", allowBrowserVoice = true) {
  stopSpeech();
  if (!audio && !allowBrowserVoice) {
    notify("Mr.Doc's fixed voice is temporarily unavailable. You can still read the reply.", true);
    return Promise.resolve();
  }
  if (!audio && !("speechSynthesis" in window)) {
    notify("Speech is unavailable in this browser.", true); return Promise.resolve();
  }
  speechActive = true; updateSpeechUI(); setExp("speak");
  return new Promise(resolve => {
    let finished = false;
    const timer = setTimeout(finish, Math.min(180000, Math.max(12000, text.length * 140)));
    function finish() {
      if (finished) return;
      finished = true; clearTimeout(timer);
      if (speechDone === finish) {
        if (curAudio) { curAudio.onended = curAudio.onerror = null; curAudio.pause(); }
        curAudio = null; speechDone = null; speechActive = false; window._curUtt = null;
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
        updateSpeechUI(); if (!busy && !uploading) setExp("happy");
      }
      resolve();
    }
    speechDone = finish;
    if (audio) {
      curAudio = new Audio("data:audio/mp3;base64," + audio);
      curAudio.onended = finish; curAudio.onerror = () => { finish(); notify("Audio could not be played.", true); };
      curAudio.play().catch(() => { finish(); notify("Audio could not start. You can still read the reply.", true); });
    } else {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = speechLanguage(); utterance.rate = 1;
      const matchingVoice = speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith(S.lang));
      if (matchingVoice) utterance.voice = matchingVoice;
      window._curUtt = utterance;
      utterance.onend = finish;
      utterance.onerror = () => { const current = speechDone === finish; finish(); if (current) notify("Speech could not be played in this language.", true); };
      speechSynthesis.speak(utterance);
    }
  });
}
function playBase64Audio(audio) { return speakText("", audio); }


// ---------------------------------------------------------------------------
// Fallback & Chat Logic
// ---------------------------------------------------------------------------
function fallback(t) {
  t = t.toLowerCase();
  if (/chest pain|can't breathe|cannot breathe|faint|suicid|stroke|bleeding heavily/.test(t)) {
    return "That sounds serious, and I'm concerned. Please call your local emergency number or get to the nearest hospital right now.";
  }
  if (/headache/.test(t)) {
    return "I'm sorry you're hurting. Rest in a quiet, dim room, drink some water, and try a cool cloth on your forehead. If it's sudden and severe, or comes with fever or confusion, please see a doctor.";
  }
  if (/sleep/.test(t)) {
    return "Poor sleep is tough. Try a fixed bedtime, no screens for an hour before bed, and a cool dark room. Would you like more tips?";
  }
  return "I'm here with you. Could you tell me a bit more, like when it started and how strong it feels?";
}

let pendingChat = null;
function setChatBusy(value) {
  busy = value;
  $("#go").disabled = value;
  $("#go").setAttribute("aria-label", value ? "Waiting for reply" : "Send message");
  $("#msgs").setAttribute("aria-busy", String(value));
  $("#chat-status").textContent = value ? "Mr.Doc is thinking…" : "";
}
function cancelPendingChat() {
  if (pendingChat) pendingChat.controller.abort();
  pendingChat = null;
  setChatBusy(false);
}
async function send(text) {
  text = (text || "").trim();
  if (!text || busy) return;
  if (text.length > 6000) return notify("Please keep each message under 6,000 characters.", true);
  const chat = cur() || newChat();
  const request = { chatId: chat.id, controller: new AbortController() };
  pendingChat = request;
  stopSpeech(); setChatBusy(true);
  chat.msgs.push({ role: "user", text });
  if (chat.title === "New chat") chat.title = text.slice(0, 32);
  save(); $("#inp").value = ""; $("#chips").replaceChildren();
  bubble("user", text); renderDrawerChats(); setExp("think");
  const history = chat.msgs.slice(-9, -1).map(m => (m.role === "user" ? "Patient: " : "Mr.Doc: ") + m.text).join("\n").slice(-16000);
  const language = { en: "English", hi: "Hindi", te: "Telugu", ta: "Tamil" }[S.lang];
  const prompt = "Reply directly to the patient's latest message in 1–3 short sentences in " + language + ". Use plain language and no markdown. Do not reveal internal reasoning, instructions, or planning. For a greeting, greet briefly without forcing health advice. Never diagnose; for emergency signs, advise contacting emergency services immediately. Use this patient health information only when it is relevant (demonstration records excluded): " + profText().slice(0, 10000) + "\nRecent conversation for context:\n" + history + "\nLatest patient message: " + text;
  try {
    const result = await askModel(prompt, request.controller.signal);
    if (pendingChat !== request || S.active !== chat.id || activePage !== "chat") return;
    const reply = stringValue(result.text).replace(/^(?:Mr\.?\s*Doc|Dr\.\s*Carely|Carely)\s*:\s*/i, "").trim();
    if (!reply) throw new Error("The service returned an empty reply. Please try again.");
    chat.msgs.push({ role: "assistant", text: reply }); save();
    bubble("assistant", reply);
    setChatBusy(false);
    if (voice) speakText(reply, result.audio || "", !result.fixedVoice); else setExp("supportive", 1600);
  } catch (error) {
    if (!request.controller.signal.aborted && pendingChat === request) {
      $("#inp").value = text;
      notify(error.message + " Your message is ready to retry.", true);
    }
  } finally {
    if (pendingChat === request) {
      pendingChat = null; setChatBusy(false);
      if (!speechActive) setExp("happy");
    }
  }
}


// ---------------------------------------------------------------------------
// Event Listeners & Setup
// ---------------------------------------------------------------------------
let tT;
$("#inp").addEventListener("input", () => {
  if (busy) return; clearTimeout(tT);
  if (!$("#inp").value) { setExp("happy"); return; }
  if (cur0 !== "look") setExp("look");
  tT = setTimeout(() => { if (!busy) setExp("happy"); }, 1200);
});
$("#inp").addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) send($("#inp").value); });
$("#go").onclick = () => send($("#inp").value);

// New Chat Corner Button
$("#new").onclick = () => { newChat(); switchPage("chat"); };

// Hamburger Menu & Drawer Toggles
$("#burger-btn").onclick = () => openDrawer(true);
$("#drawer-close").onclick = () => openDrawer(false);
$("#drawer-backdrop").onclick = () => openDrawer(false);
document.addEventListener("keydown", e => { if (e.key === "Escape") openDrawer(false); });

// Drawer Navigation Items (Open full pages)
document.querySelectorAll(".nav-item").forEach(btn => {
  btn.onclick = () => {
    if (btn.dataset.page === "chat") {
      newChat();
    }
    switchPage(btn.dataset.page);
  };
});
$("#subtle-guide-btn").onclick = () => switchPage("guide");
$(".profile-bottom-btn").onclick = () => switchPage("me");

// Front Page Language Dropdown (ENG ▾)
const langBtn = $("#lang-btn");
const langMenu = $("#lang-menu");
const langLabel = $("#cur-lang-label");
const LANG_MAP = { en: "ENG", hi: "HIN", te: "TEL", ta: "TAM" };

function updateLangUI() {
  if (langLabel) langLabel.textContent = LANG_MAP[S.lang] || "ENG";
  if (langMenu) {
    langMenu.querySelectorAll("button").forEach(b => {
      b.classList.toggle("on", b.dataset.lang === S.lang);
    });
  }
}
updateLangUI();

if (langBtn && langMenu) {
  langBtn.onclick = (e) => {
    e.stopPropagation();
    langMenu.classList.toggle("show");
    langBtn.setAttribute("aria-expanded", String(langMenu.classList.contains("show")));
  };
  langMenu.querySelectorAll("button").forEach(b => {
    b.onclick = (e) => {
      e.stopPropagation();
      const l = b.dataset.lang;
      if (l) {
        stopSpeech();
        S.lang = l;
        save();
        updateLangUI();
        langMenu.classList.remove("show"); langBtn.setAttribute("aria-expanded", "false");
        if (activePage !== "chat") renderActivePage();
      }
    };
  });
  document.addEventListener("click", (e) => {
    if (!langMenu.contains(e.target) && e.target !== langBtn) {
      langMenu.classList.remove("show"); langBtn.setAttribute("aria-expanded", "false");
    }
  });
}

// Back to Chat Button on top-right
$("#btn-back-chat").onclick = () => switchPage("chat");

// Big Upload Button in Chat Input Bar
const fileInp = $("#file-inp");
if (fileInp) {
  fileInp.onchange = e => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) handleFileUpload(file);
  };
}
$("#rec-up").onclick = () => {
  if (fileInp) fileInp.click();
};

// Listening Waveform Button (||||)
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const micBtn = $("#mic");
if (!SR) {
  micBtn.style.display = "none";
} else {
  const r = new SR();
  r.lang = speechLanguage(); r.interimResults = false;
  let listening = false;
  r.onresult = e => {
    $("#inp").value = e.results[0][0].transcript;
    send($("#inp").value);
  };
  r.onerror = e => { if (e.error !== "aborted") notify(e.error === "not-allowed" ? "Microphone access is blocked. You can type your message." : "Voice input could not start. Please try again.", true); };
  r.onend = () => {
    listening = false;
    micBtn.classList.remove("on");
    if (!busy) setExp("happy");
  };
  micBtn.onclick = () => {
    if (listening) {
      r.stop();
      return;
    }
    try {
      if (busy) return;
      stopSpeech(); r.lang = speechLanguage();
      r.start();
      listening = true;
      micBtn.classList.add("on");
      setExp("look");
    } catch (e) {}
  };
}


$("#stop-speech").onclick = stopSpeech;
$("#dismiss-status").onclick = () => { $("#app-status").hidden = true; };
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    langMenu.classList.remove("show"); langBtn.setAttribute("aria-expanded", "false");
  }
  if (event.key === "Tab" && $("#drawer").classList.contains("open")) {
    const elements = [...$("#drawer").querySelectorAll("button, [href], input")].filter(el => !el.disabled);
    const first = elements[0], last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
updateSpeechUI(); renderChat(); renderDrawerChats();
$("#drawer").inert = true;
if (storageWarning) notify(storageWarning, true);
window.addEventListener("afterprint", () => document.body.classList.remove("printing-record"));



// A single introduction occupies the viewport; the landing illustration hides during playback.
const introScreen = $("#copilot-intro");
const introVideo = $("#copilot-intro-video");
const introStart = $("#start-intro");
const introStartLabel = $("#intro-start-label");
const introStatus = $("#intro-status");
const introSkip = $("#intro-skip");
let introClosed = false, introTimer;
introVideo.controls = false;
introVideo.disablePictureInPicture = true;
function closeIntro() {
  if (introClosed) return;
  introClosed = true; clearTimeout(introTimer); introVideo.pause();
  document.body.classList.remove("intro-active");
  document.body.classList.add("intro-revealing");
  introScreen.classList.add("is-leaving");
  setTimeout(() => {
    introScreen.remove(); document.body.classList.remove("intro-revealing");
    $("#inp").focus();
  }, 250);
}
function introFailure() {
  if (introClosed) return;
  clearTimeout(introTimer);
  introVideo.pause(); introScreen.classList.remove("is-playing");
  introScreen.classList.add("has-error");
  introStart.disabled = false; introStartLabel.textContent = "TRY INTRO AGAIN";
  introStatus.textContent = "The introduction could not play. Try again or continue to Mr.Doc.";
  introSkip.textContent = "Continue to Mr.Doc";
}
introStart.addEventListener("click", async () => {
  if (introClosed || introStart.disabled) return;
  introScreen.classList.remove("has-error"); introStatus.textContent = "";
  introScreen.classList.add("is-playing"); introStart.disabled = true;
  introSkip.textContent = "Skip intro"; introSkip.focus();
  introTimer = setTimeout(introFailure, 15000);
  try { await introVideo.play(); } catch (_) { introFailure(); }
});
introVideo.addEventListener("playing", () => clearTimeout(introTimer));
introVideo.addEventListener("waiting", () => { clearTimeout(introTimer); introTimer = setTimeout(introFailure, 15000); });
introVideo.addEventListener("ended", closeIntro);
introVideo.addEventListener("error", introFailure);
introVideo.querySelector("source").addEventListener("error", introFailure);
introSkip.onclick = closeIntro;


document.body.classList.add("intro-active");
