"""Protocol and review checks with fictional data; no model/API calls."""

import copy
import base64
import importlib.util
import io
import json
import unittest
from unittest import mock

import server
from unlimited_ocr import (
    MAX_RESPONSE_BYTES, PDFPageLimitExceeded, PDFReaderUnavailable,
    UnlimitedOCRClient, UnlimitedOCRError, apply_secondary_review, clean_ocr_text,
)


def fictional_record():
    return {
        "id": "REC-OCR-FICTIONAL", "recordType": "Lab Report", "date": "2026-01-01",
        "patientName": "Fictional test patient", "title": "Synthetic report",
        "summary": "Example Marker is 140 mg/dL.", "reviewRequired": False, "reviewItems": [],
        "medicinesConfirmed": True,
        "medicines": [{"name": "ExampleMed", "strength": "10 mg", "frequency": "1-0-1",
                       "ocrConfidence": 82, "needsReview": False, "userVerified": False}],
        "labTests": [{"test": "Example Marker", "value": "140", "unit": "mg/dL", "status": "HIGH"}],
    }


def response_bytes(content="Example text", finish="stop"):
    return json.dumps({"choices": [{"finish_reason": finish, "message": {"content": content}}]}).encode()


class ClientTests(unittest.TestCase):
    def setUp(self):
        self.client = UnlimitedOCRClient("http://127.0.0.1:10000/v1", api_key="fictional-test-key")

    def test_official_vllm_image_recipe(self):
        with mock.patch("unlimited_ocr.urllib.request.build_opener") as factory:
            factory.return_value.open.return_value = io.BytesIO(response_bytes())
            self.assertEqual(self.client.transcribe("aW1hZ2U=", "image/png"), "Example text")
            request = factory.return_value.open.call_args.args[0]
            body = json.loads(request.data)
            self.assertEqual(request.full_url, "http://127.0.0.1:10000/v1/chat/completions")
            self.assertEqual(body["model"], "baidu/Unlimited-OCR")
            self.assertEqual(body["messages"][0]["content"][0]["text"], "<image>document parsing.")
            self.assertEqual(body["messages"][0]["content"][1]["image_url"]["url"], "data:image/png;base64,aW1hZ2U=")
            self.assertFalse(body["skip_special_tokens"])
            self.assertFalse(body["stream"])
            self.assertEqual(body["vllm_xargs"], {"ngram_size": 35, "window_size": 128})
            self.assertEqual(request.get_header("Authorization"), "Bearer fictional-test-key")

    def test_multipage_uses_complete_ordered_input_and_long_window(self):
        with mock.patch.object(UnlimitedOCRClient, "_images", return_value=[("image/jpeg", "PAGE_ONE"), ("image/jpeg", "PAGE_TWO")]), mock.patch("unlimited_ocr.urllib.request.build_opener") as factory:
            factory.return_value.open.return_value = io.BytesIO(response_bytes())
            self.client.transcribe("cGRm", "application/pdf")
            payload = json.loads(factory.return_value.open.call_args.args[0].data)
            content = payload["messages"][0]["content"]
            self.assertEqual(content[0]["text"], "<image>Multi page parsing.")
            self.assertTrue(content[1]["image_url"]["url"].endswith("PAGE_ONE"))
            self.assertTrue(content[2]["image_url"]["url"].endswith("PAGE_TWO"))
            self.assertEqual(payload["vllm_xargs"]["window_size"], 1024)

    def test_truncated_empty_and_oversized_results_are_not_accepted(self):
        for raw in (response_bytes("partial", "length"), response_bytes(""), b"x" * (MAX_RESPONSE_BYTES + 1)):
            with self.subTest(size=len(raw)), mock.patch("unlimited_ocr.urllib.request.build_opener") as factory:
                factory.return_value.open.return_value = io.BytesIO(raw)
                with self.assertRaises(UnlimitedOCRError):
                    self.client.transcribe("aW1hZ2U=", "image/png")

    def test_service_errors_do_not_echo_credentials(self):
        with mock.patch("unlimited_ocr.urllib.request.build_opener") as factory:
            factory.return_value.open.side_effect = RuntimeError("private-url-and-key")
            with self.assertRaises(UnlimitedOCRError) as error:
                self.client.transcribe("aW1hZ2U=", "image/png")
            self.assertNotIn("private-url-and-key", str(error.exception))

    def test_url_forms_and_invalid_urls(self):
        for url in ("http://localhost:10000", "http://localhost:10000/v1/", "http://localhost:10000/v1/chat/completions"):
            self.assertEqual(UnlimitedOCRClient(url)._endpoint(), "http://localhost:10000/v1/chat/completions")
        for url in ("file:///private", "http://user:secret@localhost", "https://example.org?key=secret"):
            with self.assertRaises(UnlimitedOCRError):
                UnlimitedOCRClient(url)._endpoint()

    def test_pdf_page_limit_rejects_whole_document_before_rendering(self):
        pdfium = mock.MagicMock()
        pdf = pdfium.PdfDocument.return_value
        pdf.__len__.return_value = 9
        with mock.patch.dict("sys.modules", {"pypdfium2": pdfium, "PIL": mock.MagicMock()}):
            with self.assertRaises(PDFPageLimitExceeded):
                self.client._images("JVBERg==", "application/pdf")
        pdf.__getitem__.assert_not_called()

    def test_layout_cleanup_keeps_scripts_and_table_values(self):
        raw = "<|det|>text [0,0,10,10]<|/det|>నమూనా\n<|ref|>दवा 10 mg<|/ref|><|det|>[[0,0,10,10]]<|/det|>\n| Test | 140 mg/dL |\n<|det|>image [0,0,2,2]<|/det|>illustration\n<|endoftext|>"
        clean = clean_ocr_text(raw)
        self.assertIn("నమూనా", clean)
        self.assertIn("दवा 10 mg", clean)
        self.assertIn("| Test | 140 mg/dL |", clean)
        self.assertNotIn("illustration", clean)
        self.assertNotIn("<|", clean)

    @unittest.skipUnless(importlib.util.find_spec("pypdfium2"), "Optional PDF renderer is not installed")
    def test_real_pdf_render_keeps_page_order_and_bounded_dimensions(self):
        import pypdfium2 as pdfium
        from PIL import Image
        output = io.BytesIO()
        pdf = pdfium.PdfDocument.new()
        try:
            pdf.new_page(72, 144).close()
            pdf.new_page(144, 72).close()
            pdf.save(output)
        finally:
            pdf.close()
        images = self.client._images(base64.b64encode(output.getvalue()).decode(), "application/pdf")
        self.assertEqual(len(images), 2)
        dimensions = []
        for mime, encoded in images:
            self.assertEqual(mime, "image/jpeg")
            with Image.open(io.BytesIO(base64.b64decode(encoded))) as image:
                dimensions.append(image.size)
        self.assertEqual(dimensions, [(144, 288), (288, 144)])


