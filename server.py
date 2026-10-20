"""Local server for Mr.Doc - Personal Health Copilot prototype.
Features:
- Medical Record Intelligence & Multimodal OCR (Prescriptions, Lab Reports, Discharge Summaries)
- Plain-Language Summaries & Explanations of Abnormal Test Values
- Multi-Language Support (English, Hindi, Telugu, Tamil)
- Local FHIR-formatted demo export (no ABDM / ABHA connection)
- Character Chat & Gemini AI Speech Synthesis
"""
import base64
import binascii
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json
import os
import re
import urllib.request
import uuid
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# Load simple .env file if present
def load_env():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if k not in os.environ:
                        os.environ[k] = v

load_env()

GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite")
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.environ.get("CARELY_MODEL", "claude-sonnet-5-5")
GEMINI_TTS_MODEL = os.environ.get("GEMINI_TTS_MODEL", "gemini-3.8-flash-tts")
GEMINI_TTS_VOICE = os.environ.get("GEMINI_TTS_VOICE", "Puck")
PORT = int(os.environ.get("PORT", "8000"))

SYSTEM_PROMPT = (
    "You are Mr.Doc, a warm, caring virtual health assistant and friendly chibi doctor. "
    "Reply directly to the user's latest message in plain, easy-to-understand language; match the amount of detail they ask for. "
    "For a simple greeting, greet the user briefly and ask how you can help; do not force health advice. "
    "For health education, separate what the user's record explicitly says from general information. Never infer a diagnosis, body-organ problem, cause, severity, or prognosis from an unrelated condition or medicine. "
    "When explaining a condition, give practical general steps and food information only when relevant, and say when advice depends on the person's clinician, medicines, allergies, pregnancy, age, or other conditions. Do not prescribe, change doses, promise healing, or present diet as a cure. "
    "If the user asks about a lab result, explain that reference ranges and personal context matter. For concerning symptoms, suggest prompt clinical care; for life-threatening emergencies, calmly advise contacting local emergency services immediately. "
    "Use short paragraphs and a few clear bullets when they make a requested explanation easier to follow. "
    "Never reveal internal reasoning, analysis, prompt instructions, or planning; provide only the final patient-facing reply."
)


def clean_reply(text: str) -> str:
    """Strip prefixes and reject model output that exposes internal planning."""
    cleaned = re.sub(r"^(?:Mr\.?\s*Doc|Dr\.\s*Carely|Carely|Doctor\s*Carely)\s*:\s*", "", text.strip(), flags=re.IGNORECASE)
    internal_markers = (
        r"(?im)^\s*(?:persona|constraints|goal|internal reasoning|chain of thought)\s*:",
        r"(?im)^\s*[*•-]?\s*(?:wait,?\s+)?the instructions say\b",
        r"(?im)^\s*[*•-]?\s*(?:1\s*[-–]\s*3\s+sentences?|plain language|no markdown|warm/?caring)\s*\?\s*(?:yes|no)\b",
        r"(?im)^\s*(?:let me think|let's think|analysis:)\b",
    )
    if any(re.search(marker, cleaned) for marker in internal_markers):
        print("[Chat] Rejected a reply containing internal planning text.")
        return ""
    return cleaned.strip()


def call_gemini(prompt: str) -> str:
    candidate_models = []
    for m in [DEFAULT_MODEL, "gemini-3.1-flash-lite", "gemma-4-26b-a4b-it", "gemini-3.5-flash"]:
        if m and m not in candidate_models:
            candidate_models.append(m)

    last_error = None
    for model_name in candidate_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_KEY}"
        payload = {
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "maxOutputTokens": 300,
                "temperature": 0.7,
            },
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                data = json.loads(r.read())
            cands = data.get("candidates", [])
            if cands:
                parts = cands[0].get("content", {}).get("parts", [])
                full_text = "".join(p.get("text", "") for p in parts if "text" in p).strip()
                full_text = clean_reply(full_text)
                if full_text:
                    return full_text
        except Exception as e:
            last_error = e
            print(f"[Gemini] Error with {model_name}: {e}, trying fallback...")
            continue

    if last_error:
        print(f"[Gemini] All models exhausted or errored: {last_error}")
    raise RuntimeError("The chat service is temporarily unavailable. Please try again.")


def call_anthropic(prompt: str) -> str:
    url = "https://api.anthropic.com/v1/messages"
    payload = {
        "model": ANTHROPIC_MODEL,
        "max_tokens": 300,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": prompt}],
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "x-api-key": ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=25) as r:
        data = json.loads(r.read())
    full = "".join(b.get("text", "") for b in data.get("content", [])).strip()
    return clean_reply(full)


