"""Optional Unlimited-OCR client for the official vLLM serving recipe.

The GPU model runs as a separate service. Images need only Python's standard
library here; PDF rendering additionally needs requirements-unlimited-ocr.txt.
"""

import base64
import io
import json
import os
import re
import threading
import unicodedata
import urllib.error
import urllib.request
from dataclasses import dataclass
from urllib.parse import urlsplit


MAX_TEXT_CHARS = 60000
MAX_RESPONSE_BYTES = 2 * 1024 * 1024
PDF_RENDER_LOCK = threading.Lock()  # PDFium is not thread safe.


class UnlimitedOCRError(RuntimeError):
    """Secondary reader failed; the primary extraction can still be used."""


class PDFReaderUnavailable(UnlimitedOCRError):
    pass


class PDFPageLimitExceeded(UnlimitedOCRError):
    pass


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def clean_ocr_text(raw):
    """Remove layout coordinates while retaining original scripts and tables."""
    if not isinstance(raw, str) or not raw.strip():
        raise UnlimitedOCRError("Unlimited-OCR returned no text.")
    lines = []
    for line in raw.splitlines():
        if re.match(r"\s*<\|det\|>image(?:\s|\[|<)", line):
            continue
        line = re.sub(r"<\|det\|>.*?<\|/det\|>", "", line)
        line = re.sub(r"<\|/?ref\|>", "", line)
        line = re.sub(r"<\|(?:endoftext|im_end|eot_id)\|>", "", line)
        lines.append(line.rstrip())
    text = re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()
    if not text or len(text) > MAX_TEXT_CHARS:
        raise UnlimitedOCRError("Unlimited-OCR text was empty or too large.")
    return text


@dataclass(frozen=True)
class UnlimitedOCRClient:
    url: str = ""
    model: str = "baidu/Unlimited-OCR"
    api_key: str = ""
    timeout: float = 25
    max_pdf_pages: int = 8

    @classmethod
    def from_env(cls):
        return cls(
            url=os.environ.get("UNLIMITED_OCR_URL", "").strip(),
            model=os.environ.get("UNLIMITED_OCR_MODEL", "baidu/Unlimited-OCR").strip() or "baidu/Unlimited-OCR",
            api_key=os.environ.get("UNLIMITED_OCR_API_KEY", "").strip(),
            timeout=max(1, min(60, float(os.environ.get("UNLIMITED_OCR_TIMEOUT_SECONDS", "25")))),
            max_pdf_pages=max(1, min(20, int(os.environ.get("UNLIMITED_OCR_MAX_PDF_PAGES", "8")))),
        )

    @property
    def configured(self):
        return bool(self.url)

    def _endpoint(self):
        parts = urlsplit(self.url)
        if parts.scheme not in ("http", "https") or not parts.hostname or parts.username or parts.password or parts.query or parts.fragment:
            raise UnlimitedOCRError("Set a valid Unlimited-OCR HTTP service URL without credentials or query parameters.")
        base = self.url.rstrip("/")
        if parts.path.rstrip("/").endswith("/chat/completions"):
            return base
        return base + ("/chat/completions" if parts.path.rstrip("/").endswith("/v1") else "/v1/chat/completions")

    def _images(self, encoded, mime_type):
        if mime_type in ("image/png", "image/jpeg", "image/webp"):
            return [(mime_type, encoded)]
        if mime_type != "application/pdf":
            raise UnlimitedOCRError("Unsupported secondary OCR file type.")
        try:
            import pypdfium2 as pdfium
            from PIL import Image  # noqa: F401 - verify the PDF image dependency
        except ImportError as exc:
            raise PDFReaderUnavailable("Optional PDF rendering packages are not installed.") from exc
        images = []
        with PDF_RENDER_LOCK:
            try:
                pdf = pdfium.PdfDocument(base64.b64decode(encoded, validate=True))
                try:
                    if not 1 <= len(pdf) <= self.max_pdf_pages:
                        raise PDFPageLimitExceeded("The complete PDF exceeds the configured secondary OCR page limit.")
                    for index in range(len(pdf)):
                        page = pdf[index]
                        try:
                            width, height = page.get_size()
                            if min(width, height) <= 0:
                                raise UnlimitedOCRError("A PDF page has invalid dimensions.")
                            # Bound memory and send every page, never a silently truncated PDF.
                            scale = min(2.0, 1800 / max(width, height))
                            bitmap = page.render(scale=scale)
                            try:
                                image = bitmap.to_pil().convert("RGB")
                                try:
                                    output = io.BytesIO()
                                    image.save(output, format="JPEG", quality=90)
                                    images.append(("image/jpeg", base64.b64encode(output.getvalue()).decode("ascii")))
                                finally:
                                    image.close()
                            finally:
                                bitmap.close()
                        finally:
                            page.close()
                finally:
                    pdf.close()
            except UnlimitedOCRError:
                raise
            except Exception as exc:
                raise UnlimitedOCRError("The PDF could not be rendered for the second reader.") from exc
        return images

    def transcribe(self, encoded, mime_type):
        if not self.configured:
            raise UnlimitedOCRError("Unlimited-OCR is not configured.")
        endpoint = self._endpoint()
        images = self._images(encoded, mime_type)
        content = [{"type": "text", "text": "<image>Multi page parsing." if len(images) > 1 else "<image>document parsing."}]
        content.extend({"type": "image_url", "image_url": {"url": f"data:{mime};base64,{data}"}} for mime, data in images)
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": content}],
            "temperature": 0,
            "max_tokens": 8192,
            "stream": False,
            "skip_special_tokens": False,
            "vllm_xargs": {"ngram_size": 35, "window_size": 1024 if len(images) > 1 else 128},
        }
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        request = urllib.request.Request(endpoint, data=json.dumps(payload).encode("utf-8"), headers=headers)
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), _NoRedirect())
        try:
            with opener.open(request, timeout=self.timeout) as response:
                raw = response.read(MAX_RESPONSE_BYTES + 1)
            if len(raw) > MAX_RESPONSE_BYTES:
                raise UnlimitedOCRError("Unlimited-OCR response was too large.")
            result = json.loads(raw)
            choice = result["choices"][0]
            if choice.get("finish_reason") != "stop":
                raise UnlimitedOCRError("Unlimited-OCR did not finish the complete transcription.")
            return clean_ocr_text(choice["message"]["content"])
        except UnlimitedOCRError:
            raise
        except Exception as exc:
            # Do not expose provider responses, uploaded text, URLs or keys in UI/logs.
            raise UnlimitedOCRError("The second OCR reader could not complete this upload.") from exc


