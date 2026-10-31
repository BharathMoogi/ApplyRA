from fastapi import FastAPI, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import os

# Initialize FastAPI App
app = FastAPI(
    title="ApplyRA DistilBERT Occupation Classifier",
    description="Inference service for resume occupation classification",
    version="1.0.0"
)

# API Key Security
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

EXPECTED_API_KEY = os.getenv("OCCUPATION_API_KEY", "")

def verify_api_key(api_key: str = Security(api_key_header)):
    # If OCCUPATION_API_KEY is configured on server, enforce matching key
    if EXPECTED_API_KEY:
        if not api_key or api_key != EXPECTED_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or missing X-API-Key header"
            )
    return api_key

# Model & Tokenizer path (relative to this script or configured via env)
MODEL_DIR = os.getenv("MODEL_PATH", "./model")

# Global model and tokenizer holders
model = None
tokenizer = None
id2label = {}

@app.on_event("startup")
def load_model():
    global model, tokenizer, id2label
    if os.path.exists(MODEL_DIR):
        print(f"Loading DistilBERT model from {MODEL_DIR}...")
        tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
        model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)
        model.eval()
        
        # Load labels from model config
        if hasattr(model.config, "id2label") and model.config.id2label:
            id2label = {int(k): v for k, v in model.config.id2label.items()}
        print(f"Model loaded successfully with {len(id2label)} classes: {id2label}")
    else:
        print(f"WARNING: Model directory '{MODEL_DIR}' not found. Place your Google Drive model files here.")

class PredictRequest(BaseModel):
    text: str

class AlternativePrediction(BaseModel):
    label: str
    score: float

class PredictResponse(BaseModel):
    predicted_occupation: str
    confidence: float
    top_predictions: list[AlternativePrediction]

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "classes_count": len(id2label)
    }

@app.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest, authenticated: str = Security(verify_api_key)):
    if model is None or tokenizer is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not loaded. Please ensure model files are placed in the model directory."
        )

    if not payload.text or not payload.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume text cannot be empty"
        )

    # Tokenize input text (DistilBERT max 512 tokens)
    inputs = tokenizer(
        payload.text,
        max_length=512,
        truncation=True,
        padding=True,
        return_tensors="pt"
    )

    with torch.no_grad():
        outputs = model(**inputs)
        probabilities = F.softmax(outputs.logits, dim=1).squeeze(0)

    # Top predictions
    k = min(3, len(probabilities))
    top_scores, top_indices = torch.topk(probabilities, k=k)

    top_predictions = []
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