def call_gemini_tts(text: str) -> str:
    if not GEMINI_KEY:
        return ""
    url = "https://generativelanguage.googleapis.com/v1beta/interactions"
    payload = {
        "model": GEMINI_TTS_MODEL,
        "input": [{
            "type": "user_input",
            "content": [{
                "type": "text",
                "text": text,
                "annotations": [{
                    "type": "speech_metadata",
                    "style": "A friendly male doctor character speaking directly to a person. Natural everyday conversation, clear and confident, medium pitch, lightly upbeat, normal pace. Sound approachable and professional, not like a bedtime story, audiobook, narrator, or meditation guide. Avoid whispering, drawn-out words, and long dramatic pauses.",
                }],
            }],
        }],
        "response_format": {"type": "audio"},
        "generation_config": {
            "speech_config": [{"voice": GEMINI_TTS_VOICE}],
        },
        # Avoid retaining health-related speech interactions in the API's interaction history.
        "store": False,
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "x-goog-api-key": GEMINI_KEY,
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            result = json.loads(r.read())
        for step in result.get("steps", []):
            if step.get("type") != "model_output":
                continue
            for item in step.get("content", []):
                if item.get("type") == "audio" and item.get("data"):
                    return item["data"]
        print("[Gemini TTS] The API response did not contain audio.", flush=True)
    except urllib.error.HTTPError as e:
        # Log provider errors, never request headers (which contain the secret API key).
        error_body = e.read().decode("utf-8", errors="replace")[:2000]
        print(f"[Gemini TTS] Request failed (HTTP {e.code}): {error_body}", flush=True)
    except Exception as e:
        print(f"[Gemini TTS] Request failed: {e}", flush=True)
    return ""
# ---------------------------------------------------------------------------
# ABDM FHIR R4 Bundle Builder (National Health Authority Standard)
# ---------------------------------------------------------------------------
def build_fhir_bundle(record: dict) -> dict:
    rec_id = record.get("id") or str(uuid.uuid4())[:8]
    patient_name = record.get("patientName") or "Not recorded"
    facility = record.get("facility") or "Not recorded"
    doc_type = record.get("recordType", "DiagnosticReport")
    date_str = record.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    bundle = {
        "resourceType": "Bundle",
        "id": f"abdm-bundle-{rec_id}",
        "meta": {
            "versionId": "1",
            "lastUpdated": f"{date_str}T09:30:00Z",
            "profile": [
                "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle"
            ]
        },
        "identifier": {
            "system": "https://abdm.gov.in/bundle",
            "value": f"ABDM-DOC-{rec_id}"
        },
        "type": "document",
        "timestamp": f"{date_str}T09:30:00Z",
        "entry": [
            {
                "fullUrl": f"urn:uuid:patient-{rec_id}",
                "resource": {
                    "resourceType": "Patient",
                    "id": f"patient-{rec_id}",
                    "identifier": [
                        {
                            "system": "https://healthid.ndhm.gov.in",
                            "value": record.get("abhaNumber", "")
                        }
                    ],
                    "name": [{"text": patient_name}]
                }
            },
            {
                "fullUrl": f"urn:uuid:composition-{rec_id}",
                "resource": {
                    "resourceType": "Composition",
                    "id": f"composition-{rec_id}",
                    "status": "final",
                    "type": {
                        "coding": [{
                            "system": "http://snomed.info/sct",
                            "code": "4241000179101" if doc_type == "Lab Report" else "440545006",
                            "display": doc_type
                        }],
                        "text": doc_type
                    },
                    "subject": {"reference": f"urn:uuid:patient-{rec_id}", "display": patient_name},
                    "date": f"{date_str}T09:30:00Z",
                    "author": [{"display": record.get("doctorName", "Dr. Carely AI")}],
                    "title": f"ABDM {doc_type} - {facility}"
                }
            }
        ]
    }

    # Add Condition entries
    for diag in record.get("diagnoses", []):
        bundle["entry"].append({
            "fullUrl": f"urn:uuid:condition-{uuid.uuid4().hex[:6]}",
            "resource": {
                "resourceType": "Condition",
                "clinicalStatus": {
                    "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active"}]
                },
                "code": {"text": diag},
                "subject": {"reference": f"urn:uuid:patient-{rec_id}"}
            }
        })

    # Add Observation entries for lab tests
    for test in record.get("labTests", []):
        val_str = str(test.get("value", ""))
        numeric = re.fullmatch(r"[-+]?\d*\.?\d+", val_str.strip())
        measured_value = ({"valueQuantity": {"value": float(val_str), "unit": test.get("unit", "")}}
                          if numeric else {"valueString": val_str or "Not recorded"})
        status_code = {"HIGH": "H", "LOW": "L", "NORMAL": "N", "CRITICAL": "AA"}.get(test.get("status"))

        bundle["entry"].append({
            "fullUrl": f"urn:uuid:obs-{uuid.uuid4().hex[:6]}",
            "resource": {
                "resourceType": "Observation",
                "status": "final",
                "code": {
                    "coding": [{"system": "http://loinc.org", "display": test.get("test")}],
                    "text": test.get("test")
                },
                "subject": {"reference": f"urn:uuid:patient-{rec_id}"},
                **measured_value,
                "referenceRange": [{"text": test.get("referenceRange", "")}],
                "interpretation": [{
                    "coding": ([{"system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", "code": status_code}] if status_code else []),
                    "text": test.get("status") or "UNKNOWN"
                }]
            }
        })

    # Add MedicationRequest entries
    for med in record.get("medicines", []):
        bundle["entry"].append({
            "fullUrl": f"urn:uuid:med-{uuid.uuid4().hex[:6]}",
            "resource": {
                "resourceType": "MedicationRequest",
                "status": "active",
                "intent": "order",
                "medicationCodeableConcept": {"text": med.get("name")},
                "subject": {"reference": f"urn:uuid:patient-{rec_id}"},
                "dosageInstruction": [{
                    "text": f"{med.get('dosage', '')} {med.get('frequency', '')} ({med.get('timing', '')}) for {med.get('duration', '')}",
                    "timing": {"code": {"text": med.get("frequency", "")}}
                }]
            }
        })

    if not record.get("abhaNumber"):
        bundle["entry"][0]["resource"].pop("identifier", None)
    # Document composition is the first resource; this export has not been profile-validated.
    bundle["entry"][0], bundle["entry"][1] = bundle["entry"][1], bundle["entry"][0]
    return bundle