def _evidence(value):
    text = unicodedata.normalize("NFKC", str(value or "")).casefold()
    text = re.sub(r"(?<=\d)(?=[a-zµμ])", " ", text)
    # Vowel/diacritic marks distinguish words in regional scripts; do not drop them.
    text = "".join(character if character.isalnum() or unicodedata.category(character).startswith("M") or character == "." else " " for character in text)
    return " ".join(text.split())


def _contains(text, value):
    value = _evidence(value)
    return bool(value) and f" {value} " in f" {text} "


def _matching_row(lines, label):
    # Only use the same OCR line/Markdown row; another medicine's dose is not evidence.
    return next((line for line in lines if _contains(line, label)), "")


def apply_secondary_review(record, text):
    """Keep both readings and flag unsupported fields; never replace or confirm them."""
    record["secondaryOcrText"] = text
    record["secondaryOcrStatus"] = "used"
    record["ocrReaders"] = ["Gemini Vision", "Unlimited-OCR"]
    lines = [_evidence(line) for line in text.splitlines() if line.strip()]
    for medicine in record.get("medicines", []):
        name = medicine.get("name", "")
        if not name or name.casefold() == "illegible":
            continue
        row = _matching_row(lines, name)
        missing = []
        if not row:
            missing.append("medicine name")
        else:
            for label, value in (("strength or dose", medicine.get("strength") or medicine.get("dosage")), ("frequency", medicine.get("frequency"))):
                if value and not _contains(row, value):
                    missing.append(label)
        if missing:
            medicine["needsReview"] = True
            medicine["userVerified"] = False
            medicine["reviewReason"] = "The second OCR reading did not match the " + ", ".join(missing) + ". Check the original prescription."
            record["medicinesConfirmed"] = False
    review_items = record.setdefault("reviewItems", [])
    for index, test in enumerate(record.get("labTests", [])):
        if not test.get("test") or not test.get("value"):
            continue
        row = _matching_row(lines, test["test"])
        for field in ("value", "unit"):
            if not test.get(field) or (row and _contains(row, test[field])):
                continue
            test["needsReview"] = True
            field_name = f"lab:{index}:{field}"
            if not any(item.get("field") == field_name for item in review_items):
                review_items.append({
                    "field": field_name,
                    "value": test[field],
                    "sourceText": test.get("sourceText") or " ".join(str(test.get(key, "")) for key in ("test", "value", "unit")),
                    "reason": f"The second OCR reading did not match this {test['test']} {field}. Verify it against the original report.",
                    "alternatives": [],
                })
    record["reviewRequired"] = bool(record.get("reviewRequired") or review_items or any(m.get("needsReview") for m in record.get("medicines", [])))
    return record
