# Optional Unlimited-OCR reader

Mr.Doc can call a separate [Baidu Unlimited-OCR](https://github.com/baidu/Unlimited-OCR) service for an independent transcription. It is **off by default**. Adding this connector does not install or run the model, and it does not establish better medical OCR accuracy.

The app still uses Gemini for structured medical extraction and summaries. Unlimited-OCR receives the original image, or rendered PDF pages, independently. Its text is kept with the record for comparison. A medicine name, dose, frequency, or lab result that is not corroborated in the same OCR line is flagged for review. Different line wrapping or notation can cause a review flag even when both readings are reasonable. Agreement never increases confidence or clears an existing review flag.

## Start the GPU service

This connector targets the [official vLLM serving recipe](https://recipes.vllm.ai/baidu/Unlimited-OCR). That recipe specifies an NVIDIA-compatible GPU with at least 8 GB of VRAM. An Intel UHD graphics device cannot run its supported CUDA setup. Use a suitable Linux GPU machine or a GPU host you control. No model weights or GPU packages are installed into Mr.Doc.

On that GPU host, with NVIDIA-enabled Docker already working:

```sh
docker run --rm --gpus all --ipc=host -p 127.0.0.1:10000:8000 \
  vllm/vllm-openai:unlimited-ocr \
  baidu/Unlimited-OCR \
  --trust-remote-code \
  --logits_processors vllm.model_executor.models.unlimited_ocr:NGramPerReqLogitsProcessor \
  --no-enable-prefix-caching \
  --mm-processor-cache-gb 0
```

The app uses port 8000; the OCR service uses port 10000. This example binds the OCR service to loopback. For a remote GPU host, use its authenticated service endpoint or a private tunnel. The SGLang deployment has a different custom request recipe and is not the target of this connector.

The upstream code and model card list the MIT license. Refer to the [upstream license](https://github.com/baidu/Unlimited-OCR/blob/main/LICENSE) for redistribution terms. This project calls the service and does not bundle upstream model weights or code.

## Enable it in Mr.Doc

Add these settings to your existing `.env` after the service is running:

```dotenv
UNLIMITED_OCR_URL=http://127.0.0.1:10000/v1
UNLIMITED_OCR_MODEL=baidu/Unlimited-OCR
UNLIMITED_OCR_API_KEY=
UNLIMITED_OCR_TIMEOUT_SECONDS=25
UNLIMITED_OCR_MAX_PDF_PAGES=8
```

An API key is optional for a local service. Set it if the configured service requires bearer authentication. Restart `python server.py` after changing the environment file. The startup message says whether the connector is configured; it does not claim the remote model is healthy.

PNG, JPEG, and WebP work without new Python dependencies in the app. For PDF conversion, install the optional packages in your project environment:

```sh
python -m pip install -r requirements-unlimited-ocr.txt
```

PDF conversion happens in memory, preserves page order, and bounds page size. A PDF exceeding the configured page limit is skipped by the second reader rather than silently truncated. The original PDF still goes through the existing Gemini path. Missing PDF packages, timeouts, incomplete generation, or a failed service fall back to the primary extraction; the record's extracted-text section reports that the second read was unavailable.

Leaving `UNLIMITED_OCR_URL` empty disables all requests to Unlimited-OCR. No user upload is sent to it by default.

## Verify the integration

`python -m unittest discover -s tests -p "test_*.py"` checks the HTTP request recipe, layout-token cleanup, fallback behavior, and review flags with synthetic records and mocked services. `node --test tests/frontend_ocr.test.cjs` checks correction and export behavior. These checks do **not** measure model accuracy.

Once a real GPU service is available, evaluate both readers on verified prescriptions and lab reports, including handwriting and regional scripts. Compare medicine names, strength, frequency, numeric values, and units separately before claiming an accuracy improvement.

In the UI, **View extracted text** lists the readers actually used. A successful second read is available under **Second OCR reading · Unlimited-OCR**. Flagged values can be corrected through **Review flagged details** or the existing chat review window. Pending lab readings are excluded from trends, profile flags, and the doctor summary. Corrections update the saved export values without retaining an outdated clinical flag.
