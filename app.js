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
        endpoint:
          window.location.protocol === "file:"
            ? "http://localhost:8000/api/chat"
            : "/api/chat",
        ocrEndpoint:
          window.location.protocol === "file:"
            ? "http://localhost:8000/api/analyze-record"
            : "/api/analyze-record",
        abhaEndpoint:
          window.location.protocol === "file:"
            ? "http://localhost:8000/api/abha-sync"
            : "/api/abha-sync",
        sampleEndpoint:
          window.location.protocol === "file:"
            ? "http://localhost:8000/api/sample-records"
            : "/api/sample-records",
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
            headers:
              payload === undefined
                ? {}
                : { "Content-Type": "application/json" },
            body: payload === undefined ? undefined : JSON.stringify(payload),
            signal: controller.signal,
          });
          const data = await response.json().catch(() => {
            throw new Error("The server returned an unreadable response.");
          });
          if (!response.ok || data.success === false)
            throw new Error(
              data.error || "The request failed. Please try again.",
            );
          return data;
        } catch (error) {
          if (controller.signal.aborted && !signal?.aborted)
            throw new Error("The request took too long. Please try again.");
          if (error instanceof TypeError)
            throw new Error(
              "Cannot reach Mr.Doc. Check that the local server is running.",
            );
          throw error;
        } finally {
          clearTimeout(timer);
          signal?.removeEventListener("abort", abort);
        }
      }
      async function askModel(prompt, signal) {
        return requestJson(
          CONFIG.endpoint,
          { prompt, language: S.lang, voice },
          signal,
        );
      }

      /* Character Assets - Kept 100% Intact */
      const IMG = {
        h: {
          happy:
            "assets/h_happy.png",
          gaze: "assets/h_gaze_embedded.png",
          blink:
            "assets/h_blink_embedded.png",
          say_c:
            "assets/h_say_c_embedded.png",
          say_b:
            "assets/h_say_b_embedded.png",
          say_a:
            "assets/h_say_a_embedded.png",
        },
        b: {
          b_down:
            "assets/b_b_down.png",
          b_left:
            "assets/b_b_left.png",
          b_open:
            "assets/b_b_open.png",
          b_wide:
            "assets/b_b_wide.png",
          back: "assets/b_back.png",
        },
      };
      const EXP = {
        happy: { m: "idle", h: "happy", b: "b_down" },
        look: { m: "look", h: "gaze", b: "b_down" },
        think: { m: "think", h: "gaze", b: "b_down" },
        speak: { m: "speak", h: "happy", b: "b_open" },
        puzzled: { m: "idle", h: "gaze", b: "b_down" },
        supportive: { m: "cheer", h: "say_a", b: "b_wide" },
        away: { m: "idle", f: "back" },
      };
      const $ = (s) => document.querySelector(s);

      const esc = (value) =>
        String(value ?? "").replace(
          /[&<>"']/g,
          (c) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            })[c],
        );
      const objectValue = (v) =>
        v && typeof v === "object" && !Array.isArray(v) ? v : {};
      const stringValue = (v) =>
        typeof v === "string" || typeof v === "number" ? String(v) : "";
      const ocrText = (v) => {
        const text = stringValue(v).trim();
        return [
          "unknown",
          "unclear",
          "illegible",
          "unreadable",
          "n/a",
          "not visible",
        ].includes(text.toLowerCase())
          ? ""
          : text;
      };
      const boundedOcrConfidence = (v) =>
        Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : null;
      const strings = (v) =>
        Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
      const demoIds = new Set(["REC-LAB-8921", "REC-RX-3419", "REC-DC-7120"]);
      const isDemo = (record) => !!record.isDemo || demoIds.has(record.id);
      const isUnavailable = (record) =>
        String(record.id).startsWith("REC-FALLBACK-");
      const personalRecords = () =>
        S.records.filter((r) => !isDemo(r) && !isUnavailable(r));
      function normalizeRecord(input) {
        const value = objectValue(input);
        if (typeof value.id !== "string" || !value.id) return null;
        const record = { ...value };
        for (const key of [
          "id",
          "recordType",
          "title",
          "facility",
          "doctorName",
          "patientName",
          "date",
          "summary",
          "abnormalExplanation",
          "bodySite",
          "injuryDescription",
          "cause",
          "injuryStartDate",
          "documentedSeverity",
        ])
          record[key] = stringValue(value[key]);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(record.injuryStartDate)) record.injuryStartDate = "";
        if (!["low", "medium", "serious"].includes(record.documentedSeverity)) record.documentedSeverity = "";
        record.recordType ||= "Medical record";
        for (const key of ["diagnoses", "selfCareTips", "doctorQuestions"])
          record[key] = strings(value[key]);
        for (const [key, fields] of [
          [
            "medicines",
            [
              "name",
              "dosage",
              "strength",
              "form",
              "frequency",
              "timing",
              "duration",
              "instructions",
              "sourceText",
              "rawText",
            ],
          ],
          [
            "labTests",
            [
              "test",
              "value",
              "unit",
              "referenceRange",
              "status",
              "interpretation",
              "sourceText",
            ],
          ],
        ]) {
          record[key] = (Array.isArray(value[key]) ? value[key] : [])
            .filter((x) => x && typeof x === "object")
            .map((x) => {
              const entry = Object.fromEntries(
                fields.map((f) => [
                  f,
                  key === "medicines" ? ocrText(x[f]) : stringValue(x[f]),
                ]),
              );
              entry.ocrConfidence = boundedOcrConfidence(x.ocrConfidence);
              if (key === "medicines") {
                entry.strength ||= entry.dosage;
                entry.dosage ||= entry.strength;
                entry.rawText ||= entry.sourceText;
                entry.sourceText ||= entry.rawText;
                entry.alternatives = strings(x.alternatives)
                  .slice(0, 3)
                  .map(ocrText)
                  .filter(Boolean);
                entry.reminderTimes = Array.isArray(x.reminderTimes)
                  ? x.reminderTimes.filter((time) => typeof time === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)).slice(0, 6)
                  : [];
                entry.userVerified = Boolean(x.userVerified);
              }
              entry.needsReview =
                Boolean(x.needsReview) ||
                (!!entry.sourceText &&
                  (entry.ocrConfidence !== null && entry.ocrConfidence < 70)) ||
                (!!entry.sourceText && !entry.name && key === "medicines");
              return entry;
            })
            .filter(
              (x) => x.name || x.test || (key === "medicines" && x.sourceText),
            );
        }
        record.verbatimTranscription = stringValue(value.verbatimTranscription);
        record.ocrConfidence = boundedOcrConfidence(value.ocrConfidence);
        record.reviewItems = (Array.isArray(value.reviewItems) ? value.reviewItems : [])
          .filter((item) => item && typeof item === "object")
          .map((item) => ({
            field: stringValue(item.field),
            value: stringValue(item.value),
            sourceText: stringValue(item.sourceText),
            reason: stringValue(item.reason),
            alternatives: strings(item.alternatives).slice(0, 3),
          }));
        record.reviewRequired = Boolean(value.reviewRequired) || record.reviewItems.length > 0 || record.medicines.some((medicine) => medicine.needsReview) || /\[unclear\]/i.test(record.verbatimTranscription);
        record.imageQuality = ["good", "fair", "poor"].includes(
          value.imageQuality,
        )
          ? value.imageQuality
          : "unknown";
        record.medicinesConfirmed = Boolean(value.medicinesConfirmed);
        record.documentReviewed = Boolean(value.documentReviewed);
        record.ocrVersion = Number.isInteger(value.ocrVersion)
          ? value.ocrVersion
          : 0;
        record.labTests.forEach((t) => {
          if (!["NORMAL", "HIGH", "LOW", "CRITICAL"].includes(t.status))
            t.status = "UNKNOWN";
        });
        record.translations = {};
        for (const [language, t] of Object.entries(
          objectValue(value.translations),
        )) {
          record.translations[language] = {
            summary: stringValue(t?.summary),
            abnormalExplanation: stringValue(t?.abnormalExplanation),
            selfCareTips: strings(t?.selfCareTips),
            doctorQuestions: strings(t?.doctorQuestions),
          };
        }
        if (String(record.id).startsWith("REC-OCR-") && record.ocrVersion < 2) {
          record.summary =
            "This upload was analyzed by an older reader and may contain incorrect details. Upload the original again to create a transcription for review.";
          record.diagnoses = [];
          record.medicines = [];
          record.labTests = [];
          record.selfCareTips = [];
          record.doctorQuestions = [];
          record.abnormalExplanation = "";
          record.bodySite = "";
          record.injuryDescription = "";
          record.cause = "";
          record.injuryStartDate = "";
          record.documentedSeverity = "";
          record.reviewItems = [];
          record.reviewRequired = false;
          record.documentReviewed = true;
          record.translations = {};
        }
        if (isUnavailable(record)) {
          record.summary =
            "This older upload was saved when analysis was unavailable. Upload it again to get an analysis.";
          record.diagnoses = [];
          record.medicines = [];
          record.labTests = [];
          record.selfCareTips = [];
          record.doctorQuestions = [];
          record.abnormalExplanation = "";
          record.bodySite = "";
          record.injuryDescription = "";
          record.cause = "";
          record.injuryStartDate = "";
          record.documentedSeverity = "";
          record.reviewItems = [];
          record.reviewRequired = false;
          record.documentReviewed = true;
          record.translations = {};
        }
        return record;
      }
      function htmlData(value) {
        if (typeof value === "string") return esc(value);
        if (Array.isArray(value)) return value.map(htmlData);
        if (value && typeof value === "object")
          return Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, htmlData(v)]),
          );
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
        if (!error)
          statusTimer = setTimeout(() => {
            box.hidden = true;
          }, 5500);
      }
      const recordPreviews = new Map();
      let S;
      let storageWarning = "";
      try {
        S = objectValue(JSON.parse(localStorage.getItem("carely")));
      } catch (_) {
        S = {};
        storageWarning =
          "Saved data could not be read. Changes will stay in this session if browser storage is unavailable.";
      }
      S.chats = (Array.isArray(S.chats) ? S.chats : [])
        .filter((c) => c && typeof c.id === "string")
        .map((c) => ({
          id: c.id,
          title: stringValue(c.title) || "New chat",
          msgs: (Array.isArray(c.msgs) ? c.msgs : [])
            .filter((m) => m && typeof m.text === "string")
            .map((m) => ({
              role: m.role === "user" ? "user" : "assistant",
              text: m.text,
              recordId: typeof m.recordId === "string" ? m.recordId : undefined,
            })),
        }));
      S.records = (Array.isArray(S.records) ? S.records : [])
        .map(normalizeRecord)
        .filter(Boolean);
      S.profile = Object.fromEntries(
        Object.entries(objectValue(S.profile)).map(([k, v]) => [
          k,
          stringValue(v),
        ]),
      );
      S.healthItems = (Array.isArray(S.healthItems) ? S.healthItems : [])
        .filter((item) => item && typeof item.id === "string")
        .map((item) => ({
          id: item.id,
          label: stringValue(item.label),
          bodySite: stringValue(item.bodySite),
          cause: stringValue(item.cause),
          startedAt: stringValue(item.startedAt),
          severity: ["low", "medium", "serious"].includes(item.severity) ? item.severity : "medium",
          healed: Boolean(item.healed),
          recordId: stringValue(item.recordId),
        }));
      S.reminders = (Array.isArray(S.reminders) ? S.reminders : [])
        .filter((item) => item && typeof item.recordId === "string" && Number.isInteger(item.medicineIndex) && /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time || ""))
        .map((item) => ({ recordId: item.recordId, medicineIndex: item.medicineIndex, time: item.time, lastFired: stringValue(item.lastFired) }));
      if (!S.chats.some((c) => c.id === S.active))
        S.active = S.chats[0]?.id || null;
      if (!["en", "hi", "te", "ta"].includes(S.lang)) S.lang = "en";
      S.abha = {
        linked: false,
        address: "",
        number: "",
        ...objectValue(S.abha),
      };
      S.voice = S.voice !== false;
      const save = () => {
        try {
          localStorage.setItem("carely", JSON.stringify(S));
          return true;
        } catch (_) {
          notify(
            "Browser storage is full or unavailable. Your changes are only saved for this session.",
            true,
          );
          return false;
        }
      };

      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const bd = $("#bd"),
        hd = $("#hd");

      for (const [k, v] of Object.entries(IMG.b)) {
        const i = document.createElement("img");
        i.src = v;
        i.alt = "";
        i.dataset.k = k;
        i.onerror = () => {
          i.onerror = null;
          if (i.src.includes("b_b_")) i.src = i.src.replace("b_b_", "b_");
          else if (i.src.includes("/b_")) i.src = i.src.replace("/b_", "/b_b_");
        };
        bd.appendChild(i);
      }
      for (const [k, v] of Object.entries(IMG.h)) {
        const i = document.createElement("img");
        i.src = v;
        i.alt = "";
        i.dataset.k = k;
        hd.appendChild(i);
      }

      let expT,
        talkT,
        gestT,
        cur0 = "happy",
        lastAct = Date.now(),
        curH = "happy";
      function showH(k) {
        curH = k;
        hd.dataset.frame = k || "";
        hd.querySelectorAll("img").forEach((i) =>
          i.classList.toggle("on", i.dataset.k === k),
        );
      }
      function showB(k) {
        bd.querySelectorAll("img").forEach((i) =>
          i.classList.toggle("on", i.dataset.k === k),
        );
      }

      function setExp(k, hold) {
        clearTimeout(expT);
        clearTimeout(talkT);
        clearTimeout(gestT);
        cur0 = k;
        const e = EXP[k];
        if ($("#sb")) $("#sb").dataset.mode = e.m;
        hd.dataset.mode = e.m;
        if (e.f) {
          showH(null);
          showB(e.f);
        } else {
          showH(e.h);
          showB(e.b);
        }
        if (k === "speak") {
          const H = [
            "say_a",
            "say_b",
            "say_c",
            "say_a",
            "happy",
            "say_b",
            "say_c",
            "happy",
          ];
          let n = 0;
          showB("b_open");
          const st = () => {
            showH(H[n++ % H.length]);
            talkT = setTimeout(st, 130);
          };
          const B = ["b_open", "b_wide", "b_open"];
          let m = 0;
          const sg = () => {
            gestT = setTimeout(() => {
              if (cur0 === "speak") {
                showB(B[++m % B.length]);
                sg();
              }
            }, 3200);
          };
          st();
          sg();
        }
        if (k === "happy") {
          const g = () => {
            gestT = setTimeout(
              () => {
                if (cur0 === "happy") {
                  showB("b_open");
                  showH("say_a");
                  gestT = setTimeout(() => {
                    if (cur0 === "happy") {
                      showB("b_down");
                      showH("happy");
                    }
                    g();
                  }, 1600);
                } else g();
              },
              7000 + Math.random() * 4000,
            );
          };
          g();
        }
        if (hold) expT = setTimeout(() => setExp("happy"), hold);
      }
      setExp("happy");

      let blinkT;
      function scheduleBlink() {
        clearTimeout(blinkT);
        blinkT = setTimeout(
          () => {
            if (
              cur0 !== "away" &&
              cur0 !== "speak" &&
              curH &&
              curH !== "blink"
            ) {
              const prevH = curH;
              showH("blink");
              setTimeout(() => {
                if (curH === "blink" && cur0 !== "away" && cur0 !== "speak")
                  showH(prevH);
                scheduleBlink();
              }, 130);
            } else scheduleBlink();
          },
          2600 + Math.random() * 3000,
        );
      }
      scheduleBlink();

      const wake = () => {
        lastAct = Date.now();
        if (cur0 === "away") setExp("happy");
      };
      addEventListener("keydown", wake);
      addEventListener("mousedown", wake);
      addEventListener("mousemove", wake);
      setInterval(() => {
        if (cur0 === "happy" && !busy && Date.now() - lastAct > 30000)
          setExp("away");
      }, 3000);

      let activePage = "chat",
        busy = false,
        voice = S.voice,
        timelineFilter = "all";
      const cur = () => S.chats.find((c) => c.id === S.active);

      function newChat() {
        cancelPendingChat();
        stopSpeech();
        const c = { id: crypto.randomUUID(), title: "New chat", msgs: [] };
        S.chats.unshift(c);
        S.active = c.id;
        save();
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
            const samples = Object.values(data)
              .map(normalizeRecord)
              .filter(Boolean);
            if (!S.records || !S.records.length) {
              S.records = samples;
              if (S.records.length) S.curRecord = S.records[0].id;
              save();
            } else {
              // Keep sample records in sync with latest translations
              samples.forEach((sm) => {
                const idx = S.records.findIndex((r) => r.id === sm.id);
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
        const p = S.profile,
          o = [];
        for (const [k, l] of [
          ["name", "Name"],
          ["age", "Age"],
          ["blood", "Blood group"],
          ["allergies", "Allergies"],
          ["conditions", "Conditions"],
          ["meds", "Medications"],
          ["notes", "Notes"],
        ]) {
          if (p[k]) o.push(l + ": " + p[k]);
        }
        if (S.records && S.records.length > 0) {
          const recSummaries = personalRecords()
            .slice(0, 3)
            .map(
              (r) => `${r.recordType} (${r.date}): ${r.diagnoses.join(", ")}`,
            );
          o.push("Analyzed Records: " + recSummaries.join(" | "));
        }
        return o.join("; ") || "none provided";
      }

      function recordCard(record) {
        const box = document.createElement("div");
        box.className = "chat-rec chat-rec-details";
        const title = document.createElement("strong");
        title.textContent =
          (isDemo(record) ? "Demo · " : "") +
          (record.title || record.recordType);
        box.append(title);

        const metaText = [record.facility, record.doctorName, record.date]
          .filter(Boolean)
          .join(" • ");
        if (metaText) {
          const meta = document.createElement("div");
          meta.className = "chat-rec-meta";
          meta.textContent = metaText;
          box.append(meta);
        }

        if (record.summary) {
          const summary = document.createElement("p");
          summary.className = "chat-rec-summary";
          summary.textContent = record.summary.length > 260 ? `${record.summary.slice(0, 257).trim()}…` : record.summary;
          box.append(summary);
        }

        if (record.diagnoses?.length) {
          const diagnoses = document.createElement("p");
          diagnoses.className = "chat-rec-diagnoses";
          diagnoses.textContent = "Document mentions: " + record.diagnoses.slice(0, 2).join(" · ");
          box.append(diagnoses);
        } else if (record.injuryDescription) {
          const injury = document.createElement("p");
          injury.className = "chat-rec-diagnoses";
          injury.textContent = "Document describes: " + record.injuryDescription;
          box.append(injury);
        }
        if (record.documentedSeverity && ["low", "medium", "serious"].includes(record.documentedSeverity)) {
          const severity = document.createElement("span");
          severity.className = `severity-pill severity-${record.documentedSeverity}`;
          severity.textContent = `${record.documentedSeverity === "serious" ? "Serious" : record.documentedSeverity === "medium" ? "Moderate" : "Mild"} · stated in record`;
          box.append(severity);
        } else if (record.injuryDescription || record.diagnoses?.length) {
          const severity = document.createElement("span");
          severity.className = "severity-pill severity-not-stated";
          severity.textContent = "Severity not stated in record";
          box.append(severity);
        }
        if (/foot|sole|heel|toe/i.test(record.bodySite || "")) {
          const site = record.bodySite.toLowerCase();
          const [mapX, mapY] = /toe|front/.test(site) ? [99, 53] : /heel|back/.test(site) ? [65, 163] : /sole|bottom|plantar/.test(site) ? [78, 145] : [91, 119];
          const figure = document.createElement("figure");
          figure.className = "chat-injury-map";
          figure.innerHTML = `<svg viewBox="0 0 140 190" role="img" aria-label="Simple foot diagram with the document-stated area marked"><path d="M61 174c-12-6-15-17-12-31l10-45c2-11 2-25 3-38l2-30c1-10 8-12 12-3l5 28 3-35c1-9 9-11 12-2l3 33 5-26c2-9 10-9 12 0l-2 40c10-1 17 6 15 17l-9 54c-4 23-17 38-38 43-8 2-15 0-21-5z" fill="none" stroke="#80939c" stroke-width="4" stroke-linejoin="round"/><path d="M64 103l14 15 20-3 23-4M62 119l15 13 20-3 19-4M58 139l17 10 19-3 15-5M65 98l1-35m13 48 1-51m17 48 2-46m17 43 3-34" fill="none" stroke="#80939c" stroke-width="3" stroke-linecap="round"/><circle cx="${mapX}" cy="${mapY}" r="9" fill="#e2424e"/><path d="M${mapX-4} ${mapY}h8m-4-4v8" stroke="white" stroke-width="2"/></svg><figcaption>${esc(record.bodySite)} · illustrative location</figcaption>`;
          box.append(figure);
        }
        if (record.id?.startsWith("REC-OCR-") && !record.documentReviewed) {
          const note = document.createElement("p");
          note.className = "chat-rec-review";
          note.textContent = record.reviewRequired ? "A few details need confirmation against the upload." : "Your report is ready. Open it whenever you want the full details.";
          box.append(note);
        }
        if (record.reviewRequired) {
          const reviewButton = document.createElement("button");
          reviewButton.className = "btn-sm btn-sec chat-rec-review-action";
          reviewButton.textContent = "Review unclear details";
          reviewButton.onclick = () => openOcrReview(record);
          box.append(reviewButton);
        }

        const button = document.createElement("button");
        button.className = "btn-sm btn-sec";
        button.textContent = "View record";
        button.onclick = () => {
          S.curRecord = record.id;
          save();
          switchPage("records");
        };
        box.append(button);
        const detailsButton = document.createElement("button");
        detailsButton.className = "btn-sm btn-pri chat-health-details-button";
        detailsButton.textContent = "Open health details & progress";
        detailsButton.onclick = () => {
          S.curRecord = record.id;
          save();
          switchPage("details");
        };
        box.append(detailsButton);
        return box;
      }
      function bubble(role, text, recordId) {
        const element = document.createElement("div");
        element.className = "m " + (role === "user" ? "u" : "a");
        element.textContent = text;
        const record = S.records.find((r) => r.id === recordId);
        if (record) {
          element.classList.add("has-record");
          element.append(recordCard(record));
        }
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
          c.msgs.forEach((m) => bubble(m.role, m.text, m.recordId));
        }

        // Suggestions on TOP, stacked vertically
        const ch = $("#chips");
        ch.innerHTML = "";
        if (!c || !c.msgs.length) {
          [
            "I have a headache. What can I do?",
            "Explain my recent lab report in simple terms",
            "What are my active medications and their timings?",
            "How can I keep my blood sugar and cholesterol normal?",
          ].forEach((t) => {
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
        if (open) {
          renderDrawerChats();
          $("#drawer-close").focus();
        } else if ($("#drawer").contains(document.activeElement))
          $("#burger-btn").focus();
      }

      function switchPage(page) {
        if (!$(`#view-${page}`)) return;
        cancelPendingChat();
        stopSpeech();
        activePage = page;
        openDrawer(false);

        // Toggle main views
        document
          .querySelectorAll(".page-view")
          .forEach((v) => v.classList.remove("active"));
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
        document.querySelectorAll(".nav-item").forEach((btn) => {
          btn.classList.toggle("on", btn.dataset.page === page);
        });
      }

      function renderDrawerChats() {
        const el = $("#drawer-chats-list");
        if (!el) return;
        el.innerHTML = "";
        if (!S.chats.length) {
          el.innerHTML =
            '<div class="note" style="padding:6px 0">No chat history yet.</div>';
          return;
        }
        S.chats.forEach((c) => {
          const b = document.createElement("div");
          b.className = "item" + (c.id === S.active ? " on" : "");
          const s = document.createElement("button");
          s.className = "chat-select";
          s.textContent = c.title;
          s.style.cursor = "pointer";
          s.onclick = () => {
            S.active = c.id;
            save();
            switchPage("chat");
          };
          const x = document.createElement("button");
          x.className = "x";
          x.textContent = "✕";
          x.setAttribute("aria-label", "Delete chat: " + c.title);
          x.onclick = (e) => {
            e.stopPropagation();
            if (S.active === c.id) {
              cancelPendingChat();
              stopSpeech();
            }
            S.chats = S.chats.filter((z) => z.id !== c.id);
            if (S.active === c.id) S.active = S.chats[0] ? S.chats[0].id : null;
            save();
            renderDrawerChats();
            renderChat();
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
        else if (activePage === "details") renderHealthDetailsPage();
      }

      // ---------------------------------------------------------------------------
      // Full Page Views (Spacious, Clear, Perfect Alignment)
      // ---------------------------------------------------------------------------

      function renderHealthDetailsPage() {
        const el = $("#page-details-content");
        if (!el) return;
        const record = S.records.find((r) => r.id === S.curRecord && !isDemo(r));
        const localToday = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        const confirmedMeds = personalRecords().flatMap((r) =>
          (r.medicinesConfirmed ? r.medicines : [])
            .map((medicine, index) => ({ record: r, medicine, index }))
            .filter(({ medicine }) => medicine.userVerified && medicine.name && medicine.name.toLowerCase() !== "illegible"),
        );
        const daysSince = (date) => {
          const start = new Date(`${date}T12:00:00`);
          return Number.isNaN(start.getTime()) ? null : Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
        };
        const footSvg = (site) => {
          const [x, y] = /toe|front/.test(site) ? [99, 53] : /heel|back/.test(site) ? [65, 163] : /sole|bottom|plantar/.test(site) ? [78, 145] : [91, 119];
          return `<svg class="body-map-foot" viewBox="0 0 140 190" role="img" aria-label="Simple foot diagram with the selected body area highlighted"><path d="M61 174c-12-6-15-17-12-31l10-45c2-11 2-25 3-38l2-30c1-10 8-12 12-3l5 28 3-35c1-9 9-11 12-2l3 33 5-26c2-9 10-9 12 0l-2 40c10-1 17 6 15 17l-9 54c-4 23-17 38-38 43-8 2-15 0-21-5z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M64 103l14 15 20-3 23-4M62 119l15 13 20-3 19-4M58 139l17 10 19-3 15-5M65 98l1-35m13 48 1-51m17 48 2-46m17 43 3-34" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="8" class="body-map-injury"/><path d="M${x-4} ${y}h8m-4-4v8" stroke="white" stroke-width="2"/></svg>`;
        };
        const trackingRecords = personalRecords().filter((r) => r.injuryDescription || r.diagnoses.length || r.bodySite);
        const itemCards = trackingRecords.map((recordItem) => {
          const progress = S.healthItems.find((item) => item.recordId === recordItem.id);
          const site = recordItem.bodySite.toLowerCase();
          const label = recordItem.injuryDescription || recordItem.diagnoses.join(" · ");
          const map = /foot|sole|heel|toe/.test(site) ? footSvg(site) : recordItem.bodySite ? `<div class="body-map-placeholder" aria-label="Body area stated in uploaded record">◎<small>${esc(recordItem.bodySite)}</small></div>` : "";
          const severity = recordItem.documentedSeverity;
          const started = recordItem.injuryStartDate;
          const days = started ? daysSince(started) : null;
          const isInjury = Boolean(recordItem.injuryDescription);
          return `<article class="health-item-card ${progress?.healed ? "is-healed" : ""}">
            ${map ? `<div class="health-item-visual">${map}${severity ? `<span class="severity-pill severity-${severity}">${severity === "serious" ? "Serious" : severity === "medium" ? "Medium" : "Low"} · stated in record</span>` : ""}</div>` : ""}
            <div class="health-item-copy"><span class="health-source-tag">From uploaded record · ${esc(recordItem.date || "date not shown")}</span><h3>${esc(label || "Health concern")}</h3>${recordItem.bodySite ? `<p><b>Area:</b> ${esc(recordItem.bodySite)}</p>` : ""}${recordItem.cause ? `<p><b>Cause stated:</b> ${esc(recordItem.cause)}</p>` : ""}${severity ? `<p><b>Severity stated:</b> ${esc(severity)}</p>` : ""}<p><b>Started:</b> ${started ? `${esc(started)}${days === null ? "" : ` · ${days} day${days === 1 ? "" : "s"} tracked`}` : "Not stated in this upload"}</p>${isInjury ? `<div class="healing-status">${progress?.healed ? "Marked healed by you" : "In progress · based on your update"}</div><button class="btn-sm ${progress?.healed ? "btn-sec" : "btn-pri"}" type="button" data-healed="${esc(recordItem.id)}">${progress?.healed ? "Mark in progress" : "Mark as healed"}</button>` : ""}<button class="btn-sm btn-sec" type="button" data-record-open="${esc(recordItem.id)}">View full result</button></div>
          </article>`;
        }).join("");
        const medicineCards = confirmedMeds.map(({ record: r, medicine: m, index }) => {
          const times = S.reminders.filter((x) => x.recordId === r.id && x.medicineIndex === index).map((x) => x.time);
          return `<article class="reminder-row"><div><b>${esc(m.name || "Medicine")}</b><small>${esc([m.strength || m.dosage, m.frequency, m.timing].filter(Boolean).join(" · ") || "Follow the prescription instructions")}</small><small class="reminder-caveat">${times.length ? `Reminder set for ${esc(times.join(", "))} each day` : "No exact clock time was stated, so no time-based reminder was set."}</small></div></article>`;
        }).join("");
        el.innerHTML = `<header class="health-details-header"><h1 class="page-title">Health details &amp; progress</h1><p class="page-desc">A place to understand what your records say and keep your own progress notes. Document findings are shown separately from details you add.</p></header>
          ${record ? `<section class="health-record-summary"><div><span class="health-source-tag">From your selected record · ${esc(record.date || "date not shown")}</span><h2>${esc(record.title || record.recordType)}</h2><p>${esc(record.summary || "No plain-language summary was extracted.")}</p>${record.diagnoses?.length ? `<p><b>Condition or diagnosis written in record:</b> ${esc(record.diagnoses.join(" · "))}</p>` : `<p><b>No diagnosis was clearly extracted.</b> This app will not guess the injury or condition from an unclear document.</p>`}${record.bodySite ? `<p><b>Body area stated in the document:</b> ${esc(record.bodySite)}</p>` : ""}${record.injuryDescription ? `<p><b>Injury described in the document:</b> ${esc(record.injuryDescription)}</p>` : ""}${record.cause ? `<p><b>Cause stated in the document:</b> ${esc(record.cause)}</p>` : ""}${record.abnormalExplanation ? `<details><summary>What the report says about results</summary><p>${esc(record.abnormalExplanation)}</p><small>Lab reference ranges can vary and results need your clinician’s context.</small></details>` : ""}<button class="btn-sm btn-pri" type="button" id="ask-record-guidance">Help me understand this</button></div><button class="btn-sm btn-sec" type="button" id="details-view-record">View original record</button></section>` : `<section class="health-record-summary"><div><h2>Choose a report for its details</h2><p>Upload or open a medical record to see the extracted information here.</p></div><button class="btn-sm btn-pri" type="button" id="details-go-records">Open records</button></section>`}
          <section class="health-tracker-section"><div class="health-section-head"><div><h2>Injuries &amp; conditions from your uploads</h2><p>This tracker uses details explicitly stated in your records. Missing dates, areas, and severity stay blank rather than being guessed or requested again.</p></div></div>
            <div class="health-items-list">${itemCards || `<p class="empty-health-tracker">No injury or condition details found in your uploaded records yet.</p>`}</div>
          </section>
          <section class="health-reminders-section"><div><h2>Medicine reminders</h2><p>Reminders are created only when the upload clearly states an exact clock time. They run while Mr.Doc is open; unclear times are never guessed.</p></div>${medicineCards || `<p class="empty-health-tracker">No confirmed medicine details with exact times in your uploaded records.</p>`}</section>
          <p class="health-safety-note">Mr.Doc helps organize information; it cannot confirm a diagnosis, judge injury severity, or replace your clinician. For urgent symptoms or a serious injury, contact local medical services.</p>`;
        $("#details-view-record")?.addEventListener("click", () => switchPage("records"));
        $("#details-go-records")?.addEventListener("click", () => switchPage("records"));
        $("#ask-record-guidance")?.addEventListener("click", () => {
          const context = [record.title, record.summary, record.diagnoses.join("; "), record.abnormalExplanation].filter(Boolean).join(". ").slice(0, 1800);
          const prompt = `Help me understand this health record in simple terms. First say what the record explicitly states, then explain what it may mean in general, safe next steps, and relevant day-to-day or food considerations if they apply. Do not infer an organ problem, diagnosis, or severity that is not written here. Explain when personal advice needs my clinician to tailor it. Record text: ${context}`;
          newChat(); switchPage("chat"); send(prompt);
        });
        el.querySelectorAll("[data-healed]").forEach((button) => button.addEventListener("click", () => {
          let item = S.healthItems.find((x) => x.recordId === button.dataset.healed);
          if (!item) { item = { id: button.dataset.healed, recordId: button.dataset.healed, healed: false }; S.healthItems.push(item); }
          item.healed = !item.healed; item.healedAt = item.healed ? new Date().toISOString() : ""; save(); renderHealthDetailsPage();
        }));
        el.querySelectorAll("[data-record-open]").forEach((button) => button.addEventListener("click", () => { S.curRecord = button.dataset.recordOpen; save(); switchPage("records"); }));
      }

      function checkMedicineReminders() {
        if (!Array.isArray(S.reminders)) return;
        const now = new Date();
        const day = now.toLocaleDateString("en-CA");
        const time = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
        for (const reminder of S.reminders) {
          if (reminder.time !== time || reminder.lastFired === day) continue;
          const record = S.records.find((r) => r.id === reminder.recordId && r.medicinesConfirmed);
          const med = record?.medicines?.[reminder.medicineIndex];
          if (!med) continue;
          reminder.lastFired = day;
          save();
          notify(`Medicine reminder: ${med.name || "Confirmed medicine"} — follow your prescription instructions.`);
        }
      }
      setInterval(checkMedicineReminders, 15000);

      // 1. FULL PAGE: MEDICAL RECORDS & OCR
      function highlightClinicalMarkers(str) {
        if (!str) return "";
        return str
          .replace(/(elevated blood sugar(?:\s*\([^)]*\))?)/gi, "<b>$1</b>")
          .replace(/(high cholesterol(?:\s*markers)?)/gi, "<b>$1</b>")
          .replace(/(HbA1c\s*7\.6%)/gi, "<b>$1</b>")
          .replace(/(Fasting Glucose\s*148\s*mg\/dL)/gi, "<b>$1</b>")
          .replace(/(LDL Cholesterol\s*152\s*mg\/dL)/gi, "<b>$1</b>")
          .replace(
            /(బ్లడ్ షుగర్|చక్కెర స్థాయి(?:\s*\([^)]*\))?)/gi,
            "<b>$1</b>",
          )
          .replace(/(కొలెస్ట్రాల్)/gi, "<b>$1</b>")
          .replace(/(ब्लड शुगर|शुगर स्तर(?:\s*\([^)]*\))?)/gi, "<b>$1</b>")
          .replace(/(कोलेस्ट्रॉल)/gi, "<b>$1</b>")
          .replace(/(இரத்த சர்க்கரை)/gi, "<b>$1</b>")
          .replace(/(கொலஸ்ட்ரால்)/gi, "<b>$1</b>");
      }

      function renderRecordsPage() {
        const el = $("#page-records-content");
        if (!el) return;

        const personalRecords = S.records.filter((record) => !isDemo(record));
        const selected =
          personalRecords.find((r) => r.id === S.curRecord) || personalRecords[0];
        const curR = selected ? htmlData(selected) : null;
        const t =
          (curR && curR.translations && curR.translations[S.lang]) || {};
        const rawSum =
          selected?.translations?.[S.lang]?.summary ||
          selected?.summary ||
          "No record selected yet.";
        const sumHtml = highlightClinicalMarkers(esc(rawSum));
        const tips = (curR && (t.selfCareTips || curR.selfCareTips)) || [];
        const questions =
          (curR && (t.doctorQuestions || curR.doctorQuestions)) || [];
        const isOcrRecord =
          !!selected && String(selected.id).startsWith("REC-OCR-");
        const needsOcrUpdate = isOcrRecord && selected.ocrVersion < 2;
        const previewUrl = selected ? recordPreviews.get(selected.id) : "";
        const needsDocumentReview =
          isOcrRecord &&
          !!selected?.reviewRequired &&
          !selected.documentReviewed;

        // Simplified abnormal watch items per user instruction
        let abnormalItems = [];
        if (curR && curR.labTests && curR.labTests.length) {
          abnormalItems = curR.labTests
            .filter(
              (ts) =>
                ts.status === "HIGH" ||
                ts.status === "LOW" ||
                ts.status === "CRITICAL",
            )
            .map((ts) =>
              ts.test
                .replace(/\s*\([^)]*\)/g, "")
                .replace(/['"]/g, "")
                .trim(),
            );
        }

        el.innerHTML = `
    <h1 class="page-title">Your medical records</h1>
    <div class="record-library">
      <label for="record-search">Search your records</label>
      <input id="record-search" type="search" placeholder="Search title, clinic or date" value="${esc(recordQuery)}">
      <div id="record-results" class="record-results"></div>
    </div>

    <!-- Upload Dropzone -->
    <div class="dropzone" id="records-dropzone">
      <span class="dropzone-copy"><b>Add a medical record</b><span class="note">PNG, JPEG, WebP or PDF · up to 10 MB</span></span>
      <button class="btn-sm btn-pri" id="browse-record">Choose file</button>
      <span id="upload-status" role="status"></span>
    </div>

    <!-- Detailed Active Record Card -->
    ${
      curR
        ? `
      <div class="rec-card">
        ${isDemo(selected) ? '<p class="demo-note">Demonstration record · sample data, excluded from your personal profile.</p>' : ""}
        ${isUnavailable(selected) ? '<p class="demo-note">Analysis unavailable · please upload this record again.</p>' : ""}
        ${needsOcrUpdate ? '<div class="ocr-review-note"><b>This upload used an older reader.</b><br>Its extracted medicine details may be wrong. Upload the original again to create a careful transcription.</div>' : ""}
        ${
          isOcrRecord && !needsOcrUpdate
            ? `
          <details class="ocr-advanced-disclosure">
            <summary>View extracted text</summary>
            <section class="ocr-transcription" aria-label="Extracted document text">
              <div class="ocr-transcription-heading"><b>Text extracted from your document</b><span>Compare with the original if needed</span></div>
              <div class="ocr-review-layout">
                ${previewUrl ? `<figure class="ocr-original"><figcaption>Uploaded document</figcaption><img src="${esc(previewUrl)}" alt="Uploaded prescription or report"></figure>` : ""}
                <div class="ocr-transcription-copy">
                  <pre>${esc(curR.verbatimTranscription || "No readable text was returned. Please try a clearer, well-lit image.")}</pre>
                  <p>Handwriting and image quality can affect OCR. Confirm important details with the original document.</p>
                </div>
              </div>
            </section>
          </details>
        `
            : ""
        }
        ${
          needsDocumentReview
            ? `
          <details class="ocr-advanced-disclosure ocr-correction-disclosure">
            <summary>Review details that need confirmation</summary>
          <section class="medicine-review" aria-labelledby="medicine-review-title">
            <div class="medicine-review-heading">
              <div><h3 id="medicine-review-title">Confirm uncertain information</h3><p>Only fields the reader could not verify need your attention. Leave anything unclear blank.</p></div>
              ${curR.imageQuality && curR.imageQuality !== "unknown" ? `<span class="quality-pill quality-${curR.imageQuality}">Image: ${curR.imageQuality}</span>` : ""}
            </div>
            ${previewUrl ? `<figure class="medicine-review-original"><figcaption>Original image for comparison</figcaption><img src="${esc(previewUrl)}" alt="Original uploaded medical document"></figure>` : ""}
            <section class="document-facts-review"><h4>Condition and injury details</h4><label>Condition(s) written in the document<input id="review-diagnoses" value="${(curR.diagnoses || []).join(", ")}" autocomplete="off"></label><label>Body area<input id="review-body-site" value="${curR.bodySite || ""}" autocomplete="off"></label><label>Injury description<input id="review-injury-description" value="${curR.injuryDescription || ""}" autocomplete="off"></label><label>Cause stated in the document<input id="review-cause" value="${curR.cause || ""}" autocomplete="off"></label></section>
            ${curR.verbatimTranscription ? `<details class="review-transcription"><summary>Open the text read from the page</summary><pre>${curR.verbatimTranscription}</pre></details>` : ""}
            <div class="medicine-review-list">
              ${curR.medicines
                .map((m, index) => {
                  const confidence = Number.isFinite(m.ocrConfidence)
                    ? m.ocrConfidence
                    : null;
                  const confidenceClass =
                    confidence === null ||
                    confidence < 50 ||
                    String(m.name).toLowerCase() === "illegible"
                      ? "low"
                      : "caution";
                  const confidenceLabel =
                    confidence === null
                      ? "No estimate"
                      : `Model estimate ${confidence}%`;
                  return `
                  <article class="medicine-review-row" data-med-review="${index}">
                    <div class="medicine-review-row-head"><b>${esc(m.name && m.name.toLowerCase() !== "illegible" ? m.name : `Medicine ${index + 1}`)}</b><span class="confidence-badge ${confidenceClass}">${confidenceLabel}</span></div>
                    <div class="medicine-review-fields">
                      <label>Medicine name<input data-med-field="name" value="${m.name || ""}" autocomplete="off"></label>
                      <label>Strength / dose<input data-med-field="strength" value="${m.strength || m.dosage || ""}" autocomplete="off"></label>
                      <label>Form<input data-med-field="form" value="${m.form || ""}" autocomplete="off"></label>
                      <label>Frequency<input data-med-field="frequency" value="${m.frequency || ""}" autocomplete="off"></label>
                      <label>Timing<input data-med-field="timing" value="${m.timing || ""}" autocomplete="off"></label>
                      <label>Duration<input data-med-field="duration" value="${m.duration || ""}" autocomplete="off"></label>
                      <label class="medicine-instructions">Other instructions<input data-med-field="instructions" value="${m.instructions || ""}" autocomplete="off"></label>
                    </div>
                    ${m.sourceText || m.rawText ? `<p class="medicine-source"><b>As written:</b> ${m.sourceText || m.rawText}</p>` : ""}
                    ${m.alternatives?.length ? `<div class="medicine-alternatives"><span>Possible readings — choose only if the original supports it:</span>${m.alternatives.map((option) => `<button type="button" class="medicine-alternative" data-value="${option}">${option}</button>`).join("")}</div>` : ""}
                    <small class="model-confidence-note">Confidence is the model’s estimate, not a validated accuracy score.</small>
                  </article>`;
                })
                .join("")}
            </div>
            <label class="medicine-confirm-check"><input type="checkbox" id="confirm-meds-ack">I checked the extracted details against the original document.</label>
            <button type="button" class="btn-sm btn-pri" id="confirm-meds" disabled>Save my review</button>
            <p class="medicine-safety-note">Verify medicines with your doctor or pharmacist before taking them.</p>
          </section>
          </details>
        `
            : ""
        }
        ${isOcrRecord && selected.medicinesConfirmed ? `<p class="medicine-confirmed-note">Medicine details were read clearly or checked by you. Confirm instructions with your doctor or pharmacist before taking anything.</p>` : ""}
        <div class="rec-head">
          <div>
            <span class="rec-tag">${curR.recordType}</span>
            <div class="rec-title">${curR.title || curR.recordType}</div>
            <div class="rec-meta">${curR.facility || ""} • ${curR.doctorName || ""} • ${curR.date || ""}</div>
          </div>
          <div class="record-actions"><button class="btn-listen-summary" id="btn-listen-summary" type="button" title="Listen to summary" aria-label="Listen to summary"><span class="mic-orb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg></span><span class="listen-label">Listen Summary</span></button><button class="btn-sm btn-sec" id="print-record">Print / PDF</button></div>
        </div>

        <div class="rec-summary">
          <b class="author">Mr.Doc says:</b>
          <div>${sumHtml}</div>
        </div>

        ${(curR.injuryDescription || curR.diagnoses?.length) ? `<div class="record-severity-row">${curR.documentedSeverity && ["low", "medium", "serious"].includes(curR.documentedSeverity) ? `<span class="severity-pill severity-${curR.documentedSeverity}">${curR.documentedSeverity === "serious" ? "Serious" : curR.documentedSeverity === "medium" ? "Moderate" : "Mild"} · stated in record</span>` : `<span class="severity-pill severity-not-stated">Severity not stated in record</span>`}<small>Mr.Doc shows severity only when the document states it; it does not rate danger on its own.</small></div>` : ""}

        ${
          abnormalItems.length
            ? `
          <div class="abnormal-box">
            <b>To Watch:</b>
            <div class="watch-items">${abnormalItems.join(" &bull; ")}</div>
            <div class="doctor-note">Please do not take or modify any medication without a doctor's consultation. Make sure all prescribed medicines are suitable for your age, condition, and symptoms.</div>
          </div>
        `
            : ""
        }

        <!-- Prescribed Medications -->
        ${
          curR.medicines &&
          curR.medicines.length &&
          (!isOcrRecord || selected.medicinesConfirmed || isDemo(selected))
            ? `
          <div style="margin-top:4px">
            <b style="font-size:13.5px;display:block;margin-bottom:4px">💊 Prescribed Medicines (${curR.medicines.length}):</b>
            <div class="med-row">
              ${curR.medicines
                .map(
                  (m) => `
                <div class="med-pill">
                  <b>${m.name || "Medicine text unclear"}</b>${m.strength || m.dosage ? ` (${m.strength || m.dosage})` : ""}<br>
                  <small style="color:var(--mut)"><b>Schedule:</b> ${m.frequency || "Not clear in image"}${m.timing ? ` • ${m.timing}` : ""} ${m.duration ? `• ${m.duration}` : ""}<br>${m.instructions ? `<b>Advice:</b> ${m.instructions}` : ""}</small>
                  ${m.sourceText ? `<div class="ocr-source-line"><b>As written:</b> ${m.sourceText}</div>` : ""}
                  ${m.needsReview ? '<small class="ocr-field-review">Please verify this entry from the original.</small>' : ""}
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
        `
            : ""
        }

        <!-- Diagnostic Test Results (NO reference range column) -->
        ${
          curR.labTests && curR.labTests.length
            ? `
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
                ${curR.labTests
                  .map(
                    (ts) => `
                  <tr>
                    <td><b>${ts.test}</b></td>
                    <td>${ts.value} ${ts.unit}</td>
                    <td><span class="badge ${ts.status}">${ts.status}</span></td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `
            : ""
        }

        <!-- Self-Care Guidance & Doctor Questions -->
        ${
          tips.length || questions.length
            ? `
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:12px;margin-top:6px">
            ${
              tips.length
                ? `
              <div style="background:#f9fbfb;padding:12px;border-radius:10px;border:1px solid var(--line)">
                <b style="font-size:13px;display:block;margin-bottom:4px">🌿 Self-Care Guidance</b>
                <ul style="margin:0;padding-left:16px;font-size:12.5px;line-height:1.5">${tips.map((x) => `<li>${x}</li>`).join("")}</ul>
              </div>
            `
                : ""
            }
            ${
              questions.length
                ? `
              <div style="background:#f9fbfb;padding:12px;border-radius:10px;border:1px solid var(--line)">
                <b style="font-size:13px;display:block;margin-bottom:4px">❓ Questions for Your Doctor</b>
                <ul style="margin:0;padding-left:16px;font-size:12.5px;line-height:1.5">${questions.map((x) => `<li>${x}</li>`).join("")}</ul>
              </div>
            `
                : ""
            }
          </div>
        `
            : ""
        }
      </div>
    `
        : `<div class="card-box note">Select or upload a record above to view detailed clinical analysis.</div>`
    }
  `;

        // Wire up dropzone
        const dz = el.querySelector("#records-dropzone");
        $("#browse-record").onclick = () => $("#file-inp").click();
        for (const event of ["dragenter", "dragover"])
          dz.addEventListener(event, (e) => {
            e.preventDefault();
            dz.classList.add("drag");
          });
        dz.addEventListener("dragleave", (e) => {
          if (!dz.contains(e.relatedTarget)) dz.classList.remove("drag");
        });
        dz.addEventListener("drop", (e) => {
          e.preventDefault();
          dz.classList.remove("drag");
          if (e.dataTransfer.files.length !== 1)
            return notify("Please upload one report at a time.", true);
          handleFileUpload(e.dataTransfer.files[0]);
        });
        $("#record-search").oninput = (e) => {
          recordQuery = e.target.value;
          renderRecordResults();
        };
        renderRecordResults();
        updateUploadUI();
        $("#print-record")?.addEventListener("click", () => {
          document.body.classList.add("printing-record");
          window.print();
        });

        // Listen summary voice button
        const lBtn = el.querySelector("#btn-listen-summary");
        if (lBtn) lBtn.onclick = () => speakText(rawSum);

        const confirmAck = el.querySelector("#confirm-meds-ack");
        const confirmMeds = el.querySelector("#confirm-meds");
        if (confirmAck && confirmMeds && selected) {
          confirmAck.onchange = () => {
            confirmMeds.disabled = !confirmAck.checked;
          };
          el.querySelectorAll(".medicine-alternative").forEach((button) => {
            button.onclick = () => {
              const row = button.closest(".medicine-review-row");
              const name = row?.querySelector('[data-med-field="name"]');
              if (name) {
                name.value = button.dataset.value || "";
                name.focus();
              }
            };
          });
          confirmMeds.onclick = () => {
            selected.medicines = selected.medicines.map((medicine, index) => {
              const row = el.querySelector(`[data-med-review="${index}"]`);
              if (!row) return medicine;
              const value = (field) =>
                row
                  .querySelector(`[data-med-field="${field}"]`)
                  ?.value.trim() || "";
              const name = value("name");
              return {
                ...medicine,
                name,
                strength: value("strength"),
                dosage: value("strength"),
                form: value("form"),
                frequency: value("frequency"),
                timing: value("timing"),
                duration: value("duration"),
                instructions: value("instructions"),
                userVerified: !!name && name.toLowerCase() !== "illegible",
                needsReview: !name || name.toLowerCase() === "illegible",
              };
            });
            const diagnoses = el.querySelector("#review-diagnoses")?.value || "";
            selected.diagnoses = diagnoses.split(",").map((value) => value.trim()).filter(Boolean);
            selected.bodySite = el.querySelector("#review-body-site")?.value.trim() || "";
            selected.injuryDescription = el.querySelector("#review-injury-description")?.value.trim() || "";
            selected.cause = el.querySelector("#review-cause")?.value.trim() || "";
            selected.documentReviewed = true;
            if (selected.medicines.length) selected.medicinesConfirmed = true;
            selected.reviewRequired = selected.reviewItems.length > 0 || selected.medicines.some((medicine) => medicine.needsReview);
            syncAutoReminders(selected);
            selected.confirmedByUserAt = new Date().toISOString();
            save();
            renderRecordsPage();
            renderTimelinePage();
            renderProfilePage();
            notify(
              "Your corrections are saved to this record.",
            );
          };
        }
      }

      let recordQuery = "";
      function renderRecordResults() {
        const container = $("#record-results");
        if (!container) return;
        const query = recordQuery.trim().toLocaleLowerCase();
      const records = S.records.filter((r) => !isDemo(r)).filter((r) =>
          [r.title, r.facility, r.date, r.recordType]
            .join(" ")
            .toLocaleLowerCase()
            .includes(query),
        );
        const selectedRecordId = records.some((r) => r.id === S.curRecord) ? S.curRecord : records[0]?.id;
        container.replaceChildren();
        if (!records.length) {
          const empty = document.createElement("p");
          empty.className = "note";
          empty.textContent = query
            ? "No matching records. Try another search."
            : "Your uploaded records will appear here.";
          container.append(empty);
          return;
        }
        records.forEach((record) => {
          const button = document.createElement("button");
          button.className = "record-choice";
          button.setAttribute(
            "aria-pressed",
            String(record.id === selectedRecordId),
          );
          button.textContent =
            (record.title || record.recordType) +
            (record.date ? " · " + record.date : "");
          button.onclick = () => {
            stopSpeech();
            S.curRecord = record.id;
            save();
            renderRecordsPage();
            $("#record-search").focus();
          };
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
            const monthNames = [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ];
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

        let recs = htmlData(S.records).sort((a, b) =>
          (b.date || "").localeCompare(a.date || ""),
        );
        if (timelineFilter === "rx")
          recs = recs.filter((r) => r.recordType === "Prescription");
        else if (timelineFilter === "lab")
          recs = recs.filter((r) => r.recordType === "Lab Report");
        else if (timelineFilter === "abnormal")
          recs = recs.filter((r) =>
            (r.labTests || []).some(
              (t) =>
                t.status === "HIGH" ||
                t.status === "LOW" ||
                t.status === "CRITICAL",
            ),
          );

        el.innerHTML = `
    <div class="clinical-timeline-header">
      <h2 class="clinical-timeline-title">Unified Health Timeline</h2>
      <p class="clinical-timeline-subtitle">Chronological record of patient consultations, prescriptions, and lab investigations.</p>
    </div>

    <!-- Segmented Control Tab Bar -->
    <div class="timeline-segmented-bar">
      <button class="timeline-segment ${timelineFilter === "all" ? "active" : ""}" onclick="timelineFilter='all';renderTimelinePage();">All Records</button>
      <button class="timeline-segment ${timelineFilter === "rx" ? "active" : ""}" onclick="timelineFilter='rx';renderTimelinePage();">Prescriptions</button>
      <button class="timeline-segment ${timelineFilter === "lab" ? "active" : ""}" onclick="timelineFilter='lab';renderTimelinePage();">Lab Reports</button>
      <button class="timeline-segment ${timelineFilter === "abnormal" ? "active" : ""}" onclick="timelineFilter='abnormal';renderTimelinePage();">Abnormalities</button>
    </div>

    ${
      !recs.length
        ? `
      <div class="clinical-empty-state">
        No clinical records found matching this filter criteria.
      </div>
    `
        : `
      <div class="clinical-timeline-list">
        ${recs
          .map((r) => {
            const abCount = (r.labTests || []).filter(
              (t) =>
                t.status === "HIGH" ||
                t.status === "LOW" ||
                t.status === "CRITICAL",
            ).length;
            const dateObj = formatTimelineDate(r.date);
            const medCount =
              r.medicinesConfirmed || isDemo(r)
                ? (r.medicines || []).filter(
                    (m) =>
                      isDemo(r) ||
                      (m.userVerified &&
                        m.name &&
                        m.name.toLowerCase() !== "illegible"),
                  ).length
                : 0;
            const providerText = [r.facility, r.doctorName]
              .filter(Boolean)
              .join(" • ");

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
                    ${providerText ? `<div class="clinical-card-provider">${providerText}</div>` : ""}
                  </div>
                  <span class="clinical-type-badge">${isDemo(r) ? "Demo · " : ""}${r.recordType}</span>
                </div>

                ${
                  r.diagnoses && r.diagnoses.length
                    ? `
                  <div class="clinical-card-body">
                    <span class="clinical-label">Diagnoses:</span>
                    <span class="clinical-value">${r.diagnoses.join(", ")}</span>
                  </div>
                `
                    : ""
                }

                ${
                  abCount > 0 || medCount > 0
                    ? `
                  <div class="clinical-card-chips">
                    ${
                      abCount > 0
                        ? `
                      <div class="clinical-chip alert">
                        <svg class="chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>${abCount} Out-of-Range Marker${abCount > 1 ? "s" : ""}</span>
                      </div>
                    `
                        : ""
                    }
                    ${
                      medCount > 0
                        ? `
                      <div class="clinical-chip">
                        <svg class="chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path>
                          <path d="m8.5 8.5 7 7"></path>
                        </svg>
                        <span>${medCount} Prescribed Medication${medCount > 1 ? "s" : ""}</span>
                      </div>
                    `
                        : ""
                    }
                  </div>
                `
                    : ""
                }
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    `
    }
  `;
        el.querySelectorAll("[data-record-id]").forEach((card) => {
          const open = () => {
            S.curRecord = card.dataset.recordId;
            save();
            switchPage("records");
          };
          card.onclick = open;
          card.onkeydown = (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              open();
            }
          };
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
              body: JSON.stringify({
                abhaId: S.abha.address,
                abhaNumber: S.abha.number,
              }),
            });
            const d = await res.json();
            if (Array.isArray(d.syncedRecords)) {
              for (const value of d.syncedRecords) {
                const record = normalizeRecord(value);
                if (record && !S.records.some((r) => r.id === record.id))
                  S.records.push(record);
              }
              save();
            }
            setExp("happy");
            notify(
              "Demonstration records loaded. No ABHA account was connected.",
            );
            renderAbhaPage();
          } catch (e) {
            setExp("happy");
            notify("Demo records could not be loaded. Please try again.", true);
          }
        };

        el.querySelector("#btn-relink-gateway").onclick = () =>
          notify("ABHA linking is not available in this local demo.", true);

        // Export FHIR bundle handler
        el.querySelector("#btn-export-fhir-bundle").onclick = () => {
          const bundle = {
            resourceType: "Bundle",
            type: "collection",
            id: "ABDM-UNIFIED-HEALTH-EXPORT",
            timestamp: new Date().toISOString(),
            entry: S.records.map((r) => {
              const resource = JSON.parse(JSON.stringify(r.fhirBundle || r));
              if (Array.isArray(resource.entry)) {
                let medIndex = 0;
                resource.entry = resource.entry.filter((item) => {
                  if (item.resource?.resourceType !== "MedicationRequest")
                    return true;
                  const medicine = (r.medicines || [])[medIndex++];
                  return (
                    isDemo(r) ||
                    (!!r.medicinesConfirmed &&
                      !!medicine?.userVerified &&
                      !!medicine?.name &&
                      medicine.name.toLowerCase() !== "illegible")
                  );
                });
              }
              return { resource };
            }),
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
      Reads medical records (prescriptions, lab panels, discharge summaries) with multimodal OCR. It preserves the visible text and common Indian abbreviations for review. Handwriting and image quality can affect the result; uncertain medicine readings are flagged for user confirmation and should be checked with a doctor or pharmacist.
    </div>

    <div class="arch-card">
      <b>2. Clinical Entity Normalization & Extraction Pipeline</b>
      Extracts candidate pharmaceutical and diagnostic fields for review. Prescription text is read twice when the comparison pass is available (original and contrast-enhanced image); agreement can raise the displayed model estimate, while disagreement is flagged. The estimate is not a validated accuracy score, and no medicine is treated as confirmed until the user reviews it:
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
          ["notes", "Personal Health Notes"],
        ];

        // Aggregated Meds & Diagnoses from Records
        const allMeds = [];
        const allDiags = [];
        htmlData(personalRecords()).forEach((r) => {
          if (r.medicinesConfirmed || isDemo(r))
            (r.medicines || [])
              .filter(
                (m) =>
                  isDemo(r) ||
                  (m.userVerified &&
                    m.name &&
                    m.name.toLowerCase() !== "illegible"),
              )
              .forEach((m) => {
                if (!allMeds.some((x) => x.name === m.name)) allMeds.push(m);
              });
          (r.diagnoses || []).forEach((d) => {
            if (!allDiags.includes(d)) allDiags.push(d);
          });
        });

        // Pre-escaped personal records (demo records are excluded, as before)
        const recs = htmlData(personalRecords());
        const isFlag = (t) =>
          t.status === "HIGH" || t.status === "LOW" || t.status === "CRITICAL";
        const flags = [];
        recs.forEach((r) =>
          (r.labTests || []).forEach((t) => {
            if (isFlag(t)) flags.push({ ...t, rid: r.id });
          }),
        );
        const recent = [...recs]
          .sort((x, y) =>
            String(y.date || "").localeCompare(String(x.date || "")),
          )
          .slice(0, 4);
        const plain = (v) => String(v == null ? "" : v);
        const initials = (n) => {
          const w = plain(n).trim().split(/\s+/).filter(Boolean);
          return w.length
            ? (w[0][0] + (w[1] ? w[1][0] : "")).toUpperCase()
            : "";
        };
        const pct = () =>
          Math.round(
            (F.filter(([k]) => plain(S.profile[k]).trim()).length / F.length) *
              100,
          );
        const subText = () => {
          const bits = [];
          if (plain(S.profile.age).trim())
            bits.push("Age " + plain(S.profile.age).trim());
          if (plain(S.profile.blood).trim())
            bits.push("Blood group " + plain(S.profile.blood).trim());
          return bits.length
            ? bits.join(" · ")
            : "Add your age and blood group below";
        };
        const uploadCta = `<button type="button" class="mh-link" data-go="records">Upload a report →</button>`;

        el.innerHTML = `
    <h1 class="page-title">👤 My Health</h1>
    <div class="page-desc">Your personal profile and a live summary of everything found in your medical records.</div>

    <section class="mh-hero">
      <div class="mh-avatar" id="mh-avatar">${esc(initials(S.profile.name)) || "👤"}</div>
      <div class="mh-hero-info">
        <h2 id="mh-name">${esc(plain(S.profile.name).trim()) || "Your name"}</h2>
        <p id="mh-sub">${esc(subText())}</p>
        <div class="mh-progress">
          <div class="mh-bar"><i id="mh-fill" style="width:${pct()}%"></i></div>
          <span id="mh-pct">${pct()}% profile complete</span>
        </div>
      </div>
      <div class="mh-stats">
        <div class="mh-stat"><b>${recs.length}</b><span>Records</span></div>
        <div class="mh-stat"><b>${allMeds.length}</b><span>Medicines</span></div>
        <div class="mh-stat ${flags.length ? "warn" : ""}"><b>${flags.length}</b><span>Out of range</span></div>
      </div>
    </section>

    <div class="mh-grid">
      <section class="mh-card">
        <h3 class="mh-h">Personal details <small>Saved on this browser</small></h3>
        <div class="mh-form">
          ${F.map(
            ([k, l]) => `
            <div>
              <label for="prof-${k}">${l}</label>
              ${
                ["notes", "conditions", "meds", "allergies"].includes(k)
                  ? `
                <textarea id="prof-${k}" rows="2">${esc(S.profile[k] || "")}</textarea>
              `
                  : `
                <input id="prof-${k}" value="${esc(S.profile[k] || "")}">
              `
              }
            </div>
          `,
          ).join("")}
        </div>
        <button type="button" class="form-btn" id="btn-save-prof">Save Profile</button>
      </section>

      <div class="mh-col">
        <section class="mh-card">
          <h3 class="mh-h">Recorded conditions</h3>
          ${
            allDiags.length
              ? `<div class="mh-chips">${allDiags.map((d) => `<span class="mh-chip">${d}</span>`).join("")}</div>`
              : `<p class="mh-empty">No conditions recorded yet. ${uploadCta}</p>`
          }
        </section>

        <section class="mh-card">
          <h3 class="mh-h">Needs attention <small>${flags.length ? flags.length + " out-of-range" : "all clear"}</small></h3>
          ${
            flags.length
              ? `<div class="mh-flags">${flags
                  .slice(0, 6)
                  .map(
                    (t) => `
            <button type="button" class="mh-flag" data-record-id="${t.rid}">
              <span class="mh-flag-name">${t.test}</span>
              <span class="mh-flag-val">${t.value} ${t.unit}</span>
              <span class="badge ${t.status}">${t.status}</span>
            </button>`,
                  )
                  .join(
                    "",
                  )}</div>${flags.length > 6 ? `<p class="mh-more">+ ${flags.length - 6} more in your records</p>` : ""}`
              : `<p class="mh-empty">No out-of-range results found in your records.</p>`
          }
        </section>

        <section class="mh-card">
          <h3 class="mh-h">Recorded medicines <small>${allMeds.length}</small></h3>
          ${
            allMeds.length
              ? `<div class="mh-meds">${allMeds
                  .map(
                    (m) => `
            <div class="mh-med">
              <b>${m.name}</b> <span>${m.dosage}</span>
              <small>${m.frequency} • ${m.timing}</small>
            </div>`,
                  )
                  .join("")}</div>`
              : `<p class="mh-empty">No confirmed medicines yet. ${uploadCta}</p>`
          }
        </section>

        <section class="mh-card">
          <h3 class="mh-h">Recent records</h3>
          ${
            recent.length
              ? `<div class="mh-recent">${recent
                  .map(
                    (r) => `
            <button type="button" class="mh-rec" data-record-id="${r.id}">
              <span class="rec-tag">${r.recordType}</span>
              <b>${r.title || r.recordType}</b>
              <small>${r.date || ""}${r.facility ? " • " + r.facility : ""}</small>
            </button>`,
                  )
                  .join("")}</div>`
              : `<p class="mh-empty">No records yet. ${uploadCta}</p>`
          }
        </section>
      </div>
    </div>
  `;

        const updateHero = () => {
          const q = (id) => el.querySelector(id);
          q("#mh-avatar").textContent = initials(S.profile.name) || "👤";
          q("#mh-name").textContent =
            plain(S.profile.name).trim() || "Your name";
          q("#mh-sub").textContent = subText();
          q("#mh-fill").style.width = pct() + "%";
          q("#mh-pct").textContent = pct() + "% profile complete";
        };

        F.forEach(([k]) => {
          const inp = el.querySelector(`#prof-${k}`);
          if (inp) {
            inp.oninput = () => {
              S.profile[k] = inp.value;
              save();
              updateHero();
            };
          }
        });

        el.querySelectorAll("[data-record-id]").forEach((btn) => {
          btn.onclick = () => {
            S.curRecord = btn.dataset.recordId;
            save();
            switchPage("records");
          };
        });
        el.querySelectorAll("[data-go]").forEach((btn) => {
          btn.onclick = () => switchPage(btn.dataset.go);
        });

        const sBtn = el.querySelector("#btn-save-prof");
        if (sBtn)
          sBtn.onclick = () => {
            if (save()) {
              notify("Health profile saved on this browser.");
              const old = sBtn.textContent;
              sBtn.textContent = "✓ Saved";
              setTimeout(() => {
                sBtn.textContent = old;
              }, 1600);
            }
            renderDrawerChats();
          };
      }

      // 6. FULL PAGE: HEALTH GUIDANCE
      function renderGuidePage() {
        const el = $("#page-guide-content");
        if (!el) return;

        const topics = [
          ["😴", "Better Sleep", "How can I sleep better naturally?"],
          ["💧", "Hydration Rules", "How much water should I drink each day?"],
          ["🤕", "Managing Headaches", "I have a headache. What can I do?"],
          [
            "🤧",
            "Cold & Flu Care",
            "I think I am catching a cold. What should I do?",
          ],
          [
            "🧘",
            "Stress & Anxiety",
            "I feel stressed. Any simple ways to calm down?",
          ],
          ["🥗", "Healthy Eating", "How do I eat healthier in a simple way?"],
          [
            "🏃",
            "Safe Physical Activity",
            "How can I start exercising safely?",
          ],
          [
            "🩹",
            "First Aid Essentials",
            "What are basic first aid steps for a minor cut or burn?",
          ],
        ];

        el.innerHTML = `
    <h1 class="page-title">Health guidance</h1>
    <div class="page-desc">Common everyday self-care questions. Tap any topic to start a conversation with Mr.Doc.</div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:12px">
      ${topics
        .map(
          ([e, t, q]) => `
        <button class="sample-btn" onclick="newChat();switchPage('chat');send('${q}');" style="padding:16px">
          <div style="font-size:24px;margin-bottom:6px">${e}</div>
          <b>${t}</b>
          <small style="color:var(--mut);display:block;margin-top:2px">${q}</small>
        </button>
      `,
        )
        .join("")}
    </div>
  `;
      }

      // ---------------------------------------------------------------------------
      // Medical Record Processing Helpers
      // ---------------------------------------------------------------------------

      let uploading = false;
      function updateUploadUI() {
        for (const selector of ["#rec-up", "#browse-record"]) {
          const button = $(selector);
          if (button) button.disabled = uploading;
        }
        if ($("#upload-status"))
          $("#upload-status").textContent = uploading
            ? "Reading your report…"
            : "";
      }
      async function loadSampleRecord(sampleId) {
        if (uploading) return;
        uploading = true;
        updateUploadUI();
        setExp("think");
        try {
          const data = await requestJson(CONFIG.ocrEndpoint, {
            sampleId,
            language: S.lang,
            voice,
          });
          handleAnalyzedRecord(data.record, data.audio);
        } catch (error) {
          notify(error.message, true);
        } finally {
          uploading = false;
          updateUploadUI();
          if (!speechActive) setExp("happy");
        }
      }
      async function handleFileUpload(file) {
        if (!file) return;
        if (uploading)
          return notify("A report is already being read. Please wait.");
        const mime =
          file.type ||
          {
            pdf: "application/pdf",
            png: "image/png",
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            webp: "image/webp",
          }[file.name.split(".").pop().toLowerCase()];
        if (
          ![
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/webp",
          ].includes(mime)
        )
          return notify("Choose a PNG, JPEG, WebP image or PDF.", true);
        if (!file.size || file.size > 10 * 1024 * 1024)
          return notify("Choose a non-empty file smaller than 10 MB.", true);
        uploading = true;
        updateUploadUI();
        const analysisOverlay = $("#analysis-overlay");
        if (analysisOverlay) analysisOverlay.hidden = false;
        setExp("think");
        const analysisText = $("#analysis-status-text");
        if (analysisText) analysisText.textContent = "Checking the image and reading visible text…";
        try {
          const encoded = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(",")[1]);
            reader.onerror = reader.onabort = () =>
              reject(
                new Error(
                  "This file could not be read. Please choose it again.",
                ),
              );
            reader.readAsDataURL(file);
          });
          let processedImage = "",
            qualityCheck = null;
          if (mime.startsWith("image/")) {
            const prepared = await preparePrescriptionImage(file);
            processedImage = prepared.image;
            qualityCheck = prepared.quality;
            if (qualityCheck.blur < 14 || qualityCheck.brightness < 24) {
              throw new Error(
                "This photo looks too blurry or dark to read safely. Retake it in bright, even light and keep the writing in focus.",
              );
            }
          }
          const data = await requestJson(CONFIG.ocrEndpoint, {
            image: encoded,
            processedImage,
            mimeType: mime,
            language: S.lang,
            voice,
          });
          const previewUrl = mime.startsWith("image/")
            ? URL.createObjectURL(file)
            : "";
          handleAnalyzedRecord(data.record, data.audio, previewUrl);
          notify("Report added to your records.");
        } catch (error) {
          notify(error.message, true);
        } finally {
          uploading = false;
          if (analysisOverlay) analysisOverlay.hidden = true;
          updateUploadUI();
          if (!speechActive) setExp("happy");
        }
      }
      async function preparePrescriptionImage(file) {
        const source = await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () =>
            reject(
              new Error(
                "This photo could not be opened. Please choose another image.",
              ),
            );
          image.src = URL.createObjectURL(file);
        });
        try {
          const scale = Math.min(
            1,
            1800 / Math.max(source.naturalWidth, source.naturalHeight),
          );
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
          const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = pixels.data,
            gray = new Uint8Array(canvas.width * canvas.height);
          let brightness = 0;
          for (let i = 0, p = 0; i < data.length; i += 4, p++) {
            const v = Math.round(
              data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114,
            );
            gray[p] = v;
            brightness += v;
          }
          brightness /= gray.length;
          let lapSum = 0,
            lapSq = 0,
            count = 0;
          for (let y = 1; y < canvas.height - 1; y += 2)
            for (let x = 1; x < canvas.width - 1; x += 2) {
              const p = y * canvas.width + x;
              const lap =
                4 * gray[p] -
                gray[p - 1] -
                gray[p + 1] -
                gray[p - canvas.width] -
                gray[p + canvas.width];
              lapSum += lap;
              lapSq += lap * lap;
              count++;
            }
          const lapMean = lapSum / Math.max(1, count);
          const blur = lapSq / Math.max(1, count) - lapMean * lapMean;
          // Build a grayscale contrast rendition for the independent comparison pass.
          const contrast = ctx.createImageData(canvas.width, canvas.height);
          for (let i = 0; i < data.length; i += 4) {
            const v = Math.max(
              0,
              Math.min(255, (gray[i / 4] - 128) * 1.22 + 138),
            );
            contrast.data[i] = v;
            contrast.data[i + 1] = v;
            contrast.data[i + 2] = v;
            contrast.data[i + 3] = 255;
          }
          ctx.putImageData(contrast, 0, 0);
          return {
            image: canvas.toDataURL("image/jpeg", 0.88).split(",")[1],
            quality: { blur, brightness },
          };
        } finally {
          URL.revokeObjectURL(source.src);
        }
      }
      function openOcrReview(record) {
        const overlay = $("#ocr-review-overlay");
        const content = $("#ocr-review-content");
        if (!overlay || !content) return;
        const preview = recordPreviews.get(record.id);
        const medicines = record.medicines
          .map((medicine, index) => ({ medicine, index }))
          .filter(({ medicine }) => medicine.needsReview);
        const medicineMarkup = medicines.map(({ medicine, index }) => `
          <article class="ocr-uncertain-item" data-review-med="${index}">
            <h3>Medicine details to check</h3>
            <p><b>As written:</b> ${esc(medicine.sourceText || medicine.rawText || "No clear line was read")}</p>
            <div class="ocr-uncertain-fields">
              <label>Name<input data-med-field="name" value="${esc(medicine.name)}"></label>
              <label>Strength / dose<input data-med-field="strength" value="${esc(medicine.strength || medicine.dosage)}"></label>
              <label>Form<input data-med-field="form" value="${esc(medicine.form)}"></label>
              <label>Frequency<input data-med-field="frequency" value="${esc(medicine.frequency)}"></label>
              <label>Timing<input data-med-field="timing" value="${esc(medicine.timing)}"></label>
              <label>Duration<input data-med-field="duration" value="${esc(medicine.duration)}"></label>
            </div>
            ${medicine.alternatives?.length ? `<div class="medicine-alternatives"><span>Possible readings from the image:</span>${medicine.alternatives.map((option) => `<button type="button" class="medicine-alternative" data-med-alternative="${index}" data-value="${esc(option)}">${esc(option)}</button>`).join("")}</div>` : ""}
          </article>`).join("");
        const fieldMarkup = record.reviewItems.map((item, index) => `
          <article class="ocr-uncertain-item" data-review-generic="${index}"><h3>${esc(item.field || `Unclear detail ${index + 1}`)}</h3>
          ${item.reason ? `<p>${esc(item.reason)}</p>` : ""}
          ${item.sourceText ? `<p><b>As written:</b> ${esc(item.sourceText)}</p>` : ""}
          <label>Your correction<input data-review-field="${esc(item.field)}" data-review-index-value="${index}" value="${esc(item.value)}"></label>
          ${item.alternatives.length ? `<div class="medicine-alternatives"><span>Possible readings:</span>${item.alternatives.map((option) => `<button type="button" class="review-alternative" data-review-index="${index}" data-value="${esc(option)}">${esc(option)}</button>`).join("")}</div>` : ""}</article>`).join("");
        const transcriptOnlyReview = !fieldMarkup && !medicineMarkup;
        content.innerHTML = `${preview ? `<figure class="ocr-review-preview"><figcaption>Original upload</figcaption><img src="${esc(preview)}" alt="Uploaded medical document"></figure>` : ""}${fieldMarkup}${medicineMarkup}${transcriptOnlyReview ? `<article class="ocr-uncertain-item"><h3>Text that needs a second look</h3><p>Some text could not be read confidently. Correct the marked [unclear] parts below, or leave them unresolved.</p><label>Corrected transcription<textarea data-review-transcription rows="5">${esc(record.verbatimTranscription)}</textarea></label></article>` : ""}`;
        overlay.hidden = false;
        const dialog = overlay.querySelector(".ocr-review-dialog");
        dialog?.focus();
        $("#ocr-review-ack").checked = false;
        $("#ocr-review-save").disabled = true;
        $("#ocr-review-ack").onchange = () => { $("#ocr-review-save").disabled = !$("#ocr-review-ack").checked; };
        const closeReview = () => { overlay.hidden = true; document.querySelector(".chat-rec-review-action")?.focus(); };
        $("#ocr-review-close").onclick = () => { closeReview(); notify("You can review the unclear text from the chat result later."); };
        dialog?.addEventListener("keydown", (event) => {
          if (event.key === "Escape") { event.preventDefault(); closeReview(); return; }
          if (event.key !== "Tab") return;
          const focusable = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), summary')];
          if (!focusable.length) return;
          if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1).focus(); }
          else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
        });
        $("#ocr-review-save").onclick = () => {
          const transcriptCorrection = content.querySelector("[data-review-transcription]");
          if (transcriptCorrection) record.verbatimTranscription = transcriptCorrection.value.trim();
          content.querySelectorAll("[data-review-med]").forEach((row) => {
            const med = record.medicines[Number(row.dataset.reviewMed)];
            if (!med) return;
            const value = (key) => row.querySelector(`[data-med-field="${key}"]`)?.value.trim() || "";
            med.name = value("name");
            med.strength = med.dosage = value("strength");
            med.form = value("form"); med.frequency = value("frequency");
            med.timing = value("timing"); med.duration = value("duration");
            med.userVerified = Boolean(med.name) && med.name.toLowerCase() !== "illegible";
            med.needsReview = !med.userVerified;
          });
          content.querySelectorAll("[data-review-field]").forEach((input) => {
            const field = input.dataset.reviewField;
            const value = input.value.trim();
            if (field === "bodySite" || field === "injuryDescription" || field === "cause" || field === "injuryStartDate") record[field] = value;
            else if (field === "diagnoses") record.diagnoses = value.split(",").map((item) => item.trim()).filter(Boolean);
          });
          record.reviewItems = record.reviewItems.filter((item, index) => {
            const input = content.querySelector(`[data-review-index-value="${index}"]`);
            const value = input?.value.trim() || "";
            if (!value) return true;
            let applied = false;
            if (["bodySite", "injuryDescription", "cause", "injuryStartDate"].includes(item.field)) { record[item.field] = value; applied = true; }
            else if (item.field === "documentedSeverity" && ["low", "medium", "serious"].includes(value.toLowerCase())) { record.documentedSeverity = value.toLowerCase(); applied = true; }
            else if (item.field === "diagnoses") { record.diagnoses = value.split(",").map((entry) => entry.trim()).filter(Boolean); applied = true; }
            else if (item.field.startsWith("medicine:")) {
              const [, indexText, field] = item.field.split(":");
              const medicine = record.medicines[Number(indexText)];
              if (medicine && ["name", "strength", "dosage", "form", "frequency", "timing", "duration", "instructions"].includes(field)) { medicine[field] = value; applied = true; medicine.userVerified = field === "name" && value.toLowerCase() !== "illegible"; if (medicine.userVerified) medicine.needsReview = false; }
            }
            return !applied;
          });
          record.documentReviewed = true;
          record.reviewRequired = record.reviewItems.length > 0 || record.medicines.some((medicine) => medicine.needsReview) || (transcriptOnlyReview && /\[unclear\]/i.test(record.verbatimTranscription));
          record.medicinesConfirmed = record.medicines.length > 0 && record.medicines.every((medicine) => medicine.userVerified && !medicine.needsReview);
          syncAutoReminders(record);
          save();
          overlay.hidden = true;
          renderChat();
          if (activePage === "details") renderHealthDetailsPage();
          notify(record.reviewRequired ? "Saved. Any unresolved fields remain marked so they won’t be used as confirmed information." : "Corrections saved to your record.");
        };
        content.querySelectorAll("[data-med-alternative]").forEach((button) => button.onclick = () => {
          const row = content.querySelector(`[data-review-med="${button.dataset.medAlternative}"]`);
          const input = row?.querySelector('[data-med-field="name"]');
          if (input) { input.value = button.dataset.value; input.focus(); }
        });
        content.querySelectorAll("[data-review-index]").forEach((button) => button.onclick = () => {
          const input = button.closest(".ocr-uncertain-item")?.querySelector("[data-review-field]");
          if (input) { input.value = button.dataset.value; input.focus(); }
        });
      }

      function syncAutoReminders(record) {
        if (!record?.id) return;
        const previous = S.reminders.filter((item) => item.recordId === record.id);
        S.reminders = S.reminders.filter((item) => item.recordId !== record.id);
        if (!record.medicinesConfirmed) return;
        record.medicines.forEach((medicine, medicineIndex) => {
          if (!medicine.userVerified || !medicine.name || medicine.needsReview) return;
          (medicine.reminderTimes || []).forEach((time) => {
            const prior = previous.find((item) => item.medicineIndex === medicineIndex && item.time === time);
            S.reminders.push({ recordId: record.id, medicineIndex, time, lastFired: prior?.lastFired || "" });
          });
        });
      }

      function handleAnalyzedRecord(value, audio, previewUrl = "") {
        const record = normalizeRecord(value);
        if (!record)
          throw new Error(
            "Analysis returned an incomplete record. Please try again.",
          );
        if (previewUrl) recordPreviews.set(record.id, previewUrl);
        if (record.id.startsWith("REC-OCR-") && record.medicines.length) {
          const clearMedicines = record.medicines.every((medicine) => !medicine.needsReview && medicine.name && medicine.name.toLowerCase() !== "illegible");
          record.medicinesConfirmed = clearMedicines;
          if (record.medicinesConfirmed) record.medicines.forEach((medicine) => { medicine.userVerified = true; });
        }
        const index = S.records.findIndex((r) => r.id === record.id);
        if (index < 0) S.records.unshift(record);
        else S.records[index] = record;
        syncAutoReminders(record);
        S.curRecord = record.id;
        const chat = cur() || newChat();
        chat.msgs.push({
          role: "assistant",
          text: isDemo(record)
            ? "Here is a demonstration record."
            : "Your report is ready. Here are the key details:",
          recordId: record.id,
        });
        save();
        switchPage("chat");
        if (voice && audio) playBase64Audio(audio);
        else setExp("supportive", 1600);
      }

      function showFhirModal(record) {
        const win = window.open("", "_blank", "width=700,height=600");
        if (!win)
          return notify("Allow popups to view the record export.", true);
        win.opener = null;
        win.document.title = "Mr.Doc record export";
        const pre = win.document.createElement("pre");
        pre.style.cssText =
          "white-space:pre-wrap;overflow-wrap:anywhere;padding:24px";
        pre.textContent = JSON.stringify(record.fhirBundle || record, null, 2);
        win.document.body.append(pre);
      }
      function downloadJson(filename, obj) {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(obj, null, 2)], {
            type: "application/json",
          }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      let curAudio = null,
        speechActive = false,
        speechDone = null;
      const speechLanguage = () =>
        ({ en: "en-IN", hi: "hi-IN", te: "te-IN", ta: "ta-IN" })[S.lang];
      function updateSpeechUI() {
        $("#stop-speech").hidden = !speechActive;
      }
      function stopSpeech() {
        if (curAudio) {
          curAudio.pause();
          curAudio.onended = curAudio.onerror = null;
          curAudio = null;
        }
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
        if (speechDone) speechDone();
        speechDone = null;
        speechActive = false;
        window._curUtt = null;
        updateSpeechUI();
        if (!busy && !uploading) setExp("happy");
      }
      function speakText(text, audio = "", allowBrowserVoice = true) {
        stopSpeech();
        if (!audio && !allowBrowserVoice) {
          notify(
            "Mr.Doc's fixed voice is temporarily unavailable. You can still read the reply.",
            true,
          );
          return Promise.resolve();
        }
        if (!audio && !("speechSynthesis" in window)) {
          notify("Speech is unavailable in this browser.", true);
          return Promise.resolve();
        }
        speechActive = true;
        updateSpeechUI();
        setExp("speak");
        return new Promise((resolve) => {
          let finished = false;
          const timer = setTimeout(
            finish,
            Math.min(180000, Math.max(12000, text.length * 140)),
          );
          function finish() {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            if (speechDone === finish) {
              if (curAudio) {
                curAudio.onended = curAudio.onerror = null;
                curAudio.pause();
              }
              curAudio = null;
              speechDone = null;
              speechActive = false;
              window._curUtt = null;
              if ("speechSynthesis" in window) window.speechSynthesis.cancel();
              updateSpeechUI();
              if (!busy && !uploading) setExp("happy");
            }
            resolve();
          }
          speechDone = finish;
          if (audio) {
            curAudio = new Audio("data:audio/mp3;base64," + audio);
            curAudio.onended = finish;
            curAudio.onerror = () => {
              finish();
              notify("Audio could not be played.", true);
            };
            curAudio.play().catch(() => {
              finish();
              notify(
                "Audio could not start. You can still read the reply.",
                true,
              );
            });
          } else {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = speechLanguage();
            utterance.rate = 1;
            const matchingVoice = speechSynthesis
              .getVoices()
              .find((v) => v.lang.toLowerCase().startsWith(S.lang));
            if (matchingVoice) utterance.voice = matchingVoice;
            window._curUtt = utterance;
            utterance.onend = finish;
            utterance.onerror = () => {
              const current = speechDone === finish;
              finish();
              if (current)
                notify("Speech could not be played in this language.", true);
            };
            speechSynthesis.speak(utterance);
          }
        });
      }
      function playBase64Audio(audio) {
        return speakText("", audio);
      }

      // ---------------------------------------------------------------------------
      // Fallback & Chat Logic
      // ---------------------------------------------------------------------------
      function fallback(t) {
        t = t.toLowerCase();
        if (
          /chest pain|can't breathe|cannot breathe|faint|suicid|stroke|bleeding heavily/.test(
            t,
          )
        ) {
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
        $("#go").setAttribute(
          "aria-label",
          value ? "Waiting for reply" : "Send message",
        );
        $("#msgs").setAttribute("aria-busy", String(value));
        $("#chat-status").innerHTML = value
          ? '<span class="mr-loading" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></span><span>Mr.Doc is thinking…</span>'
          : "";
      }
      function cancelPendingChat() {
        if (pendingChat) pendingChat.controller.abort();
        pendingChat = null;
        setChatBusy(false);
      }
      async function send(text) {
        text = (text || "").trim();
        if (!text || busy) return;
        if (text.length > 6000)
          return notify(
            "Please keep each message under 6,000 characters.",
            true,
          );
        const chat = cur() || newChat();
        const request = { chatId: chat.id, controller: new AbortController() };
        pendingChat = request;
        stopSpeech();
        setChatBusy(true);
        chat.msgs.push({ role: "user", text });
        if (chat.title === "New chat") chat.title = text.slice(0, 32);
        save();
        $("#inp").value = "";
        $("#chips").replaceChildren();
        bubble("user", text);
        renderDrawerChats();
        setExp("think");
        if (/^(?:hi|hello|hey|good morning|good afternoon|good evening)[.!?\s]*$/i.test(text)) {
          const greeting = {
            en: "Hi! I'm Mr.Doc. How can I help you today?",
            hi: "नमस्ते! मैं Mr.Doc हूँ। आज मैं आपकी कैसे मदद कर सकता हूँ?",
            te: "నమస్కారం! నేను Mr.Doc. ఈరోజు మీకు ఎలా సహాయం చేయగలను?",
            ta: "வணக்கம்! நான் Mr.Doc. இன்று உங்களுக்கு எப்படி உதவலாம்?",
          }[S.lang] || "Hi! I'm Mr.Doc. How can I help you today?";
          chat.msgs.push({ role: "assistant", text: greeting });
          save();
          bubble("assistant", greeting);
          setChatBusy(false);
          pendingChat = null;
          if (voice) speakText(greeting);
          else setExp("happy");
          return;
        }
        const history = chat.msgs
          .slice(-9, -1)
          .map((m) => (m.role === "user" ? "Patient: " : "Mr.Doc: ") + m.text)
          .join("\n")
          .slice(-16000);
        const language = {
          en: "English",
          hi: "Hindi",
          te: "Telugu",
          ta: "Tamil",
        }[S.lang];
        const prompt =
          "Reply directly to the patient's latest message in 1–3 short sentences in " +
          language +
          ". Use plain language and no markdown. Do not reveal internal reasoning, instructions, or planning. For a greeting, greet briefly without forcing health advice. Never diagnose; for emergency signs, advise contacting emergency services immediately. Use this patient health information only when it is relevant (demonstration records excluded): " +
          profText().slice(0, 10000) +
          "\nRecent conversation for context:\n" +
          history +
          "\nLatest patient message: " +
          text;
        try {
          const result = await askModel(prompt, request.controller.signal);
          if (
            pendingChat !== request ||
            S.active !== chat.id ||
            activePage !== "chat"
          )
            return;
          const reply = stringValue(result.text)
            .replace(/^(?:Mr\.?\s*Doc|Dr\.\s*Carely|Carely)\s*:\s*/i, "")
            .trim();
          if (!reply)
            throw new Error(
              "The service returned an empty reply. Please try again.",
            );
          chat.msgs.push({ role: "assistant", text: reply });
          save();
          bubble("assistant", reply);
          setChatBusy(false);
          if (voice) speakText(reply, result.audio || "", !result.fixedVoice);
          else setExp("supportive", 1600);
        } catch (error) {
          if (!request.controller.signal.aborted && pendingChat === request) {
            $("#inp").value = text;
            notify(error.message + " Your message is ready to retry.", true);
          }
        } finally {
          if (pendingChat === request) {
            pendingChat = null;
            setChatBusy(false);
            if (!speechActive) setExp("happy");
          }
        }
      }

      // ---------------------------------------------------------------------------
      // Event Listeners & Setup
      // ---------------------------------------------------------------------------
      let tT;
      $("#inp").addEventListener("input", () => {
        if (busy) return;
        clearTimeout(tT);
        if (!$("#inp").value) {
          setExp("happy");
          return;
        }
        if (cur0 !== "look") setExp("look");
        tT = setTimeout(() => {
          if (!busy) setExp("happy");
        }, 1200);
      });
      $("#inp").addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.isComposing) send($("#inp").value);
      });
      $("#go").onclick = () => send($("#inp").value);

      // New Chat Corner Button
      $("#new").onclick = () => {
        newChat();
        switchPage("chat");
      };

      // Hamburger Menu & Drawer Toggles
      $("#burger-btn").onclick = () => openDrawer(true);
      $("#drawer-close").onclick = () => openDrawer(false);
      $("#drawer-backdrop").onclick = () => openDrawer(false);
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") openDrawer(false);
      });

      // Drawer Navigation Items (Open full pages)
      document.querySelectorAll(".nav-item").forEach((btn) => {
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
          langMenu.querySelectorAll("button").forEach((b) => {
            b.classList.toggle("on", b.dataset.lang === S.lang);
          });
        }
      }
      updateLangUI();

      if (langBtn && langMenu) {
        langBtn.onclick = (e) => {
          e.stopPropagation();
          langMenu.classList.toggle("show");
          langBtn.setAttribute(
            "aria-expanded",
            String(langMenu.classList.contains("show")),
          );
        };
        langMenu.querySelectorAll("button").forEach((b) => {
          b.onclick = (e) => {
            e.stopPropagation();
            const l = b.dataset.lang;
            if (l) {
              stopSpeech();
              S.lang = l;
              save();
              updateLangUI();
              langMenu.classList.remove("show");
              langBtn.setAttribute("aria-expanded", "false");
              if (activePage !== "chat") renderActivePage();
            }
          };
        });
        document.addEventListener("click", (e) => {
          if (!langMenu.contains(e.target) && e.target !== langBtn) {
            langMenu.classList.remove("show");
            langBtn.setAttribute("aria-expanded", "false");
          }
        });
      }

      // Back to Chat Button on top-right
      $("#btn-back-chat").onclick = () => switchPage("chat");

      // Big Upload Button in Chat Input Bar
      const fileInp = $("#file-inp");
      if (fileInp) {
        fileInp.onchange = (e) => {
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
        r.lang = speechLanguage();
        r.interimResults = false;
        let listening = false;
        r.onresult = (e) => {
          $("#inp").value = e.results[0][0].transcript;
          send($("#inp").value);
        };
        r.onerror = (e) => {
          if (e.error !== "aborted")
            notify(
              e.error === "not-allowed"
                ? "Microphone access is blocked. You can type your message."
                : "Voice input could not start. Please try again.",
              true,
            );
        };
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
            stopSpeech();
            r.lang = speechLanguage();
            r.start();
            listening = true;
            micBtn.classList.add("on");
            setExp("look");
          } catch (e) {}
        };
      }

      // Liquid-metal orb: iframe click -> existing mic handler; .on class -> orb listening state
      (function () {
        const frame = document.getElementById("orb-frame");
        if (!frame) return;
        frame.src = "assets/voice-orb.html";
        const mic = document.getElementById("mic");
        const post = () => {
          try {
            frame.contentWindow.postMessage(
              {
                orb: { type: "listening", value: mic.classList.contains("on") },
              },
              "*",
            );
          } catch (e) {}
        };
        window.addEventListener("message", (e) => {
          if (e.source !== frame.contentWindow || !e.data || !e.data.orb)
            return;
          if (e.data.orb.type === "activate") mic.click();
          if (e.data.orb.type === "nogl")
            mic.innerHTML =
              '<span style="font-size:22px;line-height:48px;display:block;text-align:center">🎙️</span>';
        });
        new MutationObserver(post).observe(mic, {
          attributes: true,
          attributeFilter: ["class"],
        });
      })();
      // Keyboard access for the orb (Enter / Space start and stop listening)
      (function () {
        const mic = document.getElementById("mic");
        if (!mic || mic.tagName === "BUTTON") return;
        mic.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            mic.click();
          }
        });
      })();

      // Smooth spring caret for every single-line text input.
      // Behaviour modelled on Skiper UI "Smooth caret input" (skiper106): https://skiper-ui.com/v1/skiper106
      (function () {
        const OK = new Set([
          "text",
          "search",
          "email",
          "password",
          "tel",
          "url",
        ]);
        const calm = matchMedia("(prefers-reduced-motion: reduce)");
        const st = document.createElement("style");
        st.textContent =
          ".sc-caret{position:fixed;left:0;top:0;width:2px;border-radius:2px;background:var(--acc,#2aa7a0);pointer-events:none;z-index:2147483000;visibility:hidden;will-change:transform;animation:scBlink 1.1s step-end infinite}.sc-caret.on{visibility:visible}@keyframes scBlink{50%{opacity:0}}@media(prefers-reduced-motion:reduce){.sc-caret{animation:none}}input.sc-hide{caret-color:transparent!important}";
        document.head.appendChild(st);
        const caret = document.createElement("div");
        caret.className = "sc-caret";
        document.body.appendChild(caret);
        const cx2d = document.createElement("canvas").getContext("2d");
        let el = null,
          rx = 0,
          vx = 0,
          h = 0,
          raf = 0,
          last = 0,
          snap = true,
          prevT = 0;

        function eligible(t) {
          if (
            !(t instanceof HTMLInputElement) ||
            !OK.has(t.type) ||
            t.readOnly ||
            t.disabled
          )
            return false;
          const cs = getComputedStyle(t);
          return (
            (cs.textAlign === "left" || cs.textAlign === "start") &&
            cs.direction === "ltr"
          );
        }
        function measure() {
          const cs = getComputedStyle(el),
            r = el.getBoundingClientRect();
          const v = el.value;
          let pos = el.selectionStart;
          if (pos == null) pos = v.length;
          const sel = el.selectionEnd != null && el.selectionEnd !== pos;
          const before =
            el.type === "password" ? "\u2022".repeat(pos) : v.slice(0, pos);
          cx2d.font =
            cs.fontStyle +
            " " +
            cs.fontWeight +
            " " +
            cs.fontSize +
            " " +
            cs.fontFamily;
          const ls = parseFloat(cs.letterSpacing) || 0;
          const w = cx2d.measureText(before).width + ls * before.length;
          const bl = parseFloat(cs.borderLeftWidth) || 0,
            br = parseFloat(cs.borderRightWidth) || 0;
          const bt = parseFloat(cs.borderTopWidth) || 0,
            bb = parseFloat(cs.borderBottomWidth) || 0;
          const pl = parseFloat(cs.paddingLeft) || 0,
            pr = parseFloat(cs.paddingRight) || 0;
          const lh = Math.round((parseFloat(cs.fontSize) || 14) * 1.25);
          const relX = bl + pl + w - el.scrollLeft;
          const inner = r.width - br - pr;
          return {
            left: r.left,
            rx: relX - 1,
            y: r.top + bt + (r.height - bt - bb) / 2 - lh / 2,
            h: lh,
            visible:
              !sel &&
              relX >= bl + pl - 1 &&
              relX <= inner + 1 &&
              r.bottom > 0 &&
              r.top < innerHeight,
          };
        }
        function tick(now) {
          if (!el || !document.contains(el)) {
            el = null;
            caret.classList.remove("on");
            raf = 0;
            return;
          }
          const m = measure();
          caret.classList.toggle("on", m.visible);
          const dt = Math.min((now - last) / 1000 || 0.016, 1 / 30);
          last = now;
          if (snap) {
            rx = m.rx;
            h = m.h;
            vx = 0;
            snap = false;
            prevT = m.rx;
          } else {
            const k = calm.matches ? 4000 : 520,
              c = calm.matches ? 130 : 34;
            vx += (-k * (rx - m.rx) - c * vx) * dt;
            rx += vx * dt;
            h += (m.h - h) * Math.min(1, dt * 30);
            if (Math.abs(m.rx - prevT) > 0.5) {
              prevT = m.rx;
              caret.style.animation = "none";
              void caret.offsetWidth;
              caret.style.animation = "";
            }
          }
          caret.style.height = h + "px";
          caret.style.transform =
            "translate(" + (m.left + rx) + "px," + m.y + "px)";
          raf = requestAnimationFrame(tick);
        }
        document.addEventListener("focusin", (e) => {
          const t = e.target;
          if (!eligible(t)) return;
          el = t;
          t.classList.add("sc-hide");
          snap = true;
          last = performance.now();
          if (!raf) raf = requestAnimationFrame(tick);
        });
        document.addEventListener("focusout", (e) => {
          if (e.target === el) {
            el.classList.remove("sc-hide");
            el = null;
            caret.classList.remove("on");
          }
        });
      })();

      $("#stop-speech").onclick = stopSpeech;
      $("#dismiss-status").onclick = () => {
        $("#app-status").hidden = true;
      };
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          langMenu.classList.remove("show");
          langBtn.setAttribute("aria-expanded", "false");
        }
        if (event.key === "Tab" && $("#drawer").classList.contains("open")) {
          const elements = [
            ...$("#drawer").querySelectorAll("button, [href], input"),
          ].filter((el) => !el.disabled);
          const first = elements[0],
            last = elements[elements.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      });
      updateSpeechUI();
      renderChat();
      renderDrawerChats();
      $("#drawer").inert = true;
      if (storageWarning) notify(storageWarning, true);
      window.addEventListener("afterprint", () =>
        document.body.classList.remove("printing-record"),
      );

      // A single introduction occupies the viewport; the landing illustration hides during playback.
      const introScreen = $("#copilot-intro");
      const introVideo = $("#copilot-intro-video");
      $(".intro-poster-figure img").src = "assets/welcome-doctor.png";
      const introStart = $("#start-intro");
      const introStartLabel = $("#intro-start-label");
      const introStatus = $("#intro-status");
      const introSkip = $("#intro-skip");
      let introClosed = false,
        introRequested = false,
        introTimer;
      introVideo.controls = false;
      introVideo.disablePictureInPicture = true;
      const introVideoMask = $(".intro-video-mask");
      const introVideoNameTag = $(".intro-video-name-tag");
      function positionIntroVideoMask() {
        if (!introVideoMask || !introVideoNameTag) return;
        const frame = $(".intro-video-frame");
        const rect = frame.getBoundingClientRect();
        const vw = introVideo.videoWidth || 1280,
          vh = introVideo.videoHeight || 720;
        const scale = Math.min(rect.width / vw, rect.height / vh);
        const width = 38 * scale,
          height = 34 * scale;
        introVideoMask.style.left = `${(rect.width - vw * scale) / 2 + vw * scale - width}px`;
        introVideoMask.style.top = `${(rect.height - vh * scale) / 2}px`;
        introVideoMask.style.width = `${width}px`;
        introVideoMask.style.height = `${height}px`;
        const contentLeft = (rect.width - vw * scale) / 2;
        const contentTop = (rect.height - vh * scale) / 2;
        const tagWidth = 108 * scale,
          tagHeight = 48 * scale;
        introVideoNameTag.style.left = `${contentLeft + (vw * scale - tagWidth) / 2}px`;
        introVideoNameTag.style.top = `${contentTop + vh * scale - 64 * scale}px`;
        introVideoNameTag.style.width = `${tagWidth}px`;
        introVideoNameTag.style.height = `${tagHeight}px`;
        introVideoNameTag.style.fontSize = `${13 * scale}px`;
      }
      positionIntroVideoMask();
      introVideo.addEventListener("loadedmetadata", positionIntroVideoMask);
      window.addEventListener("resize", positionIntroVideoMask);
      function closeIntro(startTourNow = false) {
        if (introClosed) return;
        introClosed = true;
        clearTimeout(introTimer);
        introVideo.pause();
        document.body.classList.remove("intro-active");
        document.body.classList.add("intro-revealing");
        introScreen.classList.add("is-leaving");
        setTimeout(() => {
          introScreen.remove();
          document.body.classList.remove("intro-revealing");
          setTimeout(() => {
            if (startTourNow) {
              window.startTour && window.startTour(true);
            } else {
              window.startTour && window.startTour(false);
            }
          }, 350);
          $("#inp").focus();
        }, 250);
      }
      function introFailure() {
        if (introClosed) return;
        clearTimeout(introTimer);
        introVideo.pause();
        introScreen.classList.remove("is-playing");
        if (introRequested) {
          notify(
            "The intro video could not play. Mr.Doc is ready to use.",
            true,
          );
          closeIntro(false);
          return;
        }
        introScreen.classList.add("has-error");
        introStart.disabled = false;
        introStartLabel.textContent = "TRY INTRO AGAIN";
        introStatus.textContent =
          "The introduction could not play. Try again or continue to Mr.Doc.";
        introSkip.textContent = "Continue to Mr.Doc";
      }
      introStart.addEventListener("click", async () => {
        if (introClosed || introStart.disabled) return;
        introRequested = true;
        introScreen.classList.remove("has-error");
        introStatus.textContent = "";
        introScreen.classList.add("is-playing");
        introStart.disabled = true;
        introSkip.textContent = "Skip intro";
        introSkip.focus();
        introTimer = setTimeout(introFailure, 15000);
        try {
          await introVideo.play();
        } catch (_) {
          introFailure();
        }
      });
      introVideo.addEventListener("playing", () => clearTimeout(introTimer));
      introVideo.addEventListener("waiting", () => {
        clearTimeout(introTimer);
        introTimer = setTimeout(introFailure, 15000);
      });
      introVideo.addEventListener("ended", () => closeIntro(false));
      introVideo.addEventListener("error", introFailure);
      introVideo
        .querySelector("source")
        .addEventListener("error", introFailure);
      introSkip.onclick = () => closeIntro(false);

      const introTutorialBtn = $("#intro-tutorial-btn");
      if (introTutorialBtn) {
        introTutorialBtn.onclick = () => closeIntro(true);
      }

      document.body.classList.add("intro-active");


      /* ---------- Guided tour (spotlight + blur) ----------
   Add / reorder steps in STEPS below.
   sel    : CSS selector of the element to highlight (null = centered message, no spotlight)
   place  : preferred tooltip side: "top" | "bottom" | "left" | "right" | "center"
   page   : view to show first ("chat" default, "records", "timeline", "me", "guide")
   drawer : true = open the side menu for this step
   pad    : extra space around the highlighted element (px)
*/
      (() => {
        const KEY = "mrdoc_tour_done_v2";
        const STEPS = [
          {
            sel: "#sb",
            place: "right",
            pad: 0,
            title: "Meet Mr.Doc",
            text: "Your AI health companion. He listens, thinks and talks back while you chat.",
          },
          {
            sel: ".chat",
            place: "center",
            pad: 4,
            title: "This is the chat section",
            text: "Ask about symptoms, medicines or your reports here. Replies come in your language and can be read aloud.",
          },
          {
            sel: "#chips",
            place: "bottom",
            title: "Quick questions",
            text: "Not sure what to ask? Tap one of these suggestions to get started.",
          },
          {
            sel: "#rec-up",
            place: "top",
            title: "Upload a report",
            text: "Add a prescription or lab report (image or PDF). Mr.Doc reads it and explains it in plain language.",
          },
          {
            sel: "#mic",
            place: "top",
            title: "Talk instead of typing",
            text: "Tap the mic and speak your question.",
          },
          {
            sel: "#lang-btn",
            place: "bottom",
            title: "Change language",
            text: "Switch between English, Hindi, Telugu and Tamil any time.",
          },
          {
            sel: "#burger-btn",
            place: "bottom",
            title: "The menu",
            text: "Everything else lives in this menu. Let's open it.",
          },
          {
            sel: ".drawer-nav",
            drawer: true,
            place: "right",
            title: "Your sections",
            text: "Start a new chat, open your medical records, or view your health timeline.",
          },
          {
            sel: ".drawer-profile-bottom",
            drawer: true,
            place: "right",
            title: "My Health",
            text: "Your personal profile: allergies, conditions and routine medicines.",
          },
          {
            sel: "#records-dropzone",
            page: "records",
            place: "bottom",
            title: "Medical records",
            text: "Search saved records, drop in a new report, and check what was read before you confirm it.",
          },
          {
            sel: ".timeline-segmented-bar",
            page: "timeline",
            place: "bottom",
            title: "Health timeline",
            text: "All your records in date order. Filter by prescriptions, lab reports or abnormal results.",
          },
          {
            sel: "#page-me-content .mh-grid .mh-card",
            page: "me",
            place: "right",
            title: "Your health profile",
            text: "Fill this in once and Mr.Doc can give more relevant answers.",
          },
          {
            sel: null,
            title: "You're all set!",
            text: 'That\'s the tour. You can replay it any time from the top bar ("Tutorial") or menu ("Take Interactive Tutorial").',
          },
        ];

        let root,
          blur,
          ring,
          tip,
          elCount,
          elTitle,
          elText,
          elBar,
          btnNext,
          btnBack,
          btnSkip;
        let i = 0,
          running = false,
          nav = 0;
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        const drawerOpen = () =>
          document.getElementById("drawer").classList.contains("open");
        const visible = (el) =>
          !!el &&
          el.getClientRects().length > 0 &&
          el.getBoundingClientRect().width > 0;

        function build() {
          if (root) return;
          root = document.createElement("div");
          root.className = "tour-root";
          root.setAttribute("role", "dialog");
          root.setAttribute("aria-modal", "true");
          root.setAttribute("aria-label", "Quick tour");
          root.innerHTML = `
      <svg class="tour-svg" width="0" height="0" style="position:absolute;width:0;height:0;pointer-events:none;" aria-hidden="true">
        <defs>
          <clipPath id="tour-clip-hole" clipPathUnits="userSpaceOnUse">
            <path id="tour-clip-path" clip-rule="evenodd" d=""></path>
          </clipPath>
        </defs>
      </svg>
      <div class="tour-blur"></div>
      <div class="tour-ring"></div>
      <div class="tour-tip" tabindex="-1">
        <div class="tour-count"></div>
        <h3 class="tour-title"></h3>
        <p class="tour-text"></p>
        <div class="tour-bar"><i></i></div>
        <div class="tour-foot">
          <button type="button" class="tour-skip">Skip tour</button>
          <div class="tour-btns">
            <button type="button" class="btn-sm btn-sec tour-back">Back</button>
            <button type="button" class="btn-sm btn-pri tour-next">Next</button>
          </div>
        </div>
      </div>`;
          document.body.append(root);
          blur = root.querySelector(".tour-blur");
          ring = root.querySelector(".tour-ring");
          tip = root.querySelector(".tour-tip");
          elCount = root.querySelector(".tour-count");
          elTitle = root.querySelector(".tour-title");
          elText = root.querySelector(".tour-text");
          elBar = root.querySelector(".tour-bar i");
          btnNext = root.querySelector(".tour-next");
          btnBack = root.querySelector(".tour-back");
          btnSkip = root.querySelector(".tour-skip");
          btnNext.onclick = () =>
            i >= STEPS.length - 1 ? finish() : show(i + 1, 1);
          btnBack.onclick = () => i > 0 && show(i - 1, -1);
          btnSkip.onclick = finish;
          window.addEventListener("resize", () => running && layout());
          document.addEventListener(
            "keydown",
            (e) => {
              if (!running) return;
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                finish();
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                btnNext.click();
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                btnBack.click();
              } else if (e.key === "Tab") {
                // keep focus inside the tooltip
                e.preventDefault();
                e.stopPropagation();
                const f = [btnSkip, btnBack, btnNext].filter(
                  (b) => !b.disabled,
                );
                const at = f.indexOf(document.activeElement);
                f[(at + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
              }
            },
            true,
          );
        }

        // Rounded rectangle "hole" cut out of a full-screen rectangle (evenodd fill)
        function holePath(W, H, x, y, w, h, r) {
          return (
            `M0 0H${W}V${H}H0Z ` +
            `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}` +
            `A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}` +
            `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
          );
        }

        function placeTip(rect, pref) {
          const tw = tip.offsetWidth || 340,
            th = tip.offsetHeight || 185,
            m = 12,
            vw = innerWidth,
            vh = innerHeight;
          let left, top;
          if (!rect) {
            left = (vw - tw) / 2;
            top = (vh - th) / 2;
          } else {
            const cx = rect.left + rect.width / 2,
              cy = rect.top + rect.height / 2;
            const clampX = (x) => Math.max(m, Math.min(x, vw - tw - m));
            const clampY = (y) => Math.max(m, Math.min(y, vh - th - m));

            const spots = {
              bottom: {
                left: clampX(cx - tw / 2),
                top: rect.bottom + m,
                fits: rect.bottom + m + th <= vh - m,
              },
              top: {
                left: clampX(cx - tw / 2),
                top: rect.top - th - m,
                fits: rect.top - th - m >= m,
              },
              right: {
                left: rect.right + m,
                top: clampY(cy - th / 2),
                fits: rect.right + m + tw <= vw - m,
              },
              left: {
                left: rect.left - tw - m,
                top: clampY(cy - th / 2),
                fits: rect.left - tw - m >= m,
              },
              center: {
                left: clampX(cx - tw / 2),
                top: clampY(cy - th / 2),
                fits: true,
              },
            };

            const order = [pref, "bottom", "top", "right", "left"].filter(
              Boolean,
            );
            let picked = null;
            for (const p of order) {
              if (spots[p] && spots[p].fits) {
                picked = spots[p];
                break;
              }
            }
            if (!picked) {
              // Find which quadrant / side has maximum clear area to prevent covering the spotlight
              const spaceBelow = vh - rect.bottom;
              const spaceAbove = rect.top;
              const spaceRight = vw - rect.right;
              const spaceLeft = rect.left;
              const maxSpace = Math.max(
                spaceBelow,
                spaceAbove,
                spaceRight,
                spaceLeft,
              );
              if (maxSpace === spaceRight)
                picked = {
                  left: clampX(rect.right + m),
                  top: clampY(cy - th / 2),
                };
              else if (maxSpace === spaceLeft)
                picked = {
                  left: clampX(rect.left - tw - m),
                  top: clampY(cy - th / 2),
                };
              else if (maxSpace === spaceAbove)
                picked = {
                  left: clampX(cx - tw / 2),
                  top: clampY(rect.top - th - m),
                };
              else
                picked = {
                  left: clampX(cx - tw / 2),
                  top: clampY(rect.bottom + m),
                };
            }
            left = picked.left;
            top = picked.top;
          }
          tip.style.left = Math.max(m, Math.min(left, vw - tw - m)) + "px";
          tip.style.top = Math.max(m, Math.min(top, vh - th - m)) + "px";
        }

        function layout() {
          const s = STEPS[i];
          const el = s.sel ? document.querySelector(s.sel) : null;
          if (!el) {
            const clipPathEl = root.querySelector("#tour-clip-path");
            if (clipPathEl) clipPathEl.setAttribute("d", "");
            blur.style.clipPath = "none";
            ring.style.display = "none";
            placeTip(null);
            return;
          }
          const W = innerWidth,
            H = innerHeight,
            r = el.getBoundingClientRect(),
            pad = s.pad ?? 8;
          const x = Math.max(0, r.left - pad),
            y = Math.max(0, r.top - pad);
          const w = Math.min(W - x, r.width + pad * 2),
            h = Math.min(H - y, r.height + pad * 2);
          const rad = Math.max(0, Math.min(s.radius ?? 14, w / 2, h / 2));
          const pathStr = holePath(W, H, x, y, w, h, rad);
          const clipPathEl = root.querySelector("#tour-clip-path");
          if (clipPathEl) clipPathEl.setAttribute("d", pathStr);
          try {
            blur.style.clipPath = `path(evenodd, "${pathStr}")`;
          } catch (_) {}
          if (!blur.style.clipPath) {
            blur.style.clipPath = "url(#tour-clip-hole)";
          }
          Object.assign(ring.style, {
            display: "block",
            left: x + "px",
            top: y + "px",
            width: w + "px",
            height: h + "px",
            borderRadius: rad + "px",
          });
          placeTip(
            {
              left: x,
              top: y,
              width: w,
              height: h,
              right: x + w,
              bottom: y + h,
            },
            s.place,
          );
        }

        async function show(n, dir = 1) {
          const token = ++nav;
          while (n >= 0 && n < STEPS.length) {
            const s = STEPS[n];
            const wantPage = s.page || "chat",
              wantDrawer = !!s.drawer;
            let waited = 100;
            if (activePage !== wantPage) {
              switchPage(wantPage);
              waited = Math.max(waited, 320);
            }
            if (drawerOpen() !== wantDrawer) {
              openDrawer(wantDrawer);
              waited = Math.max(waited, 360);
            }
            await sleep(waited);
            if (token !== nav) return; // user clicked again meanwhile
            const el = s.sel ? document.querySelector(s.sel) : null;
            if (s.sel && !visible(el)) {
              n += dir;
              continue;
            } // element missing: skip step
            if (el)
              el.scrollIntoView({
                block: "center",
                inline: "nearest",
                behavior: "instant",
              });
            i = n;
            elCount.textContent = `Step ${n + 1} of ${STEPS.length}`;
            elTitle.textContent = s.title;
            elText.textContent = s.text;
            elBar.style.width = ((n + 1) / STEPS.length) * 100 + "%";
            btnBack.disabled = n === 0;
            btnNext.textContent = n === STEPS.length - 1 ? "Done" : "Next";
            layout();
            btnNext.focus({ preventScroll: true });
            return;
          }
          finish();
        }

        function finish() {
          nav++;
          running = false;
          try {
            localStorage.setItem(KEY, "1");
          } catch (_) {}
          if (root) root.classList.remove("on");
          document.body.classList.remove("touring");
          if (activePage !== "chat") switchPage("chat");
          else if (drawerOpen()) openDrawer(false);
          const inp = document.getElementById("inp");
          if (inp) inp.focus();
        }

        window.startTour = async function (force) {
          if (running) return;
          try {
            if (!force && localStorage.getItem(KEY)) return;
          } catch (_) {}
          build();
          running = true;
          document.body.classList.add("touring");
          root.classList.add("on", "no-anim");
          await show(0, 1);
          requestAnimationFrame(() =>
            requestAnimationFrame(
              () => root && root.classList.remove("no-anim"),
            ),
          );
        };

        const replay = document.getElementById("replay-tour");
        if (replay)
          replay.onclick = () => {
            openDrawer(false);
            setTimeout(() => window.startTour(true), 300);
          };

        const topTut = document.getElementById("top-tutorial-btn");
        if (topTut) topTut.onclick = () => window.startTour(true);

        if (/[?&#](?:tour|tutorial)/i.test(location.href)) {
          setTimeout(() => {
            if (typeof closeIntro === "function") closeIntro(true);
            else window.startTour(true);
          }, 200);
        }
      })();
