import io
import os
import pickle

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel
from sklearn.metrics import roc_auc_score

MODEL_PATH = "models/model.pkl"
model = None

app = FastAPI()

if os.path.exists(MODEL_PATH):
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)


def _label(pred) -> str:
    return "Approved" if int(pred) == 1 else "Rejected"


@app.post("/upload-model")
async def upload_model(file: UploadFile = File(...)):
    if not (file.filename or "").endswith(".pkl"):
        raise HTTPException(status_code=400, detail="Only .pkl files are supported")

    content = await file.read()
    os.makedirs("models", exist_ok=True)
    with open(MODEL_PATH, "wb") as f:
        f.write(content)

    global model
    model = pickle.load(io.BytesIO(content))
    return {"status": "ok"}


class PredictRequest(BaseModel):
    records: list[dict]


@app.post("/predict")
async def predict(request: PredictRequest):
    if model is None:
        raise HTTPException(status_code=400, detail="No model loaded. Please upload a model first.")

    df = pd.DataFrame(request.records)
    predictions = model.predict(df)

    results = [
        {"features": record, "loan_status": _label(pred)}
        for record, pred in zip(request.records, predictions)
    ]
    return {"results": results}


@app.post("/predict-from-csv")
async def predict_from_csv(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=400, detail="No model loaded. Please upload a model first.")

    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))

    y_true = None
    if "loan_status" in df.columns:
        y_true = df["loan_status"]
        df = df.drop(columns=["loan_status"])

    predictions = model.predict(df)

    roc_auc = None
    if y_true is not None and hasattr(model, "predict_proba"):
        try:
            proba = model.predict_proba(df)[:, 1]
            roc_auc = float(roc_auc_score(y_true, proba))
        except Exception:
            pass

    df["predicted_loan_status"] = [_label(p) for p in predictions]

    return {"roc_auc": roc_auc, "data": df.to_dict(orient="records")}