# ---------------------------------------------------------------------------
# Realistic Pre-Curated Multi-Language Sample Health Records
# ---------------------------------------------------------------------------
SAMPLE_RECORDS = {
    "sample_lab": {
        "id": "REC-LAB-8921",
        "recordType": "Lab Report",
        "title": "Comprehensive Metabolic & Lipid Profile",
        "facility": "Dr. Carely Diagnostic Pathology Labs, Mumbai",
        "doctorName": "Dr. K. S. Sharma, MD (Biochemistry)",
        "patientName": "Ramesh Sharma (48M)",
        "date": "2026-09-18",
        "diagnoses": ["Elevated Fasting Glucose (Pre-Diabetes)", "Mixed Dyslipidemia (High LDL & Triglycerides)", "Borderline Anemia"],
        "medicines": [],
        "labTests": [
            {"test": "Fasting Blood Sugar", "value": "148", "unit": "mg/dL", "referenceRange": "70 - 99", "status": "HIGH", "interpretation": "Elevated above standard fasting range"},
            {"test": "HbA1c (Glycated Hemoglobin)", "value": "7.6", "unit": "%", "referenceRange": "4.0 - 5.6", "status": "HIGH", "interpretation": "Indicates 3-month average high blood glucose"},
            {"test": "Total Cholesterol", "value": "238", "unit": "mg/dL", "referenceRange": "< 200", "status": "HIGH", "interpretation": "Elevated circulating lipids"},
            {"test": "LDL ('Bad') Cholesterol", "value": "152", "unit": "mg/dL", "referenceRange": "< 100", "status": "HIGH", "interpretation": "High risk factor for arterial plaque"},
            {"test": "HDL ('Good') Cholesterol", "value": "42", "unit": "mg/dL", "referenceRange": "> 40", "status": "NORMAL", "interpretation": "Within protective range"},
            {"test": "Triglycerides", "value": "220", "unit": "mg/dL", "referenceRange": "< 150", "status": "HIGH", "interpretation": "High blood fat concentration"},
            {"test": "Serum Creatinine", "value": "0.9", "unit": "mg/dL", "referenceRange": "0.6 - 1.2", "status": "NORMAL", "interpretation": "Kidney filtration rate is healthy"},
            {"test": "Hemoglobin", "value": "11.8", "unit": "g/dL", "referenceRange": "13.0 - 17.0", "status": "LOW", "interpretation": "Slightly low red blood cell oxygen capacity"}
        ],
        "summary": "Your metabolic report indicates elevated blood sugar (HbA1c 7.6%) and high cholesterol markers that require medical guidance. The positive news is that your kidney filtration (creatinine) is in great shape.",
        "abnormalExplanation": "• HbA1c (7.6% vs normal < 5.6%): Measures your 3-month average blood glucose; this level suggests diabetes management is needed.\n• Fasting Glucose (148 mg/dL vs normal < 100): Confirms high baseline sugar levels.\n• LDL Cholesterol (152 mg/dL vs normal < 100): High levels of 'bad' cholesterol can cause arterial buildup over time.\n• Hemoglobin (11.8 g/dL): Slightly below normal, which may cause mild fatigue.",
        "selfCareTips": [
            "Opt for whole grains, green leafy vegetables, and reduce refined sugars and deep-fried snacks.",
            "Aim for 30 minutes of daily moderate walking to help cells absorb glucose naturally.",
            "Stay well hydrated with 2-3 liters of water daily."
        ],
        "doctorQuestions": [
            "Should we start a diabetes management medication such as Metformin?",
            "Do I need a cholesterol-lowering statin for my high LDL levels?",
            "When should I repeat my HbA1c and lipid panel?"
        ],
        "translations": {
            "hi": {
                "summary": "आपकी लैब रिपोर्ट में 3 महीने का औसत ब्लड शुगर (HbA1c 7.6%) और कोलेस्ट्रॉल का स्तर सामान्य से अधिक पाया गया है। अच्छी बात यह है कि आपकी किडनी की स्थिति (क्रिएटिनिन) पूरी तरह स्वस्थ और सामान्य है।",
                "abnormalExplanation": "• HbA1c (7.6% - सामान्य < 5.6%): पिछले 3 महीनों का शुगर स्तर बढ़ा हुआ है, जो डायबिटीज की ओर संकेत करता है।\n• खाली पेट शुगर (148 mg/dL): सामान्य 100 से अधिक है।\n• एलडीएल (खराब) कोलेस्ट्रॉल (152 mg/dL): धमनियों में जमाव को रोकने के लिए इसे कम करना जरूरी है।\n• हीमोग्लोबिन (11.8 g/dL): थोड़ा कम है, जिससे हल्की थकान हो सकती है।",
                "selfCareTips": ["मीठी चीजें और तली-भुनी चीजें कम करें।", "रोजाना 30 मिनट तेज टहलें।", "पर्याप्त पानी पिएं और हरी सब्जियां खाएं।"],
                "doctorQuestions": ["क्या मुझे शुगर की दवा शुरू करने की आवश्यकता है?", "क्या कोलेस्ट्रॉल के लिए स्टेटिन लेना चाहिए?", "दोबारा जांच कब करानी होगी?"]
            },
            "te": {
                "summary": "మీ రక్త నివేదికలో 3 నెలల సగటు చక్కెర స్థాయి (HbA1c 7.6%) మరియు కొలెస్ట్రాల్ సాధారణం కంటే ఎక్కువగా ఉన్నాయి. అయితే మీ కిడ్నీ పనితీరు (క్రియాటినిన్) పూర్తిగా ఆరోగ్యంగా ఉంది.",
                "abnormalExplanation": "• HbA1c (7.6% - సాధారణం < 5.6%): గత 3 నెలల్లో బ్లడ్ షుగర్ పెరిగిందని సూచిస్తుంది.\n• ఖాళీ కడుపు చక్కెర (148 mg/dL): నార్మల్ 100 కంటే ఎక్కువ.\n• ఎల్డీఎల్ కొలెస్ట్రాల్ (152 mg/dL): రక్తనాళాల ఆరోగ్యం కోసం దీన్ని నియంత్రించాలి.\n• హిమోగ్లోబిన్ (11.8 g/dL): స్వల్పంగా తగ్గింది, కొద్దిగా నీరసం రావచ్చు.",
                "selfCareTips": ["తీపి పదార్థాలు, వేపుళ్లు తగ్గించి ఆకుకూరలు ఎక్కువగా తీసుకోండి.", "రోజూ 30 నిమిషాలు నడవండి.", "సమృద్ధిగా నీరు తాగండి."],
                "doctorQuestions": ["షుగర్ కోసం మెట్ఫార్మిన్ వంటి మందులు అవసరమా?", "కొలెస్ట్రాల్ తగ్గించడానికి మందులు వాడాలా?", "తదుపరి రక్త పరీక్ష ఎప్పుడు చేయించాలి?"]
            },
            "ta": {
                "summary": "உங்கள் ஆய்வக அறிக்கையில் இரத்த சர்க்கரை அளவு (HbA1c 7.6%) மற்றும் கொலஸ்ட்ரால் இயல்பை விட அதிகமாக உள்ளது. உங்கள் சிறுநீரகம் (கிரியேட்டினின்) முற்றிலும் நலமாக உள்ளது.",
                "abnormalExplanation": "• HbA1c (7.6% - இயல்பு < 5.6%): கடந்த 3 மாதங்களில் சர்க்கரை அளவு உயர்ந்துள்ளது.\n• வெறும் வயிற்று சர்க்கரை (148 mg/dL): இயல்பான 100-ஐ விட அதிகம்.\n• எல்டிஎல் கொலஸ்ட்ரால் (152 mg/dL): கெட்ட கொழுப்பு சற்று அதிகம்.\n• ஹீமோகுளோபின் (11.8 g/dL): சற்று குறைவாக உள்ளது.",
                "selfCareTips": ["இனிப்புகள் மற்றும் பொரித்த உணவுகளை தவிருங்கள்.", "தினமும் 30 நிமிடங்கள் நடைப்பயிற்சி செய்யுங்கள்.", "நீர்ச்சத்து அதிகம் உள்ள காய்கறிகளை உண்ணுங்கள்."],
                "doctorQuestions": ["சர்க்கரைக்கு மாத்திரை தொடங்க வேண்டுமா?", "கொலஸ்ட்ராலை குறைக்க மருந்து தேவையா?", "அடுத்த பரிசோதனை எப்போது செய்ய வேண்டும்?"]
            }
        }
    },
    "sample_rx": {
        "id": "REC-RX-3419",
        "recordType": "Prescription",
        "title": "Bilingual OPD Doctor Prescription (Handwritten / Printed)",
        "facility": "Apex Multi-Care Clinic, Hyderabad",
        "doctorName": "Dr. A. Verma, MBBS, MD (General Medicine)",
        "patientName": "Sunita Patel (34F)",
        "date": "2026-10-04",
        "diagnoses": ["Acute Bronchitis", "Upper Respiratory Tract Infection (Bilingual Rx)"],
        "medicines": [
            {"name": "Amoxicillin + Clavulanic Acid (Augmentin 625 Duo)", "dosage": "625 mg", "frequency": "1-0-1 (Twice Daily)", "timing": "After Food (खाने के बाद / భోజనం తర్వాత)", "duration": "5 Days", "instructions": "Complete entire 5-day course even if fever resolves."},
            {"name": "Paracetamol (Dolo 650)", "dosage": "650 mg", "frequency": "1-0-1 SOS", "timing": "After Food", "duration": "3-5 Days", "instructions": "Take only if body temperature exceeds 100°F or severe headache."},
            {"name": "Montelukast + Levocetirizine (Montair-LC)", "dosage": "10mg / 5mg", "frequency": "0-0-1 (Night)", "timing": "At Bedtime (रात को सोते समय)", "duration": "10 Days", "instructions": "Helps relieve allergic chest congestion and night cough."},
            {"name": "Pantoprazole (Pan 40)", "dosage": "40 mg", "frequency": "1-0-0 (Morning)", "timing": "Empty Stomach (सुबह खाली पेट)", "duration": "5 Days", "instructions": "Protects stomach lining against antibiotic-induced acidity."}
        ],
        "labTests": [],
        "summary": "Dr. Verma prescribed an antibiotic course for acute chest infection, along with fever relief, night-time cough control, and an antacid to protect your stomach.",
        "abnormalExplanation": "No laboratory tests in this prescription. Please follow the medicine schedule carefully and take Pan 40 on an empty stomach 30 minutes before breakfast.",
        "selfCareTips": [
            "Do warm water steam inhalation twice daily for chest congestion.",
            "Drink warm water or soothing ginger-tulsi tea.",
            "Avoid chilled beverages and direct air-conditioner airflow."
        ],
        "doctorQuestions": [
            "If cough persists after 5 days, should I extend Montair-LC?",
            "Are there any food items I should strictly avoid while on Augmentin?"
        ],
        "translations": {
            "hi": {
                "summary": "डॉ. वर्मा ने सीने के संक्रमण और ब्रोंकाइटिस के लिए 5 दिन की एंटीबायोटिक, बुखार की गोली और रात की खांसी के लिए दवा लिखी है। पेट में जलन न हो इसके लिए खाली पेट पैन 40 दी गई है।",
                "abnormalExplanation": "इस पर्चे में कोई लैब टेस्ट नहीं है। एंटीबायोटिक का पूरा 5 दिन का कोर्स जरूर पूरा करें, भले ही आप पहले ही ठीक महसूस करने लगें।",
                "selfCareTips": ["दिन में 2 बार गर्म पानी की भाप लें।", "गुनगुना पानी और काढ़ा पिएं।", "ठंडी चीजों और आइसक्रीम से परहेज करें।"],
                "doctorQuestions": ["यदि 5 दिन बाद भी खांसी रहे तो क्या करें?", "क्या एंटीबायोटिक के साथ कोई विशेष परहेज है?"]
            },
            "te": {
                "summary": "డాక్టర్ వర్మ గారు ఛాతీ ఇన్ఫెక్షన్ నివారణకు 5 రోజుల యాంటీబయాటిక్, జ్వరం కోసం పారాసిటమాల్, రాత్రి దగ్గు కోసం మాంటైర్-ఎల్‌సి మరియు కడుపులో మంట రాకుండా పాన్ 40 సూచించారు.",
                "abnormalExplanation": "ఈ ప్రిస్క్రిప్షన్‌లో రక్త పరీక్షలు లేవు. యాంటీబయాటిక్ కోర్సును మధ్యలో ఆపకుండా 5 రోజులు పూర్తిగా వాడండి.",
                "selfCareTips": ["రోజుకు రెండుసార్లు ఆవిరి పట్టండి.", "గోరువెచ్చని నీరు మాత్రమే తాగండి.", "చల్లని పదార్థాలకు దూరంగా ఉండండి."],
                "doctorQuestions": ["5 రోజుల తర్వాత దగ్గు తగ్గకపోతే ఏం చేయాలి?", "మందులు వాడుతున్నప్పుడు ఏవైనా పథ్యాలు పాటించాలా?"]
            },
            "ta": {
                "summary": "மருத்துவர் வர்மா நெஞ்சு சளி மற்றும் மூச்சுக்குழாய் அழற்சிக்கு 5 நாட்களுக்கு ஆண்டிபயாடிக், காய்ச்சல் மாத்திரை மற்றும் நெஞ்செரிச்சல் மாத்திரையை பரிந்துரைத்துள்ளார்.",
                "abnormalExplanation": "இதில் ஆய்வக சோதனைகள் இல்லை. ஆண்டிபயாடிக் மருந்துகளை மருத்துவர் கூறியபடி 5 நாட்களும் தவறாமல் உட்கொள்ளவும்.",
                "selfCareTips": ["தினமும் இரண்டு முறை ஆவி பிடிக்கவும்.", "மிதமான வெந்நீர் குடிக்கவும்.", "குளிர்ந்த உணவுகளை தவிர்க்கவும்."],
                "doctorQuestions": ["5 நாட்களுக்குப் பிறகும் இருமல் தொடர்ந்தால் என்ன செய்ய வேண்டும்?"]
            }
        }
    },
    "sample_discharge": {
        "id": "REC-DC-7120",
        "recordType": "Discharge Summary",
        "title": "Hospital Inpatient Discharge Summary",
        "facility": "City Multispecialty Hospital & Research Center, Bangalore",
        "doctorName": "Dr. Priya Nair, MD (Internal Medicine)",
        "patientName": "Anil Kumar (41M)",
        "date": "2026-09-28",
        "diagnoses": ["Dengue Fever with Moderate Thrombocytopenia (Resolved)", "Acute Dehydration (Managed)"],
        "medicines": [
            {"name": "Paracetamol 650mg", "dosage": "650 mg", "frequency": "1-0-1 SOS", "timing": "After Food", "duration": "5 Days", "instructions": "For fever or body pain. Do NOT take Aspirin or Ibuprofen."},
            {"name": "Carica Papaya Leaf Extract", "dosage": "1100 mg", "frequency": "1-0-1", "timing": "After Food", "duration": "5 Days", "instructions": "Supports natural platelet recovery."},
            {"name": "Multivitamin + Zinc Capsule", "dosage": "1 cap", "frequency": "1-0-0", "timing": "After Breakfast", "duration": "15 Days", "instructions": "For immune recovery and rebuilding strength."}
        ],
        "labTests": [
            {"test": "Platelet Count (Admission)", "value": "38,000", "unit": "/mcL", "referenceRange": "150,000 - 450,000", "status": "CRITICAL", "interpretation": "Severe drop at peak of infection"},
            {"test": "Platelet Count (Discharge)", "value": "112,000", "unit": "/mcL", "referenceRange": "150,000 - 450,000", "status": "LOW", "interpretation": "Significantly recovered above safe discharge threshold"},
            {"test": "Hematocrit (PCV)", "value": "41", "unit": "%", "referenceRange": "38 - 50", "status": "NORMAL", "interpretation": "Good hydration status restored"},
            {"test": "Total Leucocyte Count (WBC)", "value": "5,400", "unit": "/mcL", "referenceRange": "4,000 - 11,000", "status": "NORMAL", "interpretation": "White blood cell count normalized"}
        ],
        "summary": "You have successfully recovered from acute Dengue fever and your platelet count has safely climbed from 38,000 to 112,000. Continue taking fluids and rest at home.",
        "abnormalExplanation": "• Platelet Count (112,000 /mcL): Much improved from 38,000, but still slightly below normal (150,000). It will continue rising over the next week.\n• Danger Signs: Watch for any gum bleeding, black stools, or severe abdominal pain and visit the ER immediately if they occur.",
        "selfCareTips": [
            "Drink plenty of coconut water, ORS electrolytes, and clear soups.",
            "Avoid intense physical exertion or contact sports for 10 days.",
            "Avoid Brufen, Combiflam, or Aspirin as they thin the blood."
        ],
        "doctorQuestions": [
            "When should I repeat the CBC test to confirm platelets reach 150,000+?",
            "When is it safe to resume normal office work and exercise?"
        ],
        "translations": {
            "hi": {
                "summary": "आप डेंगू बुखार से सफलतापूर्वक उबर चुके हैं और आपकी प्लेटलेट्स 38,000 से बढ़कर 1,12,000 तक पहुंच गई हैं। घर पर आराम करें और तरल पदार्थों का खूब सेवन करें।",
                "abnormalExplanation": "• प्लेटलेट काउंट (1,12,000): सुरक्षित स्थिति में है लेकिन सामान्य 1.5 लाख से अभी थोड़ा कम है। अगले हफ्ते तक यह पूरी तरह सामान्य हो जाएगी।\n• चेतावनी लक्षण: यदि मसूड़ों से खून आए या काला मल हो, तो तुरंत अस्पताल जाएं। ब्रूफेन या एस्पिरिन बिल्कुल न लें।",
                "selfCareTips": ["नारियल पानी, ओआरएस और सूप खूब पिएं।", "10 दिनों तक भारी काम न करें।", "दर्द के लिए केवल पैरासिटामोल लें।"],
                "doctorQuestions": ["प्लेटलेट्स सामान्य होने की पुष्टि के लिए सीबीसी टेस्ट कब दोहराना है?", "काम पर कब लौट सकते हैं?"]
            },
            "te": {
                "summary": "మీరు డెంగ్యూ జ్వరం నుండి విజయవంతంగా కోలుకున్నారు. మీ ప్లేట్‌లెట్స్ 38,000 నుండి 1,12,000కి సురక్షితంగా పెరిగాయి. ఇంట్లో తగినంత విశ్రాంతి తీసుకోండి.",
                "abnormalExplanation": "• ప్లేట్‌లెట్స్ (1,12,000): పరిస్థితి మెరుగైంది, సాధారణ 1.5 లక్షలకు చేరడానికి ఇంకొన్ని రోజులు పడుతుంది.\n• హెచ్చరిక: చిగుళ్ల నుండి రక్తం కారడం లేదా తీవ్రమైన కడుపునొప్పి వస్తే వెంటనే ఆసుపత్రికి వెళ్లండి. ఆస్పిరిన్ లేదా బ్రూఫెన్ వాడకూడదు.",
                "selfCareTips": ["కొబ్బరి నీళ్లు, ఓఆర్ఎస్ ద్రావణం పుష్కలంగా తాగండి.", "భారీ శ్రమ చేయకండి.", "నొప్పుల కోసం కేవలం పారాసిటమాల్ మాత్రమే వాడండి."],
                "doctorQuestions": ["ప్లేట్‌లెట్స్ మళ్లీ సరిచూసుకోవడానికి సీబీసీ పరీక్ష ఎప్పుడు చేయించాలి?"]
            },
            "ta": {
                "summary": "நீங்கள் டெங்கு காய்ச்சலில் இருந்து நலமடைந்துள்ளீர்கள். உங்கள் பிளேட்லெட் அளவு 38,000-ல் இருந்து 1,12,000 ஆக பாதுகாப்பாக உயர்ந்துள்ளது.",
                "abnormalExplanation": "• பிளேட்லெட் (1,12,000): நிலைமை கணிசமாக மேம்பட்டுள்ளது, அடுத்த சில நாட்களில் இயல்பு நிலையை அடையும்.\n• எச்சரிக்கை: ஈறுகளில் ரத்தம் வடிதல் அல்லது கருப்பு மலம் வந்தால் உடனடியாக அவசர சிகிச்சை பிரிவை அணுகவும். ஆஸ்பிரின் மாத்திரை உட்கொள்ள வேண்டாம்.",
                "selfCareTips": ["இளநீர் மற்றும் பழச்சாறுகள் அதிகம் அருந்தவும்.", "முழுமையான ஓய்வு எடுக்கவும்.", "புரூஃபென் போன்ற வலி நிவாரணிகளை தவிர்க்கவும்."],
                "doctorQuestions": ["மீண்டும் எப்போது ரத்த பரிசோதனை செய்ய வேண்டும்?"]
            }
        }
    }
}

