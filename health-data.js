/* Local health-file interchange. No network access or executable file content. */
(function (root) {
  "use strict";
  const text = (v) => typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
  const codeText = (v) => text(v?.text) || text(v?.coding?.[0]?.display) || text(v?.coding?.[0]?.code);
  const profileKeys = ["name", "age", "gender", "blood", "allergies", "conditions", "meds", "notes", "abhaNumber", "abhaAddress"];
  const encode = (v) => btoa(Array.from(new TextEncoder().encode(JSON.stringify(v)), b => String.fromCharCode(b)).join(""));
  const decode = (v) => JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(atob(v), c => c.charCodeAt(0))));
  const cleanProfile = (p) => Object.fromEntries(profileKeys.filter(k => text(p?.[k])).map(k => [k, text(p[k]).slice(0, 5000)]));
  const normalizeName = (v) => text(v).normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ");
  const validDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || "") && !Number.isNaN(new Date(v + "T00:00:00Z").getTime()) && new Date(v + "T00:00:00Z").toISOString().slice(0,10) === v;
  function formatAbha(v) {
    const digits = text(v).replace(/\D/g, "");
    if (digits.length > 14) return digits;
    return [digits.slice(0, 2), digits.slice(2, 6), digits.slice(6, 10), digits.slice(10, 14)].filter(Boolean).join("-");
  }
  function validateAbha(number, address) {
    if (text(number) && !/^\d{2}-\d{4}-\d{4}-\d{4}$/.test(text(number))) throw new Error("The ABHA number must contain 14 digits.");
    if (text(address) && !/^[a-z0-9][a-z0-9._-]{0,99}@(abdm|sbx)$/i.test(text(address))) throw new Error("Check the ABHA address. It should end in @abdm or @sbx.");
    return { abhaNumber: text(number), abhaAddress: text(address) };
  }
  function identityKey(v) { return normalizeName(v).replace(/^(?:(?:mr|mrs|ms|dr)\.?\s+)/, ""); }
  function canUseProfile(profile, patientName) {
    return !!identityKey(profile?.name) && identityKey(profile.name) === identityKey(patientName);
  }
  function exportHealth(profile, records, healthItems = []) {
    const bundle = { resourceType: "Bundle", type: "collection", identifier: { system: "urn:mrdoc:health-backup", value: "1" }, timestamp: new Date().toISOString(), entry: [] };
    const add = (resource) => { resource.id = crypto.randomUUID(); const ref = "urn:uuid:" + resource.id; bundle.entry.push({ fullUrl: ref, resource }); return { reference: ref }; };
    const patients = new Map();
    const patientFor = (name, useProfile = false, unknownKey = "") => {
      const key = identityKey(name) || (useProfile ? "profile" : "unnamed-" + unknownKey);
      if (patients.has(key)) return patients.get(key);
      const p = { resourceType: "Patient" };
      if (text(name)) p.name = [{ text: text(name) }];
      if (useProfile) {
        if (["female", "male", "other", "unknown"].includes(profile.gender)) p.gender = profile.gender;
        const ids = [ ["urn:mrdoc:abha-number", profile.abhaNumber], ["urn:mrdoc:abha-address", profile.abhaAddress] ].filter(([,v]) => text(v));
        if (ids.length) p.identifier = ids.map(([system,value]) => ({ system, value }));
      }
      const ref = add(p); patients.set(key, ref); return ref;
    };
    const profileRef = patientFor(profile.name, true);
    add({ resourceType: "DocumentReference", status: "current", subject: profileRef, type: { text: "Mr.Doc profile backup" }, content: [{ attachment: { contentType: "application/vnd.mrdoc.profile+json", data: encode({ profile: cleanProfile(profile), healthItems }) } }] });
    records.forEach((record) => {
      const subject = patientFor(record.patientName, canUseProfile(profile, record.patientName), record.id);
      const attachment = { contentType: "application/vnd.mrdoc.record+json", data: encode(record), title: text(record.title) || "Medical record" };
      add({ resourceType: "DocumentReference", status: "current", subject, type: { text: text(record.recordType) || "Medical record" }, description: text(record.summary), content: [{ attachment }] });
      (record.diagnoses || []).filter(d => text(d)).forEach(d => add({ resourceType: "Condition", subject, code: { text: text(d) } }));
      (record.labTests || []).forEach(t => {
        const r = { resourceType: "Observation", status: t.needsReview ? "preliminary" : "unknown", subject, code: { text: text(t.test) } };
        if (validDate(record.date)) r.effectiveDateTime = record.date;
        const v = text(t.value);
        if (/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(v) && Number.isFinite(Number(v))) {
          r.valueQuantity = { value: Number(v) }; if (t.unit) r.valueQuantity.unit = text(t.unit);
        } else if (v) r.valueString = v;
        if (t.referenceRange) r.referenceRange = [{ text: text(t.referenceRange) }];
        if (!t.needsReview && ["HIGH", "LOW", "NORMAL", "CRITICAL"].includes(t.status)) r.interpretation = [{ text: t.status }];
        if (t.needsReview) r.note = [{ text: "Reading needs confirmation against the source document." }];
        add(r);
      });
      (record.medicines || []).filter(m => text(m.name)).forEach(m => {
        const instruction = [m.strength || m.dosage, m.frequency, m.timing, m.duration, m.instructions].filter(Boolean).join(" · ");
        const r = { resourceType: "MedicationRequest", status: "unknown", intent: "order", reportedBoolean: true, subject, medicationCodeableConcept: { text: text(m.name) } };
        if (instruction) r.dosageInstruction = [{ text: instruction }];
        if (m.needsReview || !m.userVerified) r.note = [{ text: "Imported transcription; confirm against the source prescription." }];
        add(r);
      });
    });
    return bundle;
  }
  function parseHealthFile(value) {
    if (!value || value.resourceType !== "Bundle" || !Array.isArray(value.entry) || !value.entry.length || value.entry.length > 2000) throw new Error("Choose a health file containing a FHIR Bundle with 1–2,000 entries.");
    if (!["collection", "document", "searchset"].includes(value.type)) throw new Error("Import supports collection, document, and search-result bundles. Transaction files cannot be imported.");
    const entries = value.entry;
    if (entries.some(e => !e?.resource || typeof e.resource.resourceType !== "string" || e.request || e.response)) throw new Error("The health file contains invalid entries or executable transaction requests.");
    const keys = new Set();
    entries.forEach(e => { const k = e.fullUrl || (e.resource.id ? e.resource.resourceType + "/" + e.resource.id : ""); if (k && keys.has(k)) throw new Error("The health file contains duplicate resource identifiers."); if(k) keys.add(k); });
    const own = value.identifier?.system === "urn:mrdoc:health-backup";
    if (own) {
      let profile = {}, healthItems = []; const records = [];
      entries.forEach(e => {
        if (e.resource.resourceType !== "DocumentReference") return;
        for (const { attachment: a } of e.resource.content || []) {
          if (a?.contentType === "application/vnd.mrdoc.record+json") { const r = decode(a.data); if (!r || typeof r.id !== "string" || !text(r.recordType) || !text(r.summary)) throw new Error("A backed-up record is incomplete."); records.push(r); }
          if (a?.contentType === "application/vnd.mrdoc.profile+json") { const p = decode(a.data); profile = cleanProfile(p.profile); healthItems = Array.isArray(p.healthItems) ? p.healthItems : []; }
        }
      });
      if (records.length > 300 || new Set(records.map(r => r.id)).size !== records.length) throw new Error("The backup has too many records or duplicate record IDs.");
      validateAbha(profile.abhaNumber, profile.abhaAddress);
      if (profile.age && (!/^\d{1,3}$/.test(profile.age) || Number(profile.age) > 130)) throw new Error("The backup contains an invalid profile age. Nothing was imported.");
      if (profile.gender && !["female","male","other","unknown"].includes(profile.gender)) throw new Error("The backup contains an unsupported profile sex value. Nothing was imported.");
      return { profile, records, healthItems, unsupported: 0, patientNames: [...new Set(records.map(r => text(r.patientName)).filter(Boolean))], own: true };
    }
    const patients = entries.filter(e => e.resource.resourceType === "Patient");
    if (patients.length !== 1) throw new Error("Import one patient's health file at a time. Include exactly one Patient resource.");
    const patientEntry = patients[0], patient = patientEntry.resource;
    const patientName = text(patient.name?.[0]?.text) || [...(patient.name?.[0]?.given || []), patient.name?.[0]?.family].filter(Boolean).join(" ");
    const patientRefs = new Set([patientEntry.fullUrl, patient.id ? "Patient/" + patient.id : ""].filter(Boolean));
    const records = [], groups = new Map(); let unsupported = 0;
    const fileId = fingerprint(JSON.stringify(value));
    const medications = new Map();
    entries.filter(e => e.resource.resourceType === "Medication").forEach(e => {
      if(e.fullUrl) medications.set(e.fullUrl, codeText(e.resource.code));
      if(e.resource.id) medications.set("Medication/" + e.resource.id, codeText(e.resource.code));
    });
    // Group only entries for the included patient. Never resolve network references.
    const supported = new Set(["Observation", "Condition", "MedicationRequest", "DiagnosticReport"]);
    entries.forEach((entry, index) => {
      const r = entry.resource;
      if (!supported.has(r.resourceType)) { if(!["Patient", "Medication"].includes(r.resourceType)) unsupported++; return; }
      if (["entered-in-error", "cancelled", "canceled"].includes(r.status) || ["refuted", "entered-in-error"].includes(r.verificationStatus?.coding?.[0]?.code)) { unsupported++; return; }
      if (!patientRefs.has(r.subject?.reference)) throw new Error("A clinical entry does not clearly reference the included patient. Import stopped to avoid mixing records.");
      const date = text(r.effectiveDateTime || r.authoredOn || r.recordedDate || r.issued).slice(0,10);
      const key = validDate(date) ? date : "undated";
      if (!groups.has(key)) groups.set(key, { id: "REC-FHIR-" + fileId + "-" + key, recordType: "Medical record", title: "Imported health record", patientName, date: key === "undated" ? "" : key, summary: "Information imported from a health file. Check the source details before relying on it.", diagnoses: [], medicines: [], labTests: [], reviewItems: [], importedFromFile: true, ocrVersion: 2 });
      const record = groups.get(key);
      if (r.resourceType === "Observation") {
        if (!codeText(r.code)) { unsupported++; return; }
        const quantity = r.valueQuantity;
        const val = quantity?.value != null ? (quantity.comparator || "") + String(quantity.value) : r.valueString ?? codeText(r.valueCodeableConcept);
        if (val === "" || val == null || typeof val === "object") { unsupported++; return; }
        const rawFlag = r.interpretation?.[0];
        const flag = { H: "HIGH", L: "LOW", N: "NORMAL", AA: "CRITICAL", HH: "CRITICAL", LL: "CRITICAL" }[rawFlag?.coding?.[0]?.code] || text(rawFlag?.text).toUpperCase();
        const pending = !["final", "amended", "corrected"].includes(r.status);
        const ti = record.labTests.length;
        record.labTests.push({ test: codeText(r.code), value: String(val), unit: text(quantity?.unit || quantity?.code), status: ["HIGH","LOW","NORMAL","CRITICAL"].includes(flag) ? flag : "UNKNOWN", referenceRange: text(r.referenceRange?.[0]?.text) || [r.referenceRange?.[0]?.low?.value, r.referenceRange?.[0]?.high?.value].filter(v=>v!=null).join(" – "), needsReview: pending, sourceText: [codeText(r.code),val,quantity?.unit].filter(v=>v!=null).join(" ") });
        if(pending) record.reviewItems.push({ field: "lab:" + ti + ":value", value: String(val), reason: "This source result is not final. Confirm it against the original.", sourceText: record.labTests[ti].sourceText });
      }
      if (r.resourceType === "Condition" && codeText(r.code)) record.diagnoses.push(codeText(r.code));
      if (r.resourceType === "MedicationRequest") {
        const name = codeText(r.medicationCodeableConcept) || medications.get(r.medicationReference?.reference);
        if (!name) { unsupported++; return; }
        record.medicines.push({ name, instructions: (r.dosageInstruction || []).map(d => text(d.text)).filter(Boolean).join("; "), needsReview: true, userVerified: false, reviewReason: "Medicine imported from a file. Confirm the name and instructions against the prescription.", sourceText: name });
      }
      if (r.resourceType === "DiagnosticReport") { record.title = codeText(r.code) || "Imported diagnostic report"; if(r.conclusion) record.summary = text(r.conclusion); }
    });
    for (const r of groups.values()) if (r.labTests.length || r.medicines.length || r.diagnoses.length) { r.reviewRequired = !!(r.reviewItems.length || r.medicines.length); r.recordType = r.labTests.length ? "Lab Report" : r.medicines.length ? "Prescription" : "Medical record"; records.push(r); }
    if (!records.length) throw new Error("No supported lab results, conditions, or medicine names were found. Nothing was imported.");
    return { profile: { name: patientName }, records, healthItems: [], unsupported, patientNames: patientName ? [patientName] : [], own: false };
  }
  function fingerprint(s) { let h = 2166136261; for (let i=0;i<s.length;i++) h = Math.imul(h ^ s.charCodeAt(i),16777619); return (h>>>0).toString(16); }
  const api = { exportHealth, parseHealthFile, formatAbha, validateAbha, canUseProfile, cleanProfile };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MrDocHealth = api;
})(typeof window !== "undefined" ? window : globalThis);