class SecondaryReviewTests(unittest.TestCase):
    def test_agreement_never_clears_existing_uncertainty_or_boosts_score(self):
        record = fictional_record()
        record["medicines"][0]["needsReview"] = True
        apply_secondary_review(record, "ExampleMed 10mg 1-0-1\nExample Marker 140 mg/dL")
        self.assertTrue(record["medicines"][0]["needsReview"])
        self.assertEqual(record["medicines"][0]["ocrConfidence"], 82)
        self.assertEqual(record["reviewItems"], [])

    def test_another_medicines_dose_does_not_corroborate_this_medicine(self):
        record = fictional_record()
        apply_secondary_review(record, "ExampleMed 20mg 1-0-1\nOtherExample 10mg\nExample Marker 140 mg/dL")
        medicine = record["medicines"][0]
        self.assertTrue(medicine["needsReview"])
        self.assertFalse(record["medicinesConfirmed"])
        self.assertEqual(medicine["strength"], "10 mg")
        self.assertIn("strength or dose", medicine["reviewReason"])

    def test_medicine_name_is_not_matched_as_another_name_prefix(self):
        record = fictional_record()
        apply_secondary_review(record, "ExampleMedExtra 10mg 1-0-1\nExample Marker 140 mg/dL")
        self.assertTrue(record["medicines"][0]["needsReview"])

    def test_regional_vowel_marks_are_not_discarded_when_matching_names(self):
        for first, other in (("कल", "काल"), ("కల", "కాల")):
            with self.subTest(script=first):
                record = fictional_record()
                record["medicines"][0]["name"] = first
                apply_secondary_review(record, f"{other} 10mg 1-0-1\nExample Marker 140 mg/dL")
                self.assertTrue(record["medicines"][0]["needsReview"])

    def test_lab_disagreement_flags_fields_without_changing_values(self):
        record = fictional_record()
        text = "ExampleMed 10mg 1-0-1\nExample Marker 120 mmol/L\nOther Marker 140 mg/dL"
        apply_secondary_review(record, text)
        apply_secondary_review(record, text)
        self.assertEqual(record["labTests"][0]["value"], "140")
        self.assertTrue(record["labTests"][0]["needsReview"])
        self.assertEqual({item["field"] for item in record["reviewItems"]}, {"lab:0:value", "lab:0:unit"})
        self.assertEqual(len(record["reviewItems"]), 2)
        self.assertEqual(record["ocrReaders"], ["Gemini Vision", "Unlimited-OCR"])