# Attach ABDM FHIR R4 Bundle to each sample record
for k, rec in SAMPLE_RECORDS.items():
    rec["isDemo"] = True
    rec["abhaNumber"] = "91-4521-8932-7410"
    rec["fhirBundle"] = build_fhir_bundle(rec)


def normalize_record(value):
    """Validate OCR output before storing or exporting it."""
    if not isinstance(value, dict):
        raise ValueError("Analysis returned an invalid record.")
    record = {}
    for key in ("recordType", "title", "facility", "doctorName", "patientName", "date", "summary", "abnormalExplanation", "bodySite", "injuryDescription", "cause", "injuryStartDate"):
        item = value.get(key, "")
        record[key] = str(item).strip() if isinstance(item, (str, int, float)) else ""
    for key in ("bodySite", "injuryDescription", "cause"):
        record[key] = record[key][:500]
    record["documentedSeverity"] = value.get("documentedSeverity") if value.get("documentedSeverity") in ("low", "medium", "serious") else ""
    if not record["recordType"] or not record["summary"]:
        raise ValueError("Analysis did not contain a usable record.")
    for key in ("diagnoses", "selfCareTips", "doctorQuestions"):
        items = value.get(key, [])
        record[key] = [x.strip() for x in items if isinstance(x, str) and x.strip()] if isinstance(items, list) else []
    def ocr_text(item):
        text = str(item).strip() if isinstance(item, (str, int, float)) else ""
        if text.casefold() in {"unknown", "unclear", "illegible", "unreadable", "n/a", "not visible"}:
            return ""
        return text

    def confidence(item):
        raw = item.get("ocrConfidence", item.get("confidence"))
        if isinstance(raw, (int, float)) and not isinstance(raw, bool):
            # The model schema uses 0..1; stored records use a visible 0..100 scale.
            score = raw * 100 if 0 <= raw <= 1 else raw
            return max(0, min(100, round(score)))
        return None

    for key, fields in (
        ("medicines", ("name", "dosage", "strength", "form", "frequency", "timing", "duration", "instructions", "sourceText", "rawText")),
        ("labTests", ("test", "value", "unit", "referenceRange", "status", "interpretation", "sourceText")),
    ):
        items = value.get(key, [])
        record[key] = []
        for item in items if isinstance(items, list) else []:
            if not isinstance(item, dict):
                continue
            entry = {f: ocr_text(item.get(f)) for f in fields}
            if key == "medicines":
                entry["sourceText"] = entry["sourceText"] or entry["rawText"]
                entry["rawText"] = entry["rawText"] or entry["sourceText"]
                entry["dosage"] = entry["dosage"] or entry["strength"]
                entry["strength"] = entry["strength"] or entry["dosage"]
                alternatives = item.get("alternatives", [])
                entry["alternatives"] = [ocr_text(x) for x in alternatives if ocr_text(x)][:3] if isinstance(alternatives, list) else []
                reminder_times = item.get("reminderTimes", [])
                entry["reminderTimes"] = [x for x in reminder_times if isinstance(x, str) and re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", x)][:6] if isinstance(reminder_times, list) else []
            entry["ocrConfidence"] = confidence(item)
            entry["needsReview"] = not entry[fields[0]] or (entry["ocrConfidence"] is not None and entry["ocrConfidence"] < 70)
            if entry[fields[0]]:
                if key == "labTests" and entry["status"] not in ("NORMAL", "HIGH", "LOW", "CRITICAL"):
                    entry["status"] = "UNKNOWN"
                record[key].append(entry)
            elif key == "medicines" and entry["sourceText"]:
                record[key].append(entry)
    try:
        if record["date"]:
            datetime.strptime(record["date"], "%Y-%m-%d")
    except ValueError:
        record["date"] = ""
    record["verbatimTranscription"] = str(value.get("verbatimTranscription", "")).strip() if isinstance(value.get("verbatimTranscription"), str) else ""
    record["ocrConfidence"] = confidence(value)
    review_items = value.get("reviewItems", [])
    record["reviewItems"] = []
    for item in review_items if isinstance(review_items, list) else []:
        if not isinstance(item, dict):
            continue
        alternatives = item.get("alternatives", [])
        record["reviewItems"].append({
            "field": str(item.get("field", ""))[:80],
            "value": str(item.get("value", ""))[:300],
            "sourceText": str(item.get("sourceText", ""))[:500],
            "reason": str(item.get("reason", ""))[:200],
            "alternatives": [str(x)[:200] for x in alternatives[:3] if isinstance(x, str)] if isinstance(alternatives, list) else [],
        })
    try:
        datetime.strptime(record["injuryStartDate"], "%Y-%m-%d")
    except ValueError:
        record["injuryStartDate"] = ""
    record["reviewRequired"] = bool(value.get("reviewRequired", False)) or bool(record["reviewItems"]) or any(m.get("needsReview") for m in record["medicines"]) or "[unclear]" in record["verbatimTranscription"].casefold()
    record["imageQuality"] = value.get("imageQuality") if value.get("imageQuality") in ("good", "fair", "poor") else "unknown"
    record["medicinesConfirmed"] = bool(value.get("medicinesConfirmed", False))
    record["ocrVersion"] = 2 if record["verbatimTranscription"] else 0
    record["isDemo"] = False
    return record


def analyze_uploaded_image(image_b64: str, mime_type: str, target_lang: str = "en", compare_image_b64: str = "") -> dict:
    """Uses Gemini Vision (multimodal) to extract structured clinical data from medical records."""
    if not GEMINI_KEY:
        raise RuntimeError("Document analysis is not configured. Add a Gemini API key on the server, then try again.")
    lang_name = {"hi": "Hindi", "te": "Telugu", "ta": "Tamil"}.get(target_lang, "English")
    prompt = f"""You are transcribing a possibly handwritten or low-quality medical document. This is OCR, not diagnosis or treatment advice.
Perform these steps in order: first transcribe visible lines verbatim in their original language and line order; then extract structured fields only from that transcription and the image. Preserve spelling, punctuation, symbols, abbreviations and shorthand such as OD/BD/TDS/QID/SOS/HS/AC/PC, 1-0-1, Tab./Cap./Syp./Inj. and x 5 days. Keep the exact written notation; do not expand or normalize it unless the document itself does so.
For each medicine include its complete line in rawText and sourceText. Extract name, strength, form, dosage, frequency, timing, duration and instructions only when visible. If a medicine name is uncertain, set name to "illegible", give up to three plausible alternatives, and set confidence below 0.5. If a field cannot be read, use an empty string and mark that part [unclear] in the transcription. Never guess or silently correct a name.
Set each medicine confidence to your visual-reading confidence from 0.0 to 1.0. This is a model estimate, not a calibrated accuracy guarantee. Set imageQuality to good, fair, or poor based on legibility. Set reminderTimes only for exact 24-hour clock times (HH:MM) explicitly printed beside that medicine; never convert shorthand such as 1-0-1, BD, morning, or after food into clock times. Set reviewRequired true only when a key value is unclear or uncertain (including medicine details, diagnosis, body area, injury start/cause, or important test values); otherwise false. For every unclear non-medicine field add a reviewItems entry with field, current reading, exact source text, short reason, and possible readings if visible. Use canonical field names: diagnoses, bodySite, injuryDescription, cause, injuryStartDate, documentedSeverity. Extract injuryStartDate and severity only when explicitly stated; never treat the report date as the injury start date. Do not infer a diagnosis, body area, cause, severity, treatment conclusion, or clinical advice from medicines. The summary should describe only what is visible in the document, in {lang_name}.

Return ONLY strict JSON with this schema:
{{
  "recordType": "Prescription" or "Lab Report" or "Discharge Summary" or "Diagnostic Report",
  "title": "Short descriptive title",
  "facility": "Visible facility or empty string",
  "doctorName": "Visible doctor name or empty string",
  "patientName": "Visible patient name or empty string",
  "date": "YYYY-MM-DD or empty string",
  "verbatimTranscription": "All readable text in original language and line order; [unclear] for unreadable parts",
  "imageQuality": "good|fair|poor",
  "reviewRequired": false,
  "reviewItems": [],
  "diagnoses": ["diagnosis or condition explicitly written in the document; otherwise empty"],
  "bodySite": "body area explicitly named in the document, otherwise empty",
  "injuryDescription": "injury explicitly described in the document, otherwise empty",
  "cause": "cause or mechanism only if explicitly stated in the document, otherwise empty",
  "injuryStartDate": "YYYY-MM-DD only if explicitly stated as when it started, otherwise empty",
  "documentedSeverity": "low|medium|serious only if explicitly written, otherwise empty",
  "medicines": [{{"rawText":"complete exact line","sourceText":"same exact line","name":"exact name or illegible","strength":"visible strength or empty","form":"visible form or empty","dosage":"visible dosage or empty","frequency":"visible notation or empty","timing":"visible timing or empty","duration":"visible duration or empty","instructions":"other visible instruction or empty","confidence":0.0,"reminderTimes":[],"alternatives":[]}}],
  "labTests": [{{"test":"visible parameter","value":"visible value","unit":"visible unit or empty","referenceRange":"visible range or empty","status":"NORMAL|HIGH|LOW|CRITICAL|UNKNOWN","interpretation":"explicitly printed interpretation or empty","sourceText":"exact original line"}}],
  "summary": "A concise description of the document in {lang_name}; no inferred diagnoses or advice",
  "abnormalExplanation": "Only what the document explicitly states, otherwise empty",
  "selfCareTips": [],
  "doctorQuestions": []
}}
Extract diagnoses and injury details only when explicitly written; never infer them from medicines, lab results, or context. Do not invent patient facts, diagnoses, values, medication details, confidence, or alternatives. Use empty strings/arrays when the document does not state them. Respond with valid JSON only, no markdown or commentary."""

    candidate_models = list(dict.fromkeys([DEFAULT_MODEL, "gemini-3.1-flash-lite"]))
    for model_name in candidate_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_KEY}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": image_b64
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 4096,
                "responseMimeType": "application/json",
                "mediaResolution": "MEDIA_RESOLUTION_HIGH"
            }
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=35) as r:
                res_data = json.loads(r.read())
            cands = res_data.get("candidates", [])
            if cands:
                parts = cands[0].get("content", {}).get("parts", [])
                raw_text = "".join(p.get("text", "") for p in parts if "text" in p).strip()
                clean_json = re.sub(r"^```(?:json)?\s*", "", raw_text)
                clean_json = re.sub(r"\s*```$", "", clean_json).strip()
                parsed = normalize_record(json.loads(clean_json))
                record_type = parsed["recordType"].strip().casefold()
                if "prescription" in record_type or record_type == "rx":
                    documented_details = [parsed.get("injuryDescription", ""), "; ".join(parsed.get("diagnoses", [])), parsed.get("bodySite", ""), parsed.get("cause", "")]
                    documented_details = [item for item in documented_details if item]
                    parsed["summary"] = ("The document states: " + ". ".join(documented_details) + ".") if documented_details else "Prescription transcribed. The document does not clearly state a condition or injury."
                    parsed["abnormalExplanation"] = ""
                    parsed["selfCareTips"] = []
                    parsed["doctorQuestions"] = []
                    parsed["medicinesConfirmed"] = False
                    if compare_image_b64 and parsed.get("reviewRequired"):
                        # Independent pass on a grayscale/contrast-enhanced rendition. Agreement
                        # modestly raises the model estimate; disagreement always flags review.
                        try:
                            second = analyze_uploaded_image(compare_image_b64, "image/jpeg", target_lang)
                        except Exception as compare_error:
                            print(f"[OCR] Comparison pass unavailable: {type(compare_error).__name__}")
                            second = None
                        if second:
                            second_medicines = second.get("medicines", [])
                            for index, medicine in enumerate(parsed["medicines"]):
                                if index >= len(second_medicines):
                                    medicine["ocrConfidence"] = min(float(medicine.get("ocrConfidence") or 0), 45)
                                    medicine["needsReview"] = True
                                    continue
                                other = second_medicines[index]
                                first_name = str(medicine.get("name", "")).strip().casefold()
                                second_name = str(other.get("name", "")).strip().casefold()
                                first_conf = float(medicine.get("ocrConfidence") or 0)
                                second_conf = float(other.get("ocrConfidence") or 0)
                                if first_name and first_name == second_name and first_name != "illegible":
                                    medicine["ocrConfidence"] = min(95, max(first_conf, second_conf, (first_conf + second_conf) / 2 + 12))
                                else:
                                    medicine["ocrConfidence"] = min(first_conf, second_conf, 49)
                                    medicine["needsReview"] = True
                                    suggestions = list(medicine.get("alternatives", []))
                                    if other.get("name") and str(other["name"]).casefold() != "illegible":
                                        suggestions.append(str(other["name"]))
                                    medicine["alternatives"] = list(dict.fromkeys(suggestions))[:3]
                            for extra in second_medicines[len(parsed["medicines"]):]:
                                extra["ocrConfidence"] = min(float(extra.get("ocrConfidence") or 0), 35)
                                extra["needsReview"] = True
                                parsed["medicines"].append(extra)
                            parsed["imageQuality"] = "poor" if "poor" in (parsed.get("imageQuality"), second.get("imageQuality")) else ("fair" if "fair" in (parsed.get("imageQuality"), second.get("imageQuality")) else parsed.get("imageQuality", "unknown"))
                            parsed["fhirBundle"] = build_fhir_bundle(parsed)
                        else:
                            for medicine in parsed["medicines"]:
                                medicine["needsReview"] = True
                parsed["reviewRequired"] = bool(parsed.get("reviewRequired")) or bool(parsed.get("reviewItems")) or any(m.get("needsReview") for m in parsed.get("medicines", [])) or "[unclear]" in parsed.get("verbatimTranscription", "").casefold()
                parsed["id"] = "REC-OCR-" + uuid.uuid4().hex[:6].upper()
                parsed["fhirBundle"] = build_fhir_bundle(parsed)
                return parsed
        except Exception as e:
            print(f"[OCR] Error with model {model_name}: {e}, trying fallback...")
            continue

    raise RuntimeError("We could not read this document. Try a clearer image or try again later. No record was added.")


