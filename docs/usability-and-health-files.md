# Patient controls and health files

Mr.Doc keeps its existing light theme, chat, animated character, welcome video, tutorial, record library, timeline, healing tracker, and doctor-visit summary. The reference screenshots were used for interaction ideas; no reference-site source or account data was copied into the app.

## Upload and chat

- Choose a file or take a photo from chat or Medical Records. On supported mobile devices, the photo input requests the rear camera; desktop browsers may open a file picker.
- The loading screen and retry notice name the selected file. Selecting another file replaces the old retry, so the button cannot accidentally retry an earlier report.
- One animated progress bar remains visible during analysis. It is indeterminate because the AI endpoint does not report actual OCR progress; it reaches the completed state only after a successful response.
- A failed upload offers **Try again** using the last file retained in memory. Reloading the page or dismissing the message releases that file. Poor-quality photos instead offer **Choose another file**. Quota failures require provider quota to become available; retry does not increase quota.
- Upload success returns to chat. Full results open only when the user chooses them.
- General condition questions request a brief definition, relevant practical guidance, and when to seek care. Greetings and simple facts stay short. Answers must not infer a diagnosis from medicines or describe diet as a cure. The National Cancer Institute's [explanation of cancer](https://www.cancer.gov/about-cancer/understanding/what-is-cancer) is an example of the kind of plain-language education this interaction should provide; the app does not browse or retrieve that page for every answer.

## Optional profile controls

- Personal fields are available in a collapsed section. The first clearly extracted patient name can fill an empty profile name; old report ages are not silently treated as the patient's current age.
- Age and sex are optional context, and must not replace facts printed in a document. The OCR prompt preserves the report's own ranges. Missing ranges remain missing. [MedlinePlus explains why ranges and clinical context vary](https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/).
- **Use larger text** increases reading size, line spacing, and tap targets and saves the preference in this browser. Reduced motion continues to follow the device setting.
- Profile shortcuts put chat, reports, timeline, and larger text directly below the profile summary. Changing text size preserves open sections and unsaved card readings, with keyboard focus staying on the button.
- An optional ABHA card photo is sent to the configured Gemini service to transcribe a visible number and address. Unclear identifiers stay blank. Users check the readings before saving them. Syntax checks do not verify an ABHA identity. This feature does not authenticate, link, import from, or share with ABDM. A saved number is labelled unverified on the printable visit summary and is not included in ordinary chat context.

## Backup and import

**Download health backup** builds a FHIR R4 `Bundle` of type `collection`, using Patient, DocumentReference, Condition, Observation, and MedicationRequest resources. Unique local references connect resources to their patient. App-specific JSON attachments preserve exact record details, original-script transcription, review state, profile fields, and record-linked healing progress during a Mr.Doc round trip. Chat history is not part of a health backup.

The implementation follows the [HL7 R4 Bundle](https://hl7.org/fhir/R4/bundle.html) and [Patient](https://hl7.org/fhir/R4/patient.html) structures. A synthetic exported bundle passed the official HL7 R4 JSON schema check during development. This is not validation against an ABDM implementation guide, terminology service, or all FHIR clinical invariants. No ABDM profile or clinical code is claimed unless it was actually supplied.

**Import health file** reads JSON locally, up to 5 MB and 2,000 entries. It accepts Mr.Doc backups and a supported subset of external R4 collection, document, or search-result bundles. External imports require exactly one included Patient and matching clinical subject references. Lab values, comparators, units, printed ranges, conditions, and written medicine instructions are retained; missing details are not inferred. Local Medication references can be resolved from the same file. Transaction requests, duplicate resource URLs, ambiguous patient references, and malformed bundles are rejected. Entered-in-error findings are excluded. Unsupported resources are counted in the import preview; this is not a general-purpose FHIR server or a whole-file conformance validator.

Import shows a preview before saving, keeps existing records, skips existing record IDs, and fills only empty matching profile fields. Medicines from external files require review; provisional lab results are excluded from trends until confirmed. Content is treated as data, never executed, and external resource URLs are not fetched.

The **Clear all data** option remains at the bottom of Medical Records. Its warning and confirmation describe the browser records, chats, reminders, progress, and profile that it removes. Sample records are not automatically added to an empty history.