class PipelineTests(unittest.TestCase):
    def run_pipeline(self, configured=True, transcription="ExampleMed 10mg 1-0-1\nExample Marker 140 mg/dL", error=None):
        client = mock.Mock(configured=configured)
        client.transcribe.return_value = transcription
        client.transcribe.side_effect = error
        with mock.patch.object(server, "GEMINI_KEY", "fictional"), mock.patch.object(server.UnlimitedOCRClient, "from_env", return_value=client), mock.patch.object(server, "_analyze_with_gemini", return_value=copy.deepcopy(fictional_record())):
            record = server.analyze_uploaded_image("aW1hZ2U=", "image/png")
        return record, client

    def test_disabled_reader_makes_no_request(self):
        record, client = self.run_pipeline(configured=False)
        client.transcribe.assert_not_called()
        self.assertEqual(record["secondaryOcrStatus"], "not_configured")

    def test_unavailable_reader_keeps_primary_upload_working(self):
        for error, status in ((TimeoutError(), "unavailable"), (PDFReaderUnavailable(), "pdf_unavailable"), (PDFPageLimitExceeded(), "page_limit")):
            with self.subTest(status=status):
                record, _ = self.run_pipeline(error=error)
                self.assertEqual(record["id"], "REC-OCR-FICTIONAL")
                self.assertEqual(record["secondaryOcrStatus"], status)
                self.assertEqual(record["ocrReaders"], ["Gemini Vision"])
                self.assertNotIn("secondaryOcrText", record)

    def test_unverified_lab_number_is_not_repeated_in_summary_or_exported_as_final(self):
        record, _ = self.run_pipeline(transcription="ExampleMed 10mg 1-0-1\nExample Marker 120 mg/dL")
        self.assertNotIn("140", record["summary"])
        observation = next(item["resource"] for item in record["fhirBundle"]["entry"] if item["resource"]["resourceType"] == "Observation")
        self.assertEqual(observation["status"], "preliminary")

    def test_comparison_pass_does_not_invoke_unlimited_twice(self):
        parsed = fictional_record()
        parsed["recordType"] = "Prescription"
        parsed["medicines"][0]["confidence"] = 0.4
        parsed["medicines"][0].pop("ocrConfidence")
        parsed["medicines"][0]["rawText"] = "ExampleMed 10mg 1-0-1"
        payload = {"candidates": [{"content": {"parts": [{"text": json.dumps(parsed)}]}}]}
        client = mock.Mock(configured=True)
        client.transcribe.return_value = "ExampleMed 10mg 1-0-1\nExample Marker 140 mg/dL"
        with mock.patch.object(server, "GEMINI_KEY", "fictional"), mock.patch.object(server.UnlimitedOCRClient, "from_env", return_value=client), mock.patch.object(server.urllib.request, "urlopen", side_effect=lambda *a, **k: io.BytesIO(json.dumps(payload).encode())) as primary:
            record = server.analyze_uploaded_image("aW1hZ2U=", "image/png", compare_image_b64="aW1hZ2U=")
        self.assertEqual(primary.call_count, 2)
        client.transcribe.assert_called_once()
        self.assertEqual(record["secondaryOcrStatus"], "used")

    def test_missing_gemini_configuration_does_not_send_an_orphan_secondary_upload(self):
        with mock.patch.object(server, "GEMINI_KEY", ""), mock.patch.object(server.UnlimitedOCRClient, "from_env") as factory:
            with self.assertRaises(RuntimeError):
                server.analyze_uploaded_image("aW1hZ2U=", "image/png")
            factory.assert_not_called()


if __name__ == "__main__":
    unittest.main()