# ---------------------------------------------------------------------------
# HTTP Handler
# ---------------------------------------------------------------------------
MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_BODY_BYTES = 20 * 1024 * 1024
PUBLIC_ROOT = Path(__file__).resolve().parent
APP_PAGE = "Mr.Doc – Health Copilot (3).html"
MAINTENANCE_MODE = False
UPLOAD_TYPES = {"image/png", "image/jpeg", "image/webp", "application/pdf"}


def validate_upload(encoded, mime_type):
    if mime_type not in UPLOAD_TYPES or not isinstance(encoded, str):
        raise ValueError("Choose a PNG, JPEG, WebP image or PDF.")
    try:
        data = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error):
        raise ValueError("The uploaded file could not be read.")
    if not data or len(data) > MAX_FILE_BYTES:
        raise ValueError("Choose a non-empty file smaller than 10 MB.")
    matches = {
        "image/png": data.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/jpeg": data.startswith(b"\xff\xd8\xff"),
        "image/webp": data.startswith(b"RIFF") and data[8:12] == b"WEBP",
        "application/pdf": data.startswith(b"%PDF-"),
    }
    if not matches[mime_type]:
        raise ValueError("The file contents do not match its format.")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC_ROOT), **kwargs)

    def send_head(self):
        path = unquote(urlsplit(self.path).path)
        if path in ("/", "/index.html"):
            query = urlsplit(self.path).query
            self.path = f"/{APP_PAGE}" + (f"?{query}" if query else "")
            path = f"/{APP_PAGE}"
        public_file = path in (f"/{APP_PAGE}", "/styles.css", "/app.js")
        public_asset = (path == "/assets/voice-orb.html" or
                        (path.startswith("/assets/") and Path(path).suffix.lower() in
                         (".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico")))
        public_video = path in ("/frames/outputs/DOC_SPEAKS_2.0.mp4", "/frames/outputs/animation.mp4")
        resolved = Path(self.translate_path(self.path)).resolve()
        if not (public_file or public_asset or public_video) or PUBLIC_ROOT not in resolved.parents and resolved != PUBLIC_ROOT:
            self.send_error(404)
            return None
        if resolved.is_dir() and path != "/":
            self.send_error(404)
            return None
        return super().send_head()

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        if urlsplit(self.path).path == "/api/sample-records":
            return self.reply(200, SAMPLE_RECORDS)
        return super().do_GET()

    def read_json(self):
        if self.headers.get_content_type() != "application/json":
            raise ValueError("Expected a JSON request.")
        try:
            size = int(self.headers.get("Content-Length", 0))
        except (TypeError, ValueError):
            raise ValueError("Invalid request size.")
        if size <= 0 or size > MAX_BODY_BYTES:
            self.close_connection = True
            raise ValueError("Request is empty or too large (maximum upload: 10 MB).")
        self.connection.settimeout(30)
        value = json.loads(self.rfile.read(size).decode("utf-8"))
        if not isinstance(value, dict):
            raise ValueError("Expected a JSON object.")
        return value

    def do_POST(self):
        route = urlsplit(self.path).path
        if route not in ("/api/chat", "/api/analyze-record", "/api/abha-sync"):
            return self.reply(404, {"error": "Unknown endpoint."})
        try:
            data = self.read_json()
            language = data.get("language", "en")
            if language not in ("en", "hi", "te", "ta"):
                raise ValueError("Unsupported language.")
            if route == "/api/chat":
                prompt = data.get("prompt", "")
                if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 40000:
                    raise ValueError("Enter a message under 40,000 characters.")
                if GEMINI_KEY:
                    text = call_gemini(prompt)
                elif ANTHROPIC_KEY:
                    text = call_anthropic(prompt)
                else:
                    raise RuntimeError("AI chat is not configured on this server. Please add an API key.")
                if not text:
                    raise RuntimeError("The chat service returned an empty response. Please try again.")
                audio = call_gemini_tts(text) if GEMINI_KEY and data.get("voice", True) else ""
                return self.reply(200, {"text": text, "audio": audio, "fixedVoice": bool(audio)})
            if route == "/api/analyze-record":
                sample_id = data.get("sampleId")
                if sample_id is not None:
                    if not isinstance(sample_id, str) or sample_id not in SAMPLE_RECORDS:
                        raise ValueError("Unknown demonstration record.")
                    record = json.loads(json.dumps(SAMPLE_RECORDS[sample_id]))
                    translation = record.get("translations", {}).get(language, {})
                    for key in ("summary", "abnormalExplanation", "selfCareTips", "doctorQuestions"):
                        if key in translation:
                            record[key] = translation[key]
                else:
                    encoded = data.get("image")
                    mime_type = data.get("mimeType")
                    validate_upload(encoded, mime_type)
                    processed = data.get("processedImage", "")
                    if processed:
                        validate_upload(processed, "image/jpeg")
                        if len(base64.b64decode(processed)) > 4 * 1024 * 1024:
                            raise ValueError("The enhanced image is too large. Choose a smaller photo.")
                    record = analyze_uploaded_image(encoded, mime_type, language, processed if mime_type.startswith("image/") else "")
                audio = call_gemini_tts(record["summary"]) if GEMINI_KEY and data.get("voice", True) else ""
                return self.reply(200, {"success": True, "record": record, "audio": audio})
            # This endpoint remains an explicitly labelled local demonstration.
            return self.reply(200, {
                "success": True, "demo": True,
                "abhaAddress": str(data.get("abhaId", ""))[:100],
                "abhaNumber": str(data.get("abhaNumber", ""))[:30],
                "status": "DEMO_ONLY", "nhaGateway": "Local mock gateway",
                "syncedRecords": list(SAMPLE_RECORDS.values()),
                "message": "Demonstration records loaded. No ABHA account was connected."
            })
        except (ValueError, UnicodeError) as error:
            return self.reply(400, {"success": False, "error": str(error)})
        except RuntimeError as error:
            return self.reply(503, {"success": False, "error": str(error)})
        except Exception as error:
            print(f"[API] Request failed: {type(error).__name__}")
            return self.reply(502, {"success": False, "error": "The service could not complete this request. Please try again."})

    def reply(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass


if __name__ == "__main__":
    os.chdir(PUBLIC_ROOT)
    # Keep the health-data demo local by default. Set HOST=0.0.0.0 explicitly
    # when running behind a deployment platform or when LAN access is intended.
    host = os.environ.get("HOST", "127.0.0.1")
    tts_status = f"Gemini TTS ({GEMINI_TTS_VOICE})" if GEMINI_KEY else "Browser Speech"
    print(f"Mr.Doc AI Health Copilot listening on {host}:{PORT}")
    print(f"Open http://localhost:{PORT} in this computer's browser.")
    print(f"Features: Multimodal OCR | FHIR Export | Multi-Language | Voice ({tts_status})")
    http_server = ThreadingHTTPServer((host, PORT), Handler)
    try:
        http_server.serve_forever()
    except KeyboardInterrupt:
        print("\nMr.Doc server stopped.")
    finally:
        http_server.server_close()
