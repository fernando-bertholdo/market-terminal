FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    HF_HOME=/models \
    TRANSFORMERS_CACHE=/models \
    DEVICE=cpu

WORKDIR /app

# CPU-only torch to keep the image small.
COPY requirements.txt .
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.5.1 \
    && pip install --no-cache-dir -r requirements.txt

COPY mapping.py pipeline.py retrain.py app.py ./

# Optionally bake the model weights into the image so cold start has no download.
# Uncomment to pre-pull (larger image, faster/offline cold start):
# RUN WARMUP=true python -c "import pipeline; pipeline.warmup()"

# Honour $PORT so the same image runs on HF Spaces (7860), Fly, Render, or local.
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
