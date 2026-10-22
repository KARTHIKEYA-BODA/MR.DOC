import json
import unittest
from unittest.mock import patch

import server


class RecordTranslationTests(unittest.TestCase):
    def test_gemini_translation_uses_json_prompt_and_larger_output_limit(self):
        expected = {
            "summary": "తెలుగులో సారాంశం",
            "abnormalExplanation": "",
            "selfCareTips": [],
            "doctorQuestions": [],
        }
        with patch.object(server, "GEMINI_KEY", "configured"), patch.object(server, "ANTHROPIC_KEY", ""), patch.object(
            server, "call_gemini", return_value=json.dumps(expected, ensure_ascii=False)
        ) as call:
            result = server.translate_record({"summary": "A simple summary"}, "te")

        self.assertEqual(result["summary"], expected["summary"])
        prompt = call.call_args.args[0]
        self.assertIn("Telugu", prompt)
        self.assertEqual(call.call_args.kwargs["system_prompt"], server.TRANSLATION_SYSTEM_PROMPT)
        self.assertEqual(call.call_args.kwargs["max_output_tokens"], 4096)

    def test_anthropic_translation_uses_translation_instructions(self):
        expected = {
            "summary": "हिंदी में सारांश",
            "abnormalExplanation": "",
            "selfCareTips": [],
            "doctorQuestions": [],
        }
        with patch.object(server, "GEMINI_KEY", ""), patch.object(server, "ANTHROPIC_KEY", "configured"), patch.object(
            server, "call_anthropic", return_value=json.dumps(expected, ensure_ascii=False)
        ) as call:
            result = server.translate_record({"summary": "A simple summary"}, "hi")

        self.assertEqual(result["summary"], expected["summary"])
        self.assertEqual(call.call_args.kwargs["system_prompt"], server.TRANSLATION_SYSTEM_PROMPT)
        self.assertEqual(call.call_args.kwargs["max_tokens"], 4096)

    def test_missing_translation_credentials_returns_clear_error(self):
        with patch.object(server, "GEMINI_KEY", ""), patch.object(server, "ANTHROPIC_KEY", ""):
            with self.assertRaisesRegex(RuntimeError, "translation is not configured"):
                server.translate_record({"summary": "A simple summary"}, "en")


if __name__ == "__main__":
    unittest.main()
