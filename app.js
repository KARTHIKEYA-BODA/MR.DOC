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
        abhaCardEndpoint: window.location.protocol === "file:" ? "http://localhost:8000/api/analyze-abha" : "/api/analyze-abha",
        translateEndpoint: window.location.protocol === "file:" ? "http://localhost:8000/api/translate-record" : "/api/translate-record",
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

      const UI_TEXT = {
        en: {
          tutorial: "Tutorial", recentChats: "Recent chats", newChat: "New chat", records: "Medical records",
          timeline: "Health timeline", bodyCheck: "Full Body Check", bodyCheckHint: "See marked health areas",
          details: "Health details", guidance: "Health guidance", myHealth: "My Health", uploadReport: "Upload report",
          takePhoto: "Take photo", backChat: "Back to chat", backHealth: "Back to My Health",
          welcome: "How can I help you today?", welcomeNote: "Ask a health question or upload a report to understand it in simple language.",
          bodyTitle: "Full Body Check", bodyIntro: "Health areas found in your uploaded records are shown here.",
          noBody: "No body area has been identified in your uploaded records yet.", wholeBody: "Whole-body condition",
          locationUnknown: "No single injury location was recorded.", recordSource: "From uploaded record", openRecord: "Open record",
          front: "Front", side: "Side", back: "Back", rotateHint: "Use the arrows to see another side.", myHealthTitle: "My Health",
        },
        hi: {
          tutorial: "ट्यूटोरियल", recentChats: "हाल की चैट", newChat: "नई चैट", records: "मेडिकल रिकॉर्ड",
          timeline: "स्वास्थ्य समयरेखा", bodyCheck: "पूरे शरीर की जाँच", bodyCheckHint: "चिह्नित स्वास्थ्य क्षेत्र देखें",
          details: "स्वास्थ्य विवरण", guidance: "स्वास्थ्य मार्गदर्शन", myHealth: "मेरा स्वास्थ्य", uploadReport: "रिपोर्ट अपलोड करें",
          takePhoto: "फोटो लें", backChat: "चैट पर वापस", backHealth: "मेरा स्वास्थ्य पर वापस",
          welcome: "मैं आज आपकी कैसे मदद कर सकता हूँ?", welcomeNote: "स्वास्थ्य प्रश्न पूछें या रिपोर्ट अपलोड करके उसे सरल भाषा में समझें।",
          bodyTitle: "पूरे शरीर की जाँच", bodyIntro: "आपके अपलोड किए रिकॉर्ड में मिले स्वास्थ्य क्षेत्र यहाँ दिखाए जाते हैं।",
          noBody: "आपके रिकॉर्ड में अभी कोई शरीर का क्षेत्र नहीं मिला।", wholeBody: "पूरे शरीर से जुड़ी स्थिति",
          locationUnknown: "कोई एक चोट का स्थान दर्ज नहीं है।", recordSource: "अपलोड किए रिकॉर्ड से", openRecord: "रिकॉर्ड खोलें",
          front: "सामने", side: "बगल", back: "पीछे", rotateHint: "दूसरी ओर देखने के लिए तीर दबाएँ।", myHealthTitle: "मेरा स्वास्थ्य",
        },
        te: {
          tutorial: "ట్యుటోరియల్", recentChats: "ఇటీవలి చాట్‌లు", newChat: "కొత్త చాట్", records: "వైద్య రికార్డులు",
          timeline: "ఆరోగ్య కాలక్రమం", bodyCheck: "పూర్తి శరీర పరిశీలన", bodyCheckHint: "గుర్తించిన ఆరోగ్య ప్రాంతాలు చూడండి",
          details: "ఆరోగ్య వివరాలు", guidance: "ఆరోగ్య మార్గదర్శకం", myHealth: "నా ఆరోగ్యం", uploadReport: "రిపోర్ట్ అప్‌లోడ్",
          takePhoto: "ఫోటో తీయండి", backChat: "చాట్‌కు తిరిగి", backHealth: "నా ఆరోగ్యానికి తిరిగి",
          welcome: "ఈ రోజు నేను మీకు ఎలా సహాయపడగలను?", welcomeNote: "ఆరోగ్య ప్రశ్న అడగండి లేదా రిపోర్ట్‌ను సులభంగా అర్థం చేసుకోవడానికి అప్‌లోడ్ చేయండి.",
          bodyTitle: "పూర్తి శరీర పరిశీలన", bodyIntro: "మీరు అప్‌లోడ్ చేసిన రికార్డుల్లో ఉన్న ఆరోగ్య ప్రాంతాలు ఇక్కడ కనిపిస్తాయి.",
          noBody: "మీ రికార్డుల్లో ఇంకా శరీర ప్రాంతం గుర్తించబడలేదు.", wholeBody: "మొత్తం శరీరానికి సంబంధించిన పరిస్థితి",
          locationUnknown: "ఒకే గాయం ప్రాంతం నమోదు కాలేదు.", recordSource: "అప్‌లోడ్ చేసిన రికార్డు నుండి", openRecord: "రికార్డు తెరవండి",
          front: "ముందు", side: "పక్క", back: "వెనుక", rotateHint: "మరో వైపు చూడటానికి బాణాలను ఉపయోగించండి.", myHealthTitle: "నా ఆరోగ్యం",
        },
        ta: {
          tutorial: "வழிகாட்டி", recentChats: "சமீபத்திய உரையாடல்கள்", newChat: "புதிய உரையாடல்", records: "மருத்துவ பதிவுகள்",
          timeline: "உடல்நல காலவரிசை", bodyCheck: "முழு உடல் பரிசோதனை", bodyCheckHint: "குறிக்கப்பட்ட உடல் பகுதிகளைப் பார்க்கவும்",
          details: "உடல்நல விவரங்கள்", guidance: "உடல்நல வழிகாட்டல்", myHealth: "என் உடல்நலம்", uploadReport: "அறிக்கையை பதிவேற்று",
          takePhoto: "படம் எடுக்கவும்", backChat: "உரையாடலுக்கு திரும்பு", backHealth: "என் உடல்நலத்திற்கு திரும்பு",
          welcome: "இன்று நான் உங்களுக்கு எப்படி உதவலாம்?", welcomeNote: "உடல்நல கேள்வி கேளுங்கள் அல்லது அறிக்கையை எளிய மொழியில் புரிந்துகொள்ள பதிவேற்றுங்கள்.",
          bodyTitle: "முழு உடல் பரிசோதனை", bodyIntro: "நீங்கள் பதிவேற்றிய மருத்துவ பதிவுகளில் உள்ள உடல் பகுதிகள் இங்கே காட்டப்படும்.",
          noBody: "உங்கள் பதிவுகளில் இன்னும் எந்த உடல் பகுதியும் கண்டறியப்படவில்லை.", wholeBody: "முழு உடலைச் சார்ந்த நிலை",
          locationUnknown: "ஒரு குறிப்பிட்ட காய இடம் பதிவு செய்யப்படவில்லை.", recordSource: "பதிவேற்றிய பதிவிலிருந்து", openRecord: "பதிவைத் திற",
          front: "முன்", side: "பக்கம்", back: "பின்", rotateHint: "மற்றொரு பக்கத்தைப் பார்க்க அம்புகளைப் பயன்படுத்தவும்.", myHealthTitle: "என் உடல்நலம்",
        },
      };
      const tr = (key) => UI_TEXT[S.lang]?.[key] || UI_TEXT.en[key] || key;
      const UI_REPLACE = {
        hi: {
          "Your medical records": "आपके मेडिकल रिकॉर्ड", "Search your records": "अपने रिकॉर्ड खोजें", "Your uploaded records will appear here.": "आपके अपलोड किए रिकॉर्ड यहाँ दिखाई देंगे।",
          "Add a medical record": "मेडिकल रिकॉर्ड जोड़ें", "Choose file": "फ़ाइल चुनें", "Take photo": "फोटो लें", "Unified Health Timeline": "एकीकृत स्वास्थ्य समयरेखा",
          "All Records": "सभी रिकॉर्ड", "Prescriptions": "पर्चे", "Lab Reports": "लैब रिपोर्ट", "Needs Attention": "ध्यान देने योग्य", "Ask Mr.Doc": "Mr.Doc से पूछें",
          "Upload or view reports": "रिपोर्ट अपलोड करें या देखें", "View timeline": "समयरेखा देखें", "Personal details": "व्यक्तिगत विवरण", "Edit": "संपादित करें",
          "Recorded conditions": "दर्ज स्थितियाँ", "Needs attention": "ध्यान देने योग्य", "Recorded medicines": "दर्ज दवाएँ", "Recent records": "हाल के रिकॉर्ड",
          "Health details & progress": "स्वास्थ्य विवरण और प्रगति", "Health details": "स्वास्थ्य विवरण", "Save Profile": "प्रोफ़ाइल सहेजें", "Records": "रिकॉर्ड", "Medicines": "दवाएँ", "Out of range": "सीमा से बाहर",
        },
        te: {
          "Your medical records": "మీ వైద్య రికార్డులు", "Search your records": "మీ రికార్డులను వెతకండి", "Your uploaded records will appear here.": "మీరు అప్‌లోడ్ చేసిన రికార్డులు ఇక్కడ కనిపిస్తాయి.",
          "Add a medical record": "వైద్య రికార్డు జోడించండి", "Choose file": "ఫైల్ ఎంచుకోండి", "Take photo": "ఫోటో తీయండి", "Unified Health Timeline": "ఏకీకృత ఆరోగ్య కాలక్రమం",
          "All Records": "అన్ని రికార్డులు", "Prescriptions": "ప్రిస్క్రిప్షన్లు", "Lab Reports": "ల్యాబ్ రిపోర్టులు", "Needs Attention": "శ్రద్ధ అవసరం", "Ask Mr.Doc": "Mr.Doc‌ను అడగండి",
          "Upload or view reports": "రిపోర్టులు అప్‌లోడ్ చేయండి లేదా చూడండి", "View timeline": "కాలక్రమం చూడండి", "Personal details": "వ్యక్తిగత వివరాలు", "Edit": "సవరించండి",
          "Recorded conditions": "నమోదైన పరిస్థితులు", "Needs attention": "శ్రద్ధ అవసరం", "Recorded medicines": "నమోదైన మందులు", "Recent records": "ఇటీవలి రికార్డులు",
          "Health details & progress": "ఆరోగ్య వివరాలు మరియు పురోగతి", "Health details": "ఆరోగ్య వివరాలు", "Save Profile": "ప్రొఫైల్ సేవ్ చేయండి", "Records": "రికార్డులు", "Medicines": "మందులు", "Out of range": "పరిధి వెలుపల",
        },
        ta: {
          "Your medical records": "உங்கள் மருத்துவ பதிவுகள்", "Search your records": "உங்கள் பதிவுகளைத் தேடுங்கள்", "Your uploaded records will appear here.": "நீங்கள் பதிவேற்றிய பதிவுகள் இங்கே தோன்றும்.",
          "Add a medical record": "மருத்துவ பதிவைச் சேர்க்கவும்", "Choose file": "கோப்பைத் தேர்ந்தெடு", "Take photo": "படம் எடுக்கவும்", "Unified Health Timeline": "ஒருங்கிணைந்த உடல்நல காலவரிசை",
          "All Records": "அனைத்து பதிவுகள்", "Prescriptions": "மருந்துச் சீட்டுகள்", "Lab Reports": "ஆய்வக அறிக்கைகள்", "Needs Attention": "கவனம் தேவை", "Ask Mr.Doc": "Mr.Doc-ஐ கேளுங்கள்",
          "Upload or view reports": "அறிக்கைகளை பதிவேற்றவும் அல்லது பார்க்கவும்", "View timeline": "காலவரிசையைப் பார்க்கவும்", "Personal details": "தனிப்பட்ட விவரங்கள்", "Edit": "திருத்து",
          "Recorded conditions": "பதிவான நிலைகள்", "Needs attention": "கவனம் தேவை", "Recorded medicines": "பதிவான மருந்துகள்", "Recent records": "சமீபத்திய பதிவுகள்",
          "Health details & progress": "உடல்நல விவரங்கள் மற்றும் முன்னேற்றம்", "Health details": "உடல்நல விவரங்கள்", "Save Profile": "சுயவிவரத்தைச் சேமி", "Records": "பதிவுகள்", "Medicines": "மருந்துகள்", "Out of range": "வரம்புக்கு வெளியே",
        },
      };
      const originalUiText = new WeakMap();
      function applyInterfaceLanguage() {
        document.documentElement.lang = S.lang;
        document.querySelectorAll("[data-i18n]").forEach((node) => {
          const text = tr(node.dataset.i18n);
          if (text) node.textContent = text;
        });
        const input = $("#inp");
        if (input) input.placeholder = ({ en: "Ask Mr.Doc about symptoms or medical records…", hi: "लक्षणों या मेडिकल रिकॉर्ड के बारे में पूछें…", te: "లక్షణాలు లేదా వైద్య రికార్డుల గురించి అడగండి…", ta: "அறிகுறிகள் அல்லது மருத்துவ பதிவுகள் பற்றி கேளுங்கள்…" })[S.lang];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          let source = originalUiText.get(node);
          const current = node.nodeValue.trim();
          if (!source && (UI_REPLACE.hi[current] || UI_REPLACE.te[current] || UI_REPLACE.ta[current])) {
            source = current;
            originalUiText.set(node, source);
          }
          if (!source) continue;
          const replacement = S.lang === "en" ? source : UI_REPLACE[S.lang]?.[source] || source;
          node.nodeValue = node.nodeValue.replace(current, replacement);
        }
      }

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
          "patientAge",
          "patientGender",
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
        record.importedFromFile = value.importedFromFile === true;
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
              "reviewReason",
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
              entry.userVerified = Boolean(x.userVerified);
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
              }
              entry.needsReview =
                Boolean(x.needsReview) ||
                (!!entry.sourceText &&
                  !entry.userVerified && (entry.ocrConfidence !== null && entry.ocrConfidence < 70)) ||
                (!!entry.sourceText && !entry.name && key === "medicines");
              return entry;
            })
            .filter(
              (x) => x.name || x.test || (key === "medicines" && x.sourceText),
            );
        }
        record.verbatimTranscription = stringValue(value.verbatimTranscription);
        record.secondaryOcrText = stringValue(value.secondaryOcrText).slice(0, 60000);
        record.ocrReaders = strings(value.ocrReaders).filter((reader) => ["Gemini Vision", "Unlimited-OCR"].includes(reader));
        record.secondaryOcrStatus = ["used", "unavailable", "pdf_unavailable", "page_limit", "not_configured"].includes(value.secondaryOcrStatus) ? value.secondaryOcrStatus : "";
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
        record.reviewRequired = Boolean(value.reviewRequired) || record.reviewItems.length > 0 || record.medicines.some((medicine) => medicine.needsReview) || record.labTests.some((test) => test.needsReview) || /\[unclear\]/i.test(record.verbatimTranscription);
        record.imageQuality = ["good", "fair", "poor"].includes(
          value.imageQuality,
        )
          ? value.imageQuality
          : "unknown";
        record.sourceLanguages = strings(value.sourceLanguages)
          .filter((language) => ["en", "hi", "te", "ta", "other"].includes(language))
          .slice(0, 5);
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
      delete S.abha;
      S.voice = S.voice !== false;
      S.readerMode = S.readerMode === true;
      document.body.classList.toggle("reader-mode", S.readerMode);
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
        window.MrDocStage?.setExpression(k);
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
        window.MrDocStage?.greet();
        return c;
      }

      // Unified Health Profile text helper
      function profText() {
        const p = S.profile,
          o = [];
        for (const [k, l] of [
          ["name", "Name"],
          ["age", "Age"],
          ["gender", "Sex recorded in profile"],
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
              (r) => `${r.recordType} (${r.date}): ${r.diagnoses.join(", ")}${r.patientAge ? "; age printed in record: " + r.patientAge : ""}${r.patientGender ? "; sex printed in record: " + r.patientGender : ""}`,
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

        if (!c || !c.msgs.length) {
          const welcome = document.createElement("div");
          welcome.className = "chat-empty-state";
          welcome.innerHTML = `<strong>${esc(tr("welcome"))}</strong><span>${esc(tr("welcomeNote"))}</span>`;
          $("#msgs").appendChild(welcome);
        }

        // Keep the welcome prompt separate from the conversation history.
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
        applyInterfaceLanguage();
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

      let returnPage = "chat";
      function switchPage(page, options = {}) {
        if (!$(`#view-${page}`)) return;
        cancelPendingChat();
        stopSpeech();
        if (page !== activePage && !options.fromBack) returnPage = activePage;
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
          const back = $("#btn-back-chat");
          back.dataset.target = returnPage === "me" ? "me" : "chat";
          back.textContent = `← ${tr(returnPage === "me" ? "backHealth" : "backChat")}`;
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
        else if (activePage === "me") renderProfilePage();
        else if (activePage === "guide") renderGuidePage();
        else if (activePage === "details") renderHealthDetailsPage();
        else if (activePage === "body") renderBodyMapPage();
        applyInterfaceLanguage();
      }

      // ---------------------------------------------------------------------------
      // Full Page Views (Spacious, Clear, Perfect Alignment)
      // ---------------------------------------------------------------------------

      function renderHealthDetailsPage() {
        const el = $("#page-details-content");
        if (!el) return;
        const record = S.records.find((r) => r.id === S.curRecord && !isDemo(r));
        const localToday = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        const medicineEntries = personalRecords().flatMap((r) =>
          (r.medicines || []).map((medicine, index) => ({ record: r, medicine, index })),
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
          const label = recordItem.injuryDescription || recordItem.diagnoses.join(" · ");
          const map = anatomyImage(recordItem);
          const severity = recordItem.documentedSeverity;
          const started = recordItem.injuryStartDate;
          const days = started ? daysSince(started) : null;
          const isInjury = Boolean(recordItem.injuryDescription);
          return `<article class="health-item-card ${progress?.healed ? "is-healed" : ""}">
            ${map ? `<div class="health-item-visual">${map}${severity ? `<span class="severity-pill severity-${severity}">${severity === "serious" ? "Serious" : severity === "medium" ? "Medium" : "Low"} · stated in record</span>` : ""}</div>` : ""}
            <div class="health-item-copy"><span class="health-source-tag">From uploaded record · ${esc(recordItem.date || "date not shown")}</span><h3>${esc(label || "Health concern")}</h3>${recordItem.bodySite ? `<p><b>Area:</b> ${esc(recordItem.bodySite)}</p>` : ""}${recordItem.cause ? `<p><b>Cause stated:</b> ${esc(recordItem.cause)}</p>` : ""}${severity ? `<p><b>Severity stated:</b> ${esc(severity)}</p>` : ""}<p><b>Started:</b> ${started ? `${esc(started)}${days === null ? "" : ` · ${days} day${days === 1 ? "" : "s"} tracked`}` : "Not stated in this upload"}</p>${isInjury ? `<div class="healing-status">${progress?.healed ? "Marked healed by you" : "In progress · based on your update"}</div><button class="btn-sm ${progress?.healed ? "btn-sec" : "btn-pri"}" type="button" data-healed="${esc(recordItem.id)}">${progress?.healed ? "Mark in progress" : "Mark as healed"}</button>` : ""}<button class="btn-sm btn-sec" type="button" data-record-open="${esc(recordItem.id)}">View full result</button></div>
          </article>`;
        }).join("");
        const medicineCards = medicineEntries.map(({ record: r, medicine: m, index }) => {
          const confirmed = r.medicinesConfirmed && m.userVerified && !m.needsReview && m.name && m.name.toLowerCase() !== "illegible";
          const times = confirmed ? S.reminders.filter((x) => x.recordId === r.id && x.medicineIndex === index).map((x) => x.time) : [];
          const schedule = [m.strength || m.dosage, m.form, m.frequency, m.timing, m.duration, m.instructions].filter(Boolean).join(" · ");
          const source = `${r.title || r.recordType || "Prescription"}${r.date ? ` · ${r.date}` : " · date not shown"}`;
          const status = r.confirmedByUserAt && confirmed ? "Reviewed by you" : confirmed ? "Read clearly · verify with your clinician" : "Needs review";
          return `<article class="reminder-row medication-entry ${confirmed ? "is-confirmed" : "needs-review"}"><div class="medication-entry-head"><b>${esc(m.name && m.name.toLowerCase() !== "illegible" ? m.name : "Medicine name unclear")}</b><span class="medication-status ${confirmed ? "confirmed" : "review"}">${esc(status)}</span></div><small>${esc(schedule || "Dose, timing, or other instructions not stated in the upload.")}</small>${m.sourceText || m.rawText ? `<small class="medication-source">As written: ${esc(m.sourceText || m.rawText)}</small>` : ""}<small class="medication-source">From ${esc(source)}</small>${times.length ? `<small class="reminder-caveat">Reminder: ${esc(times.join(", "))} while Mr.Doc is open</small>` : confirmed ? `<small class="reminder-caveat">No exact clock time was stated; no time-based reminder is set.</small>` : `<button class="btn-sm btn-sec medication-review-button" type="button" data-med-review-record="${esc(r.id)}">Review this prescription</button>`}</article>`;
        }).join("");
        const visitRecords = personalRecords()
          .slice()
          .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        const visitRecordRows = visitRecords.slice(0, 8).map((r) =>
          `<li><b>${esc(r.date || "Date not shown")}</b> · ${esc(r.recordType || "Medical record")}: ${esc(r.title || "Untitled record")}${r.facility ? ` · ${esc(r.facility)}` : ""}${r.diagnoses?.length ? `<br><span>Conditions written in record: ${esc(r.diagnoses.join(", "))}</span>` : ""}</li>`,
        ).join("");
        const visitMedicines = visitRecords.flatMap((r) =>
          (r.medicines || [])
            .filter((m) => r.medicinesConfirmed && m.userVerified && !m.needsReview && m.name && m.name.toLowerCase() !== "illegible")
            .map((m) => `<li><b>${esc(m.name)}</b>${m.strength || m.dosage ? ` · ${esc(m.strength || m.dosage)}` : ""}${[m.frequency, m.timing, m.duration].filter(Boolean).length ? ` · ${esc([m.frequency, m.timing, m.duration].filter(Boolean).join(" · "))}` : ""}<br><span>${r.confirmedByUserAt ? "Reviewed by you" : "Read clearly by OCR"} · ${esc(r.title || r.recordType || "uploaded record")}${r.date ? ` · ${esc(r.date)}` : " · date not shown"}</span></li>`),
        ).slice(0, 12).join("");
        const visitLabs = visitRecords.flatMap((r) =>
          (r.labTests || []).filter((t) => !t.needsReview).map((t) => ({ record: r, test: t })),
        ).slice(0, 16).map(({ record: r, test: t }) =>
          `<li><b>${esc(t.test || "Test")}</b>: ${esc([t.value, t.unit].filter(Boolean).join(" ") || "Value not available")}${t.status && t.status !== "UNKNOWN" ? ` · ${esc(t.status)} as recorded` : ""}<br><span>${esc(r.date || "Date not shown")} · ${esc(r.title || r.recordType || "Uploaded record")}${t.referenceRange ? ` · Reference range as printed: ${esc(t.referenceRange)}` : ""}</span></li>`,
        ).join("");
        const visitSummaryHtml = `<section class="doctor-visit-summary" id="doctor-visit-summary" aria-labelledby="doctor-visit-summary-title">
          <div class="doctor-visit-summary-toolbar"><div><h2 id="doctor-visit-summary-title">Doctor visit summary</h2><p>Prepared from your uploaded records. Check it before sharing.</p></div><button class="btn-sm btn-pri" type="button" id="print-visit-summary" ${visitRecords.length ? "" : "disabled"}>Print summary</button></div>
          <div class="doctor-visit-summary-sheet"><header><h2>Health record summary</h2><p>Generated ${new Date().toLocaleDateString()}</p></header>
            ${S.profile?.name ? `<p><b>Profile name:</b> ${esc(S.profile.name)}</p>` : ""}
            ${S.profile?.abhaNumber ? `<p><b>ABHA number (saved locally, unverified):</b> ${esc(S.profile.abhaNumber)}</p>` : ""}
            <h3>Recent uploaded records</h3>${visitRecordRows ? `<ul>${visitRecordRows}</ul>` : `<p>No uploaded records yet.</p>`}
            <h3>Medicines read clearly or reviewed from prescriptions</h3>${visitMedicines ? `<ul>${visitMedicines}</ul>` : `<p>No confirmed medicine details are available in the uploaded records.</p>`}
            <h3>Recorded lab results</h3>${visitLabs ? `<ul>${visitLabs}</ul>` : `<p>No lab results are available in the uploaded records.</p>`}
            <p class="doctor-visit-summary-note">This is an automatically assembled record summary, not a diagnosis or treatment plan. Medicines listed here may not be current; confirm them with your clinician.</p>
          </div>
        </section>`;
        el.innerHTML = `<header class="health-details-header"><h1 class="page-title">Health details &amp; progress</h1><p class="page-desc">A place to understand what your records say and keep your own progress notes. Document findings are shown separately from details you add.</p></header>
          ${record ? `<section class="health-record-summary"><div><span class="health-source-tag">From your selected record · ${esc(record.date || "date not shown")}</span><h2>${esc(record.title || record.recordType)}</h2><p>${esc(record.summary || "No plain-language summary was extracted.")}</p>${record.diagnoses?.length ? `<p><b>Condition or diagnosis written in record:</b> ${esc(record.diagnoses.join(" · "))}</p>` : `<p><b>No diagnosis was clearly extracted.</b> This app will not guess the injury or condition from an unclear document.</p>`}${record.bodySite ? `<p><b>Body area stated in the document:</b> ${esc(record.bodySite)}</p>` : ""}${record.injuryDescription ? `<p><b>Injury described in the document:</b> ${esc(record.injuryDescription)}</p>` : ""}${record.cause ? `<p><b>Cause stated in the document:</b> ${esc(record.cause)}</p>` : ""}${record.abnormalExplanation ? `<details><summary>What the report says about results</summary><p>${esc(record.abnormalExplanation)}</p><small>Lab reference ranges can vary and results need your clinician’s context.</small></details>` : ""}<button class="btn-sm btn-pri" type="button" id="ask-record-guidance">Help me understand this</button></div><button class="btn-sm btn-sec" type="button" id="details-view-record">View original record</button></section>` : `<section class="health-record-summary"><div><h2>Choose a report for its details</h2><p>Upload or open a medical record to see the extracted information here.</p></div><button class="btn-sm btn-pri" type="button" id="details-go-records">Open records</button></section>`}
          <section class="health-tracker-section"><div class="health-section-head"><div><h2>Injuries &amp; conditions from your uploads</h2><p>This tracker uses details explicitly stated in your records. Missing dates, areas, and severity stay blank rather than being guessed or requested again.</p></div></div>
            <div class="health-items-list">${itemCards || `<p class="empty-health-tracker">No injury or condition details found in your uploaded records yet.</p>`}</div>
          </section>
          ${visitSummaryHtml}
          <section class="health-reminders-section"><div><h2>Medicines from uploaded prescriptions</h2><p>Each entry shows whether the OCR read it clearly or it still needs review. Only confirmed medicines are used for reminders.</p></div>${medicineCards || `<p class="empty-health-tracker">No medicine details found in your uploaded records yet.</p>`}</section>
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
        el.querySelectorAll("[data-med-review-record]").forEach((button) => button.addEventListener("click", () => {
          S.curRecord = button.dataset.medReviewRecord;
          save();
          switchPage("records");
          const reviewDisclosure = $("#page-records-content .ocr-correction-disclosure");
          if (reviewDisclosure) reviewDisclosure.open = true;
        }));
        $("#print-visit-summary")?.addEventListener("click", () => {
          document.body.classList.add("printing-visit-summary");
          window.print();
        });
      }

      function hasDocumentedBodySite(record) {
        const site = String(record?.bodySite || "").trim().toLowerCase();
        if (site && !/^(unknown|unspecified|not stated|n\/a|general|whole body)$/.test(site)) return true;
        const injury = String(record?.injuryDescription || "").toLowerCase();
        return /\b(head|neck|shoulder|chest|back|abdomen|stomach|waist|hip|arm|elbow|wrist|hand|finger|thigh|leg|knee|ankle|foot|feet|heel|toe|sole)\b/.test(injury);
      }

      function bodySiteText(record) {
        return `${record?.bodySite || ""} ${record?.injuryDescription || ""}`.trim().toLowerCase();
      }

      function bodyLocation(record) {
        const text = bodySiteText(record);
        if (/head|face/.test(text)) return { y: 9, w: 18, h: 12 };
        if (/neck/.test(text)) return { y: 20, w: 17, h: 10 };
        if (/shoulder/.test(text)) return { y: 24, w: 21, h: 13 };
        if (/chest|heart|lung/.test(text)) return { y: 35, w: 27, h: 14 };
        if (/abdomen|stomach|waist/.test(text)) return { y: 48, w: 23, h: 15 };
        if (/hip|groin/.test(text)) return { y: 59, w: 24, h: 12 };
        if (/hand|finger|wrist/.test(text)) return { y: 56, w: 15, h: 12 };
        if (/elbow/.test(text)) return { y: 43, w: 15, h: 13 };
        if (/arm/.test(text)) return { y: 39, w: 17, h: 22 };
        if (/knee/.test(text)) return { y: 77, w: 17, h: 12 };
        if (/thigh/.test(text)) return { y: 68, w: 18, h: 20 };
        if (/ankle/.test(text)) return { y: 92, w: 14, h: 9 };
        if (/foot|feet|heel|toe|sole|plantar/.test(text)) return { y: 96, w: 16, h: 7 };
        if (/leg|calf|shin/.test(text)) return { y: 85, w: 18, h: 21 };
        if (/back|spine/.test(text)) return { y: 42, w: 24, h: 26 };
        return { y: 50, w: 22, h: 16 };
      }

      function bodyMarkerX(record, viewIndex = 0.5) {
        const text = bodySiteText(record);
        const view = Math.max(0, Math.min(1, Number(viewIndex)));
        const laterality = /\bleft\b/.test(text) ? -1 : /\bright\b/.test(text) ? 1 : 0;
        // Patient left/right appears reversed when viewed from the front.
        const orientation = view < 0.25 ? -1 : view > 0.75 ? 1 : 0;
        const offset = /hand|finger|wrist/.test(text) ? 29
          : /arm|elbow/.test(text) ? 25
          : /shoulder/.test(text) ? 15
          : /knee|leg|thigh|calf|shin|ankle|foot|feet|heel|toe|sole|plantar/.test(text) ? 11
          : 0;
        return Math.round(50 + laterality * orientation * offset);
      }

      function anatomyImage(record) {
        const text = bodySiteText(record);
        let src = "assets/anatomy/full-body.jpg";
        let alt = "Full body medical illustration";
        if (/sole|plantar|bottom of (?:the )?foot/.test(text)) { src = "assets/anatomy/foot-sole.jpg"; alt = "Sole of foot medical illustration"; }
        else if (/foot|feet|heel|toe|ankle/.test(text)) { src = "assets/anatomy/foot-top.jpg"; alt = "Top of foot medical illustration"; }
        else if (/head|face|neck/.test(text)) { src = "assets/anatomy/head-neck.jpg"; alt = "Head and neck medical illustration"; }
        else if (/hand|finger|wrist/.test(text)) { src = "assets/anatomy/hand.jpg"; alt = "Hand medical illustration"; }
        else if (/leg|thigh|knee/.test(text)) { src = "assets/anatomy/leg.jpg"; alt = "Leg medical illustration"; }
        else if (/back|spine/.test(text)) { src = "assets/anatomy/torso-back.jpg"; alt = "Back medical illustration"; }
        else if (/chest|abdomen|stomach|waist|hip|groin/.test(text)) { src = "assets/anatomy/torso-front.jpg"; alt = "Front torso medical illustration"; }
        const location = bodyLocation(record);
        const marker = hasDocumentedBodySite(record)
          ? `<span class="anatomy-marker" style="--marker-x:${bodyMarkerX(record, 0.5)}%;--marker-y:${location.y}%" aria-label="Recorded area: ${esc(record.bodySite || record.injuryDescription)}"></span>`
          : "";
        return `<figure class="anatomy-figure${marker ? " has-location" : " systemic"}"><div class="anatomy-image-wrap"><img src="${src}" alt="${alt}">${marker}</div><figcaption>${marker ? esc(record.bodySite || record.injuryDescription) : `${esc(tr("wholeBody"))} · health illustration · no location recorded`}</figcaption></figure>`;
      }

      function renderBodyMapPage() {
        const el = $("#page-body-content");
        if (!el) return;
        const records = personalRecords().filter((record) => hasDocumentedBodySite(record) || record.diagnoses?.length || record.injuryDescription);
        const markers = records.filter(hasDocumentedBodySite).map((record, index) => {
          const location = bodyLocation(record);
          const frontX = bodyMarkerX(record, 0);
          const sideX = bodyMarkerX(record, 0.5);
          const backX = bodyMarkerX(record, 1);
          return `<button class="full-body-marker" style="--front-x:${frontX}%;--side-x:${sideX}%;--back-x:${backX}%;--marker-y:${location.y}%;--marker-w:${location.w}%;--marker-h:${location.h}%" data-body-record="${esc(record.id)}" aria-label="${esc(record.bodySite || record.injuryDescription)} — open record"><span>${index + 1}</span></button>`;
        }).join("");
        const cards = records.map((record) => `<article class="body-finding-card">
          ${anatomyImage(record)}
          <div><span class="health-source-tag">${esc(tr("recordSource"))} · ${esc(record.date || "—")}</span><h3>${esc(record.injuryDescription || record.diagnoses?.join(" · ") || record.title || "Health record")}</h3><p>${esc(record.bodySite || tr("locationUnknown"))}</p><button class="btn-sm btn-sec" data-body-record="${esc(record.id)}" type="button">${esc(tr("openRecord"))}</button></div>
        </article>`).join("");
        el.innerHTML = `<header class="body-check-header"><div><span class="body-check-eyebrow">${esc(tr("myHealth"))}</span><h1>${esc(tr("bodyTitle"))}</h1><p>${esc(tr("bodyIntro"))}</p></div><button class="btn-sm btn-sec" type="button" data-go-health="me">← ${esc(tr("myHealth"))}</button></header>
          <section class="full-body-overview" aria-labelledby="full-body-overview-title">
            <div class="body-viewer-toolbar"><div><h2 id="full-body-overview-title">${esc(tr("bodyTitle"))}</h2><p>${esc(tr("rotateHint"))}</p></div><div class="body-view-buttons" role="group" aria-label="Choose body view"><button type="button" data-body-view="front" class="on" aria-pressed="true">${esc(tr("front"))}</button><button type="button" data-body-view="side" aria-pressed="false">${esc(tr("side"))}</button><button type="button" data-body-view="back" aria-pressed="false">${esc(tr("back"))}</button></div></div>
            <div class="full-body-viewport view-front" id="full-body-viewport"><div class="full-body-figure"><img src="assets/anatomy/full-body-front.jpg" alt="Full body front view; numbered markers show health areas recorded in reports">${markers}${markers ? "" : `<p class="body-view-empty">${esc(tr("noBody"))}</p>`}</div>${markers ? `<div class="body-marker-key">${records.filter(hasDocumentedBodySite).map((record, index) => `<button type="button" data-body-record="${esc(record.id)}"><span>${index + 1}</span>${esc(record.bodySite || record.injuryDescription)}</button>`).join("")}</div>` : ""}</div>
            ${records.some((record) => !hasDocumentedBodySite(record)) ? `<p class="systemic-condition-note"><span></span>${esc(tr("wholeBody"))}: ${esc(records.filter((record) => !hasDocumentedBodySite(record)).flatMap((record) => record.diagnoses || []).join(" · ") || tr("locationUnknown"))}</p>` : ""}
          </section>
          <section class="body-findings"><h2>${esc(tr("details"))}</h2>${cards || `<p class="body-empty">${esc(tr("noBody"))}</p>`}</section>`;
        el.querySelectorAll("[data-body-view]").forEach((button) => button.onclick = () => {
          el.querySelectorAll("[data-body-view]").forEach((item) => { item.classList.toggle("on", item === button); item.setAttribute("aria-pressed", String(item === button)); });
          const viewport = el.querySelector("#full-body-viewport");
          viewport.className = `full-body-viewport view-${button.dataset.bodyView}`;
          const viewImage = viewport.querySelector("img");
          viewImage.src = `assets/anatomy/full-body-${button.dataset.bodyView}.jpg`;
          viewImage.alt = `Full body ${button.dataset.bodyView} view; numbered markers show health areas recorded in reports`;
        });
        el.querySelectorAll("[data-body-record]").forEach((button) => button.onclick = () => {
          S.curRecord = button.dataset.bodyRecord;
          save();
          switchPage("records");
        });
        el.querySelector("[data-go-health]")?.addEventListener("click", () => switchPage("me", { fromBack: true }));
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
        const sourceLanguageNames = { en: "English", hi: "Hindi", te: "Telugu", ta: "Tamil", other: "Other" };
        const detectedSourceLanguages = (curR?.sourceLanguages || [])
          .map((language) => sourceLanguageNames[language])
          .filter(Boolean);
        const needsOcrUpdate = isOcrRecord && selected.ocrVersion < 2;
        const previewUrl = selected ? recordPreviews.get(selected.id) : "";
        const needsDocumentReview =
          (isOcrRecord || selected?.importedFromFile) &&
          !!selected?.reviewRequired;

        // Simplified abnormal watch items per user instruction
        let abnormalItems = [];
        if (curR && curR.labTests && curR.labTests.length) {
          abnormalItems = curR.labTests
            .filter(
              (ts) =>
                !ts.needsReview && (
                ts.status === "HIGH" ||
                ts.status === "LOW" ||
                ts.status === "CRITICAL"),
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
      <div class="upload-file-actions"><button class="btn-sm btn-pri" id="browse-record">Choose file</button><button class="btn-sm btn-sec" id="take-record" type="button">Take photo</button></div>
      <span id="upload-status" role="status"></span>
    </div>

    <!-- Detailed Active Record Card -->
    ${
      curR
        ? `
      <div class="rec-card">
        ${selected.importedFromFile ? '<p class="note">Imported health file · review the original source before relying on it.</p>' : ""}
        ${isDemo(selected) ? '<p class="demo-note">Demonstration record · sample data, excluded from your personal profile.</p>' : ""}
        ${isUnavailable(selected) ? '<p class="demo-note">Analysis unavailable · please upload this record again.</p>' : ""}
        ${needsOcrUpdate ? '<div class="ocr-review-note"><b>This upload used an older reader.</b><br>Its extracted medicine details may be wrong. Upload the original again to create a careful transcription.</div>' : ""}
        ${
          (isOcrRecord && !needsOcrUpdate) || selected.importedFromFile
            ? `
          <details class="ocr-advanced-disclosure">
            <summary>${selected.importedFromFile ? "View source information" : "View extracted text"}</summary>
            <section class="ocr-transcription" aria-label="Extracted document text">
              <div class="ocr-transcription-heading"><b>Text extracted from your document</b><span>${detectedSourceLanguages.length ? `Detected source languages: ${esc(detectedSourceLanguages.join(", "))}` : "Source language not confidently identified · compare with the original"}</span></div>
              <div class="ocr-review-layout">
                ${previewUrl ? `<figure class="ocr-original"><figcaption>Uploaded document</figcaption><img src="${esc(previewUrl)}" alt="Uploaded prescription or report"></figure>` : ""}
                <div class="ocr-transcription-copy">
                  <pre>${esc(curR.verbatimTranscription || (selected.importedFromFile ? "Imported as structured clinical data. A source document image was not included in this file." : "No readable text was returned. Please try a clearer, well-lit image."))}</pre>
                  <p>Handwriting and image quality can affect OCR. Confirm important details with the original document.</p>
                </div>
              </div>
              ${selected.ocrReaders?.length ? `<p class="note">Readers used for this upload: ${esc(selected.ocrReaders.join(" + "))}</p>` : ""}
              ${selected.secondaryOcrText ? `<details class="review-transcription"><summary>Second OCR reading · Unlimited-OCR</summary><pre>${esc(selected.secondaryOcrText)}</pre><p class="note">Independent text reading for comparison. Agreement between readers is not a clinical verification.</p></details>` : ""}
              ${["unavailable", "pdf_unavailable", "page_limit"].includes(selected.secondaryOcrStatus) ? `<p class="note">${selected.secondaryOcrStatus === "page_limit" ? "The second reader skipped the PDF because it exceeded its configured page limit." : selected.secondaryOcrStatus === "pdf_unavailable" ? "PDF conversion for the second reader is not installed." : "The second OCR reader was unavailable for this upload."} The primary reading is shown above.</p>` : ""}
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
                    ${m.reviewReason ? `<p class="ocr-field-review">${m.reviewReason}</p>` : ""}
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
        ${needsDocumentReview ? `<button class="btn-sm btn-sec" type="button" id="review-flagged-record">Review flagged details</button>` : ""}
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
            <b style="font-size:13.5px;display:block;margin-bottom:4px">Prescribed medicines (${curR.medicines.length})</b>
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
                    <td>${ts.needsReview ? `<span class="ocr-field-review">Needs confirmation</span>` : `<span class="badge ${ts.status}">${ts.status}</span>`}</td>
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
    <section class="record-data-controls" aria-labelledby="clear-data-title">
      <div>
        <h2 id="clear-data-title">Clear saved data</h2>
        <p>This permanently deletes your medical records, chat history, medicine reminders, health progress, and profile details saved in this browser. This action cannot be undone.</p>
      </div>
      <button type="button" id="delete-all-records" class="btn-sm btn-sec">Clear all data</button>
    </section>
  `;

        // Wire up dropzone
        const dz = el.querySelector("#records-dropzone");
        $("#browse-record").onclick = () => $("#file-inp").click();
        $("#take-record").onclick = () => $("#file-take").click();
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
        el.querySelector("#delete-all-records")?.addEventListener("click", () => {
          if (uploading) return notify("Please wait until the current file finishes before clearing saved data.");
          if (!window.confirm("Clear all Mr.Doc data saved in this browser? This permanently deletes your medical records, chat history, reminders, health progress, and profile details. This cannot be undone.")) return;
          try {
            localStorage.removeItem("carely");
            localStorage.removeItem("mrdoc_tour_done_v2");
          } catch (_) {
            notify("Browser storage could not be cleared. Please try again.", true);
            return;
          }
          recordPreviews.forEach(url => URL.revokeObjectURL(url));
          recordPreviews.clear();
          lastUploadFile = null;
          cancelPendingChat();
          stopSpeech();
          window.location.reload();
        });
        renderRecordResults();
        updateUploadUI();
        $("#review-flagged-record")?.addEventListener("click", () => openOcrReview(selected));
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
                reviewReason: name && name.toLowerCase() !== "illegible" ? "" : medicine.reviewReason,
              };
            });
            const diagnoses = el.querySelector("#review-diagnoses")?.value || "";
            selected.diagnoses = diagnoses.split(",").map((value) => value.trim()).filter(Boolean);
            selected.bodySite = el.querySelector("#review-body-site")?.value.trim() || "";
            selected.injuryDescription = el.querySelector("#review-injury-description")?.value.trim() || "";
            selected.cause = el.querySelector("#review-cause")?.value.trim() || "";
            selected.documentReviewed = true;
            if (selected.medicines.length) selected.medicinesConfirmed = true;
            selected.reviewRequired = selected.reviewItems.length > 0 || selected.medicines.some((medicine) => medicine.needsReview) || selected.labTests.some((test) => test.needsReview);
            syncReviewedRecordBundle(selected);
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

      function comparableLabNumber(value) {
        const text = String(value ?? "").trim();
        if (!/^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(text))
          return null;
        const number = Number(text.replace(/,/g, ""));
        return Number.isFinite(number) ? number : null;
      }

      function validRecordDate(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
        const date = new Date(`${value}T00:00:00Z`);
        return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
      }

      function buildLabTrendGroups(records) {
        const groups = new Map();
        records.forEach((record) => {
          if (!validRecordDate(record.date)) return;
          const patientKey = String(record.patientName || "")
            .normalize("NFKC")
            .toLocaleLowerCase()
            .replace(/\s+/g, " ")
            .trim();
          if (!patientKey) return;
          (record.labTests || []).forEach((test) => {
            if (test.needsReview) return;
            const label = String(test.test || "").normalize("NFKC").trim();
            const unit = String(test.unit || "").normalize("NFKC").trim();
            const numericValue = comparableLabNumber(test.value);
            if (!label || !unit || numericValue === null) return;
            const labelKey = label.toLocaleLowerCase().replace(/[\s._-]+/g, " ");
            const unitKey = unit.toLocaleLowerCase().replace(/[\sµμ]/g, "u");
            const key = `${patientKey}|${labelKey}|${unitKey}`;
            if (!groups.has(key)) groups.set(key, { label, unit, points: [] });
            groups.get(key).points.push({
              date: record.date,
              title: record.title || record.recordType || "Medical record",
              recordId: record.id,
              value: String(test.value).trim(),
              numericValue,
              status: ["NORMAL", "HIGH", "LOW", "CRITICAL"].includes(test.status)
                ? test.status
                : "UNKNOWN",
            });
          });
        });
        return [...groups.values()]
          .map((group) => ({
            ...group,
            points: group.points.sort((a, b) => a.date.localeCompare(b.date)),
          }))
          .filter((group) =>
            group.points.length >= 2 &&
            new Set(group.points.map((point) => point.date)).size >= 2,
          )
          .sort((a, b) => a.label.localeCompare(b.label));
      }

      function renderLabTrendComparisons(records) {
        const groups = buildLabTrendGroups(records);
        const cards = groups.map((group) => `
          <article class="lab-trend-card">
            <header><h3>${esc(group.label)}</h3><span>Recorded unit: ${esc(group.unit)}</span></header>
            <div class="lab-trend-table-wrap"><table class="lab-trend-table">
              <thead><tr><th>Date</th><th>Recorded result</th><th>Report</th><th>Recorded flag</th></tr></thead>
              <tbody>${group.points.map((point) => `<tr><td>${esc(point.date)}</td><td><b>${esc(point.value)} ${esc(group.unit)}</b></td><td>${esc(point.title)}</td><td>${point.status === "UNKNOWN" ? "Not stated" : esc(point.status)}</td></tr>`).join("")}</tbody>
            </table></div>
          </article>
        `).join("");
        return `<section class="lab-trend-section" aria-labelledby="lab-trend-heading">
          <div class="lab-trend-heading"><div><h2 id="lab-trend-heading">Lab history</h2></div></div>
          ${cards || `<p class="lab-trend-empty">Upload another dated report to see matching results together.</p>`}
        </section>`;
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
                !t.needsReview && (
                t.status === "HIGH" ||
                t.status === "LOW" ||
                t.status === "CRITICAL"),
            ),
          );

        el.innerHTML = `
    <div class="clinical-timeline-header">
      <h2 class="clinical-timeline-title">Unified Health Timeline</h2>
      <p class="clinical-timeline-subtitle">Chronological record of patient consultations, prescriptions, and lab investigations.</p>
    </div>

    ${renderLabTrendComparisons(personalRecords())}

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
                !t.needsReview && (
                t.status === "HIGH" ||
                t.status === "LOW" ||
                t.status === "CRITICAL"),
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

      // FULL PAGE: MY HEALTH PROFILE
      function renderProfilePage() {
        const el = $("#page-me-content");
        if (!el) return;

        const F = [
          ["name", "Full Name"],
          ["age", "Age (years, optional)"],
          ["gender", "Sex on your reports (optional)"],
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
            if (!t.needsReview && isFlag(t)) flags.push({ ...t, rid: r.id });
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
            : "Your uploads bring your health details together";
        };
        const uploadCta = `<button type="button" class="mh-link" data-go="records">Upload a report →</button>`;

        el.innerHTML = `
    <h1 class="page-title">${esc(tr("myHealthTitle"))}</h1>
    <div class="page-desc">Your personal profile and a live summary of everything found in your medical records.</div>

    <section class="mh-hero">
      <div class="mh-avatar" id="mh-avatar">${esc(initials(S.profile.name)) || "M"}</div>
      <div class="mh-hero-info">
        <h2 id="mh-name">${esc(plain(S.profile.name).trim()) || "Your name"}</h2>
        <p id="mh-sub">${esc(subText())}</p>
        <span class="profile-local-status">${S.profile.abhaNumber || S.profile.abhaAddress ? "ABHA details saved · unverified" : "ABHA details optional"}</span>
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

    <nav class="profile-quick-actions" aria-label="Health profile actions">
      <button type="button" class="btn-sm btn-pri" data-go="chat">Ask Mr.Doc</button>
      <button type="button" class="btn-sm btn-sec" data-go="records">Upload or view reports</button>
      <button type="button" class="btn-sm btn-sec" data-go="timeline">View timeline</button>
      <button type="button" class="btn-sm btn-sec body-check-action" data-go="body">${esc(tr("bodyCheck"))}</button>
      <button class="btn-sm btn-sec" id="reader-mode" type="button" aria-pressed="${S.readerMode}">${S.readerMode ? "Use standard text" : "Use larger text"}</button>
    </nav>

    <div class="mh-grid">
      <div class="mh-col">
      <section class="mh-card">
        <div class="mh-card-heading"><h3 class="mh-h">Personal details <small>Saved on this browser</small></h3><button type="button" class="btn-sm btn-sec" id="edit-profile">Edit</button></div>
        <dl class="profile-details-list">${F.map(([k, label]) => `<div><dt>${esc(label.replace(/\s*\(.*\)$/, ""))}</dt><dd>${esc(plain(S.profile[k]).trim() || "Not added")}</dd></div>`).join("")}</dl>
        <div class="mh-profile-edit" id="mh-profile-edit" hidden>
        <p class="note">Uploads provide your record details automatically. Some lab ranges depend on age and sex; Mr.Doc keeps the range printed on the report.</p>
        <div class="mh-form">
          ${F.map(
            ([k, l]) => `
            <div>
              <label for="prof-${k}">${l}</label>
              ${
                k === "gender" ? `<select id="prof-gender"><option value="">Not provided</option>${[["female","Female"],["male","Male"],["other","Other"],["unknown","Prefer not to say"]].map(([value,label]) => `<option value="${value}" ${S.profile.gender === value ? "selected" : ""}>${label}</option>`).join("")}</select>` : ["notes", "conditions", "meds", "allergies"].includes(k)
                  ? `
                <textarea id="prof-${k}" rows="2">${esc(S.profile[k] || "")}</textarea>
              `
                  : `
                <input id="prof-${k}" ${k === "age" ? 'type="number" min="0" max="130" step="1"' : 'type="text"'} value="${esc(S.profile[k] || "")}">
              `
              }
            </div>
          `,
          ).join("")}
        </div>
        <button type="button" class="form-btn" id="btn-save-prof">Save Profile</button>
        </div>
      </section>
      ${profileToolsHtml()}
      </div>

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
          <h3 class="mh-h">Needs attention <small>${flags.length ? flags.length + " out-of-range" : "none recorded"}</small></h3>
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

        wireProfileTools(el);
        const updateHero = () => {
          const q = (id) => el.querySelector(id);
          q("#mh-avatar").textContent = initials(S.profile.name) || "M";
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
              if (k === "age" && inp.value && (!/^\d{1,3}$/.test(inp.value) || Number(inp.value) > 130)) return;
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
              el.querySelector("#mh-profile-edit").hidden = true;
              renderProfilePage();
            }
            renderDrawerChats();
          };
        el.querySelector("#edit-profile")?.addEventListener("click", () => {
          const editor = el.querySelector("#mh-profile-edit");
          editor.hidden = !editor.hidden;
          if (!editor.hidden) el.querySelector("#prof-name")?.focus();
        });
      }

      // 6. FULL PAGE: HEALTH GUIDANCE
      function profileToolsHtml() {
        return `<section class="mh-card"><h3 class="mh-h">ABHA health card <small>Optional</small></h3>
          <p class="note">Save details from your own card in this browser. Scanning reads the card; it does not sign into or verify your national health account.</p>
          <details class="profile-options"><summary>Add or scan card details</summary>
            <button class="btn-sm btn-sec" type="button" id="scan-abha">Scan card photo</button>
            <input type="file" id="abha-photo" accept="image/png,image/jpeg,image/webp" capture="environment" hidden>
            <p id="abha-scan-status" class="note" role="status"></p>
            <div class="mh-form"><div><label for="abha-number">14-digit ABHA number</label><input id="abha-number" type="text" inputmode="numeric" maxlength="17" placeholder="XX-XXXX-XXXX-XXXX" value="${esc(S.profile.abhaNumber || "")}"></div>
            <div><label for="abha-address">ABHA address</label><input id="abha-address" type="text" maxlength="105" placeholder="name@abdm" value="${esc(S.profile.abhaAddress || "")}"></div></div>
            <button class="btn-sm btn-pri" type="button" id="save-abha">Save card details</button>
          </details></section>
          <section class="mh-card"><h3 class="mh-h">Backup or transfer your records</h3><p class="note">Download your profile and medical records, or import a health file from your device. Files stay in this browser during import.</p>
            <div class="profile-tool-actions"><button class="btn-sm btn-pri" id="download-health" type="button">Download health backup</button><button class="btn-sm btn-sec" id="import-health" type="button">Import health file</button></div>
            <input type="file" id="health-file" accept="application/json,.json" hidden>
            <p class="note">JSON · up to 5 MB. Bring records from another device without entering them again.</p>
            <details class="profile-options"><summary>Supported health files</summary><p class="note">Mr.Doc backups and supported FHIR R4 clinical bundles. External files must describe one patient. Lab values, medicine instructions, and conditions can be imported; unsupported entries are shown in the preview. Files are not validated for ABDM exchange.</p></details>
            <p id="health-file-status" class="note" role="status"></p></section>`;
      }

      function wireProfileTools(el) {
        el.querySelector("#reader-mode").onclick = () => {
          S.readerMode = !S.readerMode;
          if (!save()) { S.readerMode = !S.readerMode; return; }
          document.body.classList.toggle("reader-mode", S.readerMode);
          const button = el.querySelector("#reader-mode");
          button.setAttribute("aria-pressed", String(S.readerMode));
          button.textContent = S.readerMode ? "Use standard text" : "Use larger text";
        };
        el.querySelector("#abha-number").oninput = (event) => { event.target.value = MrDocHealth.formatAbha(event.target.value); };
        el.querySelector("#save-abha").onclick = () => {
          try {
            const fields = MrDocHealth.validateAbha(el.querySelector("#abha-number").value, el.querySelector("#abha-address").value.trim());
            const previous = { ...S.profile }; Object.assign(S.profile, fields);
            if (!save()) { S.profile = previous; return; }
            renderProfilePage(); notify("Card details saved in this browser. No ABHA account was connected.");
          } catch(error) { notify(error.message, true); }
        };
        el.querySelector("#scan-abha").onclick = () => el.querySelector("#abha-photo").click();
        el.querySelector("#abha-photo").onchange = async (event) => {
          const file = event.target.files?.[0]; event.target.value = "";
          if(!file) return;
          if(uploading) return notify("Please wait for the current file to finish.");
          if(!["image/png","image/jpeg","image/webp"].includes(file.type) || !file.size || file.size > 10 * 1024 * 1024) return notify("Choose a PNG, JPEG, or WebP card photo up to 10 MB.", true);
          const button = el.querySelector("#scan-abha"), status = el.querySelector("#abha-scan-status");
          uploading = true; button.disabled = true; updateUploadUI(); status.textContent = "Reading your card photo…";
          try {
            const data = await requestJson(CONFIG.abhaCardEndpoint, { image: await readFileBase64(file), mimeType: file.type });
            el.querySelector("#abha-number").value = MrDocHealth.formatAbha(data.abha.abhaNumber || "");
            el.querySelector("#abha-address").value = data.abha.abhaAddress || "";
            status.textContent = "Check the extracted details against your card, then save. Unclear fields were left blank.";
          } catch(error) { status.textContent = error.message; }
          finally { uploading = false; button.disabled = false; updateUploadUI(); }
        };
        el.querySelector("#download-health").onclick = () => {
          try {
            const bundle = MrDocHealth.exportHealth(S.profile, personalRecords(), S.healthItems);
            const blob = new Blob([JSON.stringify(bundle, null, 2)], {type:"application/json"});
            if(blob.size > 5 * 1024 * 1024 || bundle.entry.length > 2000) throw new Error("This backup exceeds the current health-file import limit (5 MB or 2,000 entries). Your saved records have not been changed.");
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a"); link.href = url; link.download = "MrDoc-health-backup-" + new Date().toISOString().slice(0,10) + ".json";
            document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
            el.querySelector("#health-file-status").textContent = "Backup prepared. Keep this personal health file somewhere you trust.";
          } catch(error) { el.querySelector("#health-file-status").textContent = error.message; }
        };
        el.querySelector("#import-health").onclick = () => el.querySelector("#health-file").click();
        el.querySelector("#health-file").onchange = async (event) => {
          const file = event.target.files?.[0]; event.target.value = "";
          if(!file) return;
          if(uploading) return notify("Please wait for the current file to finish.");
          if(!file.size || file.size > 5 * 1024 * 1024) return notify("Choose a health JSON file up to 5 MB.", true);
          const status = el.querySelector("#health-file-status");
          const button = el.querySelector("#import-health"); button.disabled = true;
          try {
            const imported = MrDocHealth.parseHealthFile(JSON.parse(await file.text()));
            const records = imported.records.map(record => normalizeRecord({...record, importedFromFile: true}));
            if(records.some(r => !r)) throw new Error("A record could not be read. Nothing was imported.");
            const names = imported.patientNames.slice(0,4).join(", ") + (imported.patientNames.length > 4 ? " and more" : "") || imported.profile.name || "Name not provided";
            const newRecords = records.filter(r => !S.records.some(saved => saved.id === r.id));
            if(!window.confirm(`Import ${newRecords.length} new record(s)?\nPatient: ${names}\n${imported.unsupported ? imported.unsupported + " unsupported entries will be skipped.\n" : ""}Existing records will be kept. Profile details fill empty fields only. Check that these records belong in this browser.`)) return;
            const previous = JSON.parse(JSON.stringify(S));
            S.records.push(...newRecords);
            const matchingProfile = !S.profile.name || MrDocHealth.canUseProfile(S.profile, imported.profile.name);
            if(matchingProfile) Object.entries(MrDocHealth.cleanProfile(imported.profile)).forEach(([key,value]) => { if(!S.profile[key]) S.profile[key] = value; });
            const ids = new Set(S.records.map(r => r.id));
            imported.healthItems.filter(item => item && ids.has(item.recordId) && typeof item.id === "string").forEach(item => {
              if(!S.healthItems.some(saved => saved.id === item.id)) S.healthItems.push({id:item.id,recordId:item.recordId,healed:item.healed === true});
            });
            newRecords.forEach(syncAutoReminders);
            if(newRecords.length) S.curRecord = newRecords[0].id;
            if(!save()) { S = previous; throw new Error("The import could not be saved. Free some browser storage and try again."); }
            renderProfilePage();
            notify(`${newRecords.length} record(s) imported${records.length - newRecords.length ? "; existing copies were skipped" : ""}. Open Medical Records or Timeline to view them.`);
          } catch(error) { status.textContent = error instanceof SyntaxError ? "This file is not valid JSON. Nothing was imported." : error.message; }
          finally { button.disabled = false; }
        };
      }

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
        for (const selector of ["#rec-up", "#browse-record", "#rec-take", "#take-record", "#upload-retry-btn", "#scan-abha", "#import-health"]) {
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
      let lastUploadFile = null;
      function readFileBase64(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1]);
          reader.onerror = reader.onabort = () => reject(new Error("This file could not be read. Please choose it again."));
          reader.readAsDataURL(file);
        });
      }
      async function handleFileUpload(file) {
        if (!file) return;
        if (uploading) return notify("A report is already being read. Please wait.");
        // A new selection replaces the previous retry, including an invalid selection.
        lastUploadFile = null;
        const retry = $("#upload-retry-banner"); retry.hidden = true;
        const mime = file.type || {pdf:"application/pdf",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp"}[file.name.split(".").pop().toLowerCase()];
        if (!["application/pdf","image/png","image/jpeg","image/webp"].includes(mime)) return notify("Choose a PNG, JPEG, WebP image or PDF.", true);
        if (!file.size || file.size > 10 * 1024 * 1024) return notify("Choose a non-empty file up to 10 MB.", true);
        uploading = true; updateUploadUI(); stopSpeech();
        const overlay = $("#analysis-overlay"), bar = $("#upload-progress-fill"), progress = bar.parentElement;
        $("#analysis-file-name").textContent = file.name;
        progress.removeAttribute("aria-valuenow"); progress.setAttribute("aria-valuetext", "Reading your report");
        bar.classList.remove("complete"); overlay.hidden = false;
        $("#analysis-status-text").textContent = "Reading your report and writing a simple summary…";
        setExp("think"); let canRetry = false;
        try {
          const encoded = await readFileBase64(file);
          let processedImage = "";
          if (mime.startsWith("image/")) {
            const prepared = await preparePrescriptionImage(file);
            processedImage = prepared.image;
            if (prepared.quality.blur < 14 || prepared.quality.brightness < 24) throw new Error("This photo looks too blurry or dark. Retake it in bright, even light and keep all the writing in focus.");
          }
          lastUploadFile = file; canRetry = true;
          const data = await requestJson(CONFIG.ocrEndpoint, {
            image: encoded, processedImage, mimeType: mime, language: S.lang, voice,
            age: S.profile.age || "", gender: S.profile.gender || "", profileName: S.profile.name || "",
          });
          progress.setAttribute("aria-valuenow", "100"); progress.setAttribute("aria-valuetext", "Report ready");
          bar.classList.add("complete"); await sleep(180);
          const previewUrl = mime.startsWith("image/") ? URL.createObjectURL(file) : "";
          handleAnalyzedRecord(data.record, data.audio, previewUrl);
          lastUploadFile = null; notify("Report added. The full result is available when you want to open it.");
        } catch (error) {
          if (!canRetry) lastUploadFile = null;
          $("#upload-retry-file").textContent = file.name;
          $("#upload-retry-text").textContent = error.message;
          const retryButton = $("#upload-retry-btn");
          retryButton.textContent = canRetry ? "Try again" : "Choose another file";
          retryButton.dataset.chooseFile = canRetry ? "" : "1";
          retry.hidden = false;
        } finally {
          uploading = false; overlay.hidden = true; updateUploadUI();
          if (!speechActive) setExp("happy");
        }
      }
      async function preparePrescriptionImage(file) {
        const source = await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => {
            URL.revokeObjectURL(image.src);
            reject(
              new Error(
                "This photo could not be opened. Please choose another image.",
              ),
            );
          };
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
      function applyReviewedLabValue(record, fieldName, value) {
        const match = /^lab:(\d+):(value|unit)$/.exec(fieldName);
        if (!match || !String(value).trim()) return null;
        const index = Number(match[1]);
        const test = record.labTests[index];
        if (!test) return null;
        const field = match[2];
        if (test[field] !== value) { test.status = "UNKNOWN"; test.interpretation = ""; }
        test[field] = value;
        return index;
      }

      function syncReviewedRecordBundle(record) {
        let index = 0;
        let medicineIndex = 0;
        (record.fhirBundle?.entry || []).forEach((entry) => {
          const resource = entry.resource;
          if (resource?.resourceType === "MedicationRequest") {
            const medicine = record.medicines[medicineIndex++];
            if (!medicine) return;
            resource.medicationCodeableConcept = { text: medicine.name || "Unclear medicine" };
            resource.dosageInstruction = [{ text: [medicine.strength || medicine.dosage, medicine.frequency, medicine.timing, medicine.duration, medicine.instructions].filter(Boolean).join(" · ") }];
            return;
          }
          if (resource?.resourceType !== "Observation") return;
          const test = record.labTests[index++];
          if (!test) return;
          delete resource.valueQuantity;
          delete resource.valueString;
          const number = comparableLabNumber(test.value);
          if (number === null) resource.valueString = test.value || "Not recorded";
          else resource.valueQuantity = { value: number, unit: test.unit || "" };
          resource.status = test.needsReview ? "preliminary" : "final";
          resource.code = { text: test.test || "Lab result" };
          resource.referenceRange = [{ text: test.referenceRange || "" }];
          resource.interpretation = [{ text: test.status || "UNKNOWN" }];
          const pendingNote = "OCR value awaiting confirmation against the original report.";
          resource.note = (resource.note || []).filter((note) => note.text !== pendingNote);
          if (test.needsReview) resource.note.push({ text: pendingNote });
          if (!resource.note.length) delete resource.note;
        });
      }

      function openOcrReview(record) {
        const overlay = $("#ocr-review-overlay");
        const content = $("#ocr-review-content");
        if (!overlay || !content) return;
        const preview = recordPreviews.get(record.id);
        const medicines = record.medicines
          .map((medicine, index) => ({ medicine, index }))
          .filter(({ medicine }) => medicine.needsReview);
        const reviewFieldLabel = (item, index) => {
          if (item.field.startsWith("lab:")) {
            const [, testIndex, field] = item.field.split(":");
            return `${record.labTests[Number(testIndex)]?.test || "Lab result"} · ${field === "unit" ? "unit" : "result"}`;
          }
          return ({ bodySite: "Body area", diagnoses: "Condition in the document", injuryDescription: "Injury description", cause: "Cause", injuryStartDate: "Start date", documentedSeverity: "Severity stated in the document" })[item.field] || item.field || `Unclear detail ${index + 1}`;
        };
        const medicineMarkup = medicines.map(({ medicine, index }) => `
          <article class="ocr-uncertain-item" data-review-med="${index}">
            <h3>Medicine details to check</h3>
            <p><b>As written:</b> ${esc(medicine.sourceText || medicine.rawText || "No clear line was read")}</p>
            ${medicine.reviewReason ? `<p class="ocr-field-review">${esc(medicine.reviewReason)}</p>` : ""}
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
          <article class="ocr-uncertain-item" data-review-generic="${index}"><h3>${esc(reviewFieldLabel(item, index))}</h3>
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
            if (med.userVerified) med.reviewReason = "";
          });
          content.querySelectorAll("[data-review-field]").forEach((input) => {
            const field = input.dataset.reviewField;
            const value = input.value.trim();
            if (field === "bodySite" || field === "injuryDescription" || field === "cause" || field === "injuryStartDate") record[field] = value;
            else if (field === "diagnoses") record.diagnoses = value.split(",").map((item) => item.trim()).filter(Boolean);
          });
          const reviewedLabIndices = new Set();
          record.reviewItems = record.reviewItems.filter((item, index) => {
            const input = content.querySelector(`[data-review-index-value="${index}"]`);
            const value = input?.value.trim() || "";
            if (!value) return true;
            let applied = false;
            if (["bodySite", "injuryDescription", "cause", "injuryStartDate"].includes(item.field)) { record[item.field] = value; applied = true; }
            else if (item.field === "documentedSeverity" && ["low", "medium", "serious"].includes(value.toLowerCase())) { record.documentedSeverity = value.toLowerCase(); applied = true; }
            else if (item.field === "diagnoses") { record.diagnoses = value.split(",").map((entry) => entry.trim()).filter(Boolean); applied = true; }
            else if (item.field.startsWith("lab:")) {
              const testIndex = applyReviewedLabValue(record, item.field, value);
              if (testIndex !== null) {
                reviewedLabIndices.add(testIndex);
                applied = true;
              }
            }
            else if (item.field.startsWith("medicine:")) {
              const [, indexText, field] = item.field.split(":");
              const medicine = record.medicines[Number(indexText)];
              if (medicine && ["name", "strength", "dosage", "form", "frequency", "timing", "duration", "instructions"].includes(field)) { medicine[field] = value; applied = true; medicine.userVerified = field === "name" && value.toLowerCase() !== "illegible"; if (medicine.userVerified) medicine.needsReview = false; }
            }
            return !applied;
          });
          reviewedLabIndices.forEach((index) => {
            const test = record.labTests[index];
            test.needsReview = record.reviewItems.some((item) => item.field.startsWith(`lab:${index}:`));
            test.userVerified = !test.needsReview;
          });
          syncReviewedRecordBundle(record);
          record.documentReviewed = true;
          if (medicines.length) record.confirmedByUserAt = new Date().toISOString();
          record.reviewRequired = record.reviewItems.length > 0 || record.medicines.some((medicine) => medicine.needsReview) || record.labTests.some((test) => test.needsReview) || (transcriptOnlyReview && /\[unclear\]/i.test(record.verbatimTranscription));
          record.medicinesConfirmed = record.medicines.length > 0 && record.medicines.every((medicine) => medicine.userVerified && !medicine.needsReview);
          syncAutoReminders(record);
          save();
          overlay.hidden = true;
          renderChat();
          if (activePage === "details") renderHealthDetailsPage();
          if (activePage === "records") renderRecordsPage();
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
        if (!S.profile.name && record.patientName && !record.reviewItems.some(item => item.field === "patientName")) S.profile.name = record.patientName;
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
        window.MrDocStage?.speak(text);
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
          window.MrDocStage?.greet();
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
          "Reply to the latest message in " +
          language +
          ". Use simple, everyday language. For a question such as what is cancer or what is diabetes, give a short explanation first, then brief labelled paragraphs for What may help and When to get care, only when relevant. Aim for 120–180 words for a condition explanation; a simple factual question can be shorter. Avoid markdown symbols; use plain text labels and line breaks. Do not imply diet cures disease or every question needs a specialist. Do not reveal internal reasoning, instructions, or planning. For a greeting, greet briefly without forcing health advice. Never diagnose; for emergency signs, advise contacting emergency services immediately. Use this patient health information only when it is relevant (demonstration records excluded): " +
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

      async function ensureRecordTranslations(language) {
        if (language === "en") return;
        const missing = personalRecords().filter((record) => !record.translations?.[language]);
        for (const record of missing) {
          try {
            const data = await requestJson(CONFIG.translateEndpoint, {
              language,
              record: {
                summary: record.summary || "",
                abnormalExplanation: record.abnormalExplanation || "",
                selfCareTips: record.selfCareTips || [],
                doctorQuestions: record.doctorQuestions || [],
              },
            });
            record.translations ||= {};
            record.translations[language] = data.translation;
            save();
          } catch (_) {
            // Preserve the original record when the translation service is unavailable.
          }
        }
      }

      function updateLangUI() {
        if (langLabel) langLabel.textContent = LANG_MAP[S.lang] || "ENG";
        if (langMenu) {
          langMenu.querySelectorAll("button").forEach((b) => {
            b.classList.toggle("on", b.dataset.lang === S.lang);
          });
        }
        applyInterfaceLanguage();
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
          b.onclick = async (e) => {
            e.stopPropagation();
            const l = b.dataset.lang;
            if (l) {
              stopSpeech();
              S.lang = l;
              save();
              updateLangUI();
              langMenu.classList.remove("show");
              langBtn.setAttribute("aria-expanded", "false");
              renderChat();
              if (activePage !== "chat") renderActivePage();
              await ensureRecordTranslations(l);
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
      $("#btn-back-chat").onclick = () => switchPage($("#btn-back-chat").dataset.target || "chat", { fromBack: true });

      // Big Upload Button in Chat Input Bar
      const fileInp = $("#file-inp");
      const attachmentToggle = $("#attachment-toggle");
      const attachmentMenu = $("#attachment-menu");
      const closeAttachmentMenu = () => {
        attachmentMenu.hidden = true;
        attachmentToggle.setAttribute("aria-expanded", "false");
      };
      attachmentToggle.onclick = (event) => {
        event.stopPropagation();
        attachmentMenu.hidden = !attachmentMenu.hidden;
        attachmentToggle.setAttribute("aria-expanded", String(!attachmentMenu.hidden));
      };
      attachmentMenu.onclick = (event) => event.stopPropagation();
      document.addEventListener("click", closeAttachmentMenu);
      if (fileInp) {
        fileInp.onchange = (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) handleFileUpload(file);
        };
      }
      $("#rec-up").onclick = () => {
        closeAttachmentMenu();
        if (fileInp) fileInp.click();
      };
      $("#rec-take").onclick = () => { closeAttachmentMenu(); $("#file-take").click(); };
      $("#file-take").onchange = (event) => {
        const file = event.target.files?.[0]; event.target.value = "";
        if (file) handleFileUpload(file);
      };
      $("#upload-retry-btn").onclick = () => {
        if ($("#upload-retry-btn").dataset.chooseFile) fileInp.click();
        else if (lastUploadFile) handleFileUpload(lastUploadFile);
      };
      $("#upload-retry-dismiss").onclick = () => { $("#upload-retry-banner").hidden = true; lastUploadFile = null; };


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
          micBtn.setAttribute("aria-pressed", "false");
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
            micBtn.setAttribute("aria-pressed", "true");
            setExp("look");
          } catch (e) {}
        };
      }

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
        document.body.classList.remove("printing-record", "printing-visit-summary"),
      );

      // A single introduction occupies the viewport; the landing illustration hides during playback.
      const introScreen = $("#copilot-intro");
      const introVideo = $("#copilot-intro-video");
      $(".intro-poster-figure img").src = "assets/welcome-doctor.png";
      const introStart = $("#start-intro");
      const introStartLabel = $("#intro-start-label");
      const introStatus = $("#intro-status");
      const introSkip = $("#intro-skip");
      const authScreen = $("#auth-screen");
      const authForm = $("#auth-form");
      const authNameRow = $("#auth-name-row");
      const authName = $("#auth-name");
      const authEmail = $("#auth-email");
      const authPassword = $("#auth-password");
      const authSubmit = $("#auth-submit");
      const authStatus = $("#auth-status");
      let introClosed = false,
        introRequested = false,
        authMode = "signin",
        pendingTour = false,
        introTimer;
      introSkip.hidden = true;
      introVideo.controls = false;
      introVideo.disablePictureInPicture = true;
      const introVideoMask = $(".intro-video-mask");
      const introVideoNameTag = $(".intro-video-name-tag");
      function positionIntroVideoMask() {
        if (!introVideoMask || !introVideoNameTag) return;
        const frame = $(".intro-video-frame");
        if (!frame) return; // the intro screen may already be removed
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
      function showAuth(startTourAfterIntro = false) {
        pendingTour = startTourAfterIntro;
        authScreen.hidden = false;
        authStatus.textContent = "";
        authEmail.value = localStorage.getItem("mrdoc_auth_email") || "";
        setTimeout(() => (authEmail.value ? authPassword : authEmail).focus(), 0);
      }
      function setAuthMode(mode) {
        authMode = mode;
        const signup = mode === "signup";
        authNameRow.hidden = !signup;
        authName.required = signup;
        authPassword.autocomplete = signup ? "new-password" : "current-password";
        $("#auth-signin-tab").classList.toggle("on", !signup);
        $("#auth-signup-tab").classList.toggle("on", signup);
        $("#auth-signin-tab").setAttribute("aria-selected", String(!signup));
        $("#auth-signup-tab").setAttribute("aria-selected", String(signup));
        $("#auth-title").textContent = signup ? "Create your account" : "Welcome back";
        $("#auth-description").textContent = signup ? "Set up your private Mr.Doc workspace." : "Sign in to continue to your health assistant.";
        authSubmit.textContent = signup ? "Create account and continue" : "Sign in and continue";
        authStatus.textContent = "";
      }
      async function playIntroVideo() {
        if (introClosed || introStart.disabled) return;
        introRequested = true;
        authScreen.hidden = true;
        introScreen.classList.remove("has-error");
        introStatus.textContent = "";
        introScreen.classList.add("is-playing");
        introStart.disabled = true;
        introSkip.hidden = false;
        introSkip.textContent = "Skip intro";
        introSkip.focus();
        introTimer = setTimeout(introFailure, 15000);
        try {
          await introVideo.play();
        } catch (_) {
          introFailure();
        }
      }
      introStart.addEventListener("click", () => showAuth(false));
      $("#auth-back").onclick = () => { authScreen.hidden = true; };
      $("#auth-signin-tab").onclick = () => setAuthMode("signin");
      $("#auth-signup-tab").onclick = () => setAuthMode("signup");
      authForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!authForm.reportValidity()) return;
        if (authMode === "signup" && authName.value.trim().length < 2) {
          authStatus.textContent = "Enter your full name.";
          authName.focus();
          return;
        }
        localStorage.setItem("mrdoc_auth_email", authEmail.value.trim());
        localStorage.setItem("mrdoc_auth_seen", "1");
        if (authMode === "signup" && authName.value.trim()) {
          S.profile.name = authName.value.trim();
          save();
        }
        authPassword.value = "";
        await playIntroVideo();
      });
      introVideo.addEventListener("playing", () => clearTimeout(introTimer));
      introVideo.addEventListener("waiting", () => {
        clearTimeout(introTimer);
        introTimer = setTimeout(introFailure, 15000);
      });
      introVideo.addEventListener("ended", () => closeIntro(pendingTour));
      introVideo.addEventListener("error", introFailure);
      introVideo
        .querySelector("source")
        .addEventListener("error", introFailure);
      introSkip.onclick = () => closeIntro(false);

      const introTutorialBtn = $("#intro-tutorial-btn");
      if (introTutorialBtn) {
        introTutorialBtn.onclick = () => showAuth(true);
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
            text: "See details from your saved records and add personal notes if you want to.",
          },
          {
            sel: null,
            title: "You're all set!",
            text: 'That\'s the tour. You can replay it any time from the top bar using "Tutorial".',
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

        const topTut = document.getElementById("top-tutorial-btn");
        if (topTut) topTut.onclick = () => window.startTour(true);

        if (/[?&#](?:tour|tutorial)/i.test(location.href)) {
          setTimeout(() => {
            if (typeof closeIntro === "function") closeIntro(true);
            else window.startTour(true);
          }, 200);
        }
      })();
