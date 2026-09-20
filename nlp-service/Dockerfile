# =====================================================================
#  nlp-service — Heroku Container Registry deploy
#
#  WHY DOCKER INSTEAD OF THE STANDARD PYTHON BUILDPACK:
#  Heroku's buildpack deploys are capped at a 500MB compressed slug.
#  sentence-transformers pulls in torch, which alone typically exceeds
#  200-300MB even as a CPU-only wheel, and the full dependency tree
#  (torch + transformers + tokenizers + numpy + scikit-learn) routinely
#  lands well past the 500MB ceiling. A Docker image on Heroku's
#  Container Registry can be up to 5GB, which comfortably fits.
#
#  This changes ONLY how the service is packaged and deployed. No code
#  in main.py or matcher.py is touched, and the CPU-only torch install
#  below is exactly what a production matching service needs -- there
#  is no GPU on a Heroku dyno, so the much larger CUDA-enabled build
#  would be pure waste.
# =====================================================================

FROM python:3.11-slim

WORKDIR /app

# Torch's CPU-only wheel is a fraction of the size of the default
# CUDA-enabled build pip would otherwise resolve. This one line is the
# single biggest size saving available here.
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu \
    torch

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# en_core_web_sm is a model artifact distributed via spaCy's own release
# pipeline, not a PyPI package -- it has to be fetched with this command
# rather than listed in requirements.txt. ~13MB, negligible next to torch.
RUN python -m spacy download en_core_web_sm

COPY . .

# Heroku injects $PORT at runtime and expects the process to bind it.
# Shell form (not exec/array form) is required here so $PORT is
# actually substituted -- CMD ["uvicorn", ..., "--port", "$PORT"] would
# pass the literal string "$PORT" to uvicorn and fail to bind.
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
