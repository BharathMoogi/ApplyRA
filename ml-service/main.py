import os
import gc
import json
from typing import List, Dict
from fastapi import FastAPI, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# Optimize PyTorch CPU memory usage for cloud environments (Render Free Tier 512MB RAM)
torch.set_num_threads(1)
try:
    torch.set_num_interop_threads(1)
except Exception:
    pass

# Initialize FastAPI App
app = FastAPI(
    title="ApplyRA DistilBERT Occupation Classifier",
    description="Inference service for resume occupation classification",
    version="1.0.0"
)

# API Key Security - Header name MUST match what ApplyRA sends: 'X-API-Key'
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

def verify_api_key(api_key: str = Security(api_key_header)):
    # Check both OCCUPATION_API_KEY and API_KEY environment variable names
    expected = os.getenv("OCCUPATION_API_KEY") or os.getenv("API_KEY") or ""
    if expected:
        if not api_key or api_key.strip() != expected.strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or missing X-API-Key header"
            )
    return api_key

# Model Directory Resolution (for local fallback)
def resolve_local_model_dir() -> str:
    env_path = os.getenv("MODEL_PATH")
    candidates = [
        env_path,
        os.path.join(os.path.dirname(__file__), "model"),
        "./model",
        "../model"
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return os.path.abspath(c)
    return os.path.join(os.path.dirname(__file__), "model")

# Global model and tokenizer holders
model = None
tokenizer = None
id2label: Dict[int, str] = {}
loaded_source: str = ""

@app.on_event("startup")
def load_model():
    global model, tokenizer, id2label, loaded_source
    
    # 1. Check if Hugging Face Hub model ID is configured
    hf_model_id = os.getenv("HF_MODEL_ID") or os.getenv("HUGGINGFACE_REPO_ID") or ""
    hf_token = os.getenv("HF_TOKEN") or os.getenv("HUGGING_FACE_HUB_TOKEN") or None

    if hf_model_id:
        print(f"[ApplyRA ML] Loading DistilBERT model from Hugging Face Hub: {hf_model_id}...")
        try:
            tokenizer = AutoTokenizer.from_pretrained(
                hf_model_id,
                token=hf_token
            )
            model = AutoModelForSequenceClassification.from_pretrained(
                hf_model_id,
                token=hf_token,
                torch_dtype=torch.float32,
                low_cpu_mem_usage=True
            )
            model.eval()
            loaded_source = f"huggingface:{hf_model_id}"
            print(f"[ApplyRA ML] Model successfully downloaded and loaded from Hugging Face Hub!")
        except Exception as e:
            print(f"[ApplyRA ML] ERROR loading from Hugging Face Hub ({hf_model_id}): {e}")
            model = None
            tokenizer = None

    # 2. Fallback to local directory if HF is not configured or failed
    if model is None:
        local_dir = resolve_local_model_dir()
        if os.path.exists(local_dir):
            print(f"[ApplyRA ML] Loading DistilBERT model from local directory: {local_dir}...")
            try:
                tokenizer = AutoTokenizer.from_pretrained(local_dir)
                model = AutoModelForSequenceClassification.from_pretrained(
                    local_dir,
                    torch_dtype=torch.float32,
                    low_cpu_mem_usage=True
                )
                model.eval()
                loaded_source = f"local:{local_dir}"
                print(f"[ApplyRA ML] Model successfully loaded from local directory!")
            except Exception as e:
                print(f"[ApplyRA ML] ERROR loading from local directory ({local_dir}): {e}")
                model = None
                tokenizer = None
        else:
            print(f"[ApplyRA ML] WARNING: No model found. Set HF_MODEL_ID + HF_TOKEN, or place model files in {local_dir}.")

    # 3. Resolve Class Labels
    if model is not None:
        # A. First check model's config.id2label
        if hasattr(model.config, "id2label") and model.config.id2label:
            id2label = {int(k): v for k, v in model.config.id2label.items()}

        # B. Fallback: check local labels.json if id2label is missing or generic (e.g. LABEL_0)
        local_labels_path = os.path.join(os.path.dirname(__file__), "model", "labels.json")
        if (not id2label or any("LABEL_" in v for v in id2label.values())) and os.path.exists(local_labels_path):
            try:
                with open(local_labels_path, "r", encoding="utf-8") as f:
                    label_list = json.load(f)
                    id2label = {i: label_list[i] for i in range(len(label_list))}
            except Exception as e:
                print(f"[ApplyRA ML] Could not load labels.json: {e}")

        # C. Fallback: check OCCUPATION_LABELS env var (comma-separated)
        labels_env = os.getenv("OCCUPATION_LABELS")
        if (not id2label or any("LABEL_" in v for v in id2label.values())) and labels_env:
            env_labels = [l.strip() for l in labels_env.split(",") if l.strip()]
            id2label = {i: env_labels[i] for i in range(len(env_labels))}

        # Force garbage collection to free any temporary loading buffers
        gc.collect()

        print(f"[ApplyRA ML] Total active occupation categories: {len(id2label)}")
        for idx, lbl in sorted(id2label.items()):
            print(f"  [{idx}]: {lbl}")

class PredictRequest(BaseModel):
    text: str

class AlternativePrediction(BaseModel):
    label: str
    score: float

class PredictResponse(BaseModel):
    predicted_occupation: str
    confidence: float
    top_predictions: List[AlternativePrediction]

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "source": loaded_source or "none",
        "classes_count": len(id2label),
        "classes": id2label
    }

@app.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest, authenticated: str = Security(verify_api_key)):
    if model is None or tokenizer is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not loaded. Please verify HF_MODEL_ID and HF_TOKEN on Render."
        )

    if not payload.text or not payload.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume text cannot be empty"
        )

    # Tokenize input text (DistilBERT standard max length 512)
    inputs = tokenizer(
        payload.text,
        max_length=512,
        truncation=True,
        padding=True,
        return_tensors="pt"
    )

    with torch.inference_mode():
        outputs = model(**inputs)
        probabilities = F.softmax(outputs.logits, dim=1).squeeze(0)

    # Top-3 predictions
    k = min(3, len(probabilities))
    top_scores, top_indices = torch.topk(probabilities, k=k)

    top_predictions: List[AlternativePrediction] = []
    for score, idx in zip(top_scores.tolist(), top_indices.tolist()):
        label_name = id2label.get(idx, f"Category_{idx}")
        top_predictions.append(
            AlternativePrediction(label=label_name, score=round(float(score), 4))
        )

    best_prediction = top_predictions[0]

    return PredictResponse(
        predicted_occupation=best_prediction.label,
        confidence=best_prediction.score,
        top_predictions=top_predictions
    )
