import io
import os
import uuid
import pickle
from collections import OrderedDict
from typing import Any

import pandas as pd
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from pydantic import BaseModel
from sklearn.metrics import roc_auc_score
from starlette.middleware.sessions import SessionMiddleware

models_store: OrderedDict[str, Any] = OrderedDict()

app = FastAPI()
app.add_middleware(
    SessionMiddleware,
    secret_key=str(uuid.uuid4()),
)


def _label(pred) -> str:
    return "Approved" if int(pred) == 1 else "Rejected"


@app.post("/upload-model")
async def upload_model(request: Request, file: UploadFile = File(...)):
    if not (file.filename or "").endswith(".pkl"):
        raise HTTPException(status_code=400, detail="Only .pkl files are supported")

    content = await file.read()
    loaded = pickle.load(io.BytesIO(content))

    session_id = str(uuid.uuid4())
    models_store[session_id] = loaded
    request.session["session_id"] = session_id

    return {"status": "ok"}


class PredictRequest(BaseModel):
    records: list[dict]


@app.post("/predict")
async def predict(request: Request, body: PredictRequest):
    session_id = request.session.get("session_id")
    m = models_store.get(session_id) if session_id else None
    if m is None:
        raise HTTPException(status_code=400, detail="No model loaded. Please upload a model first.")

    df = pd.DataFrame(body.records)
    predictions = m.predict(df)

    results = [
        {"features": record, "loan_status": _label(pred)}
        for record, pred in zip(body.records, predictions)
    ]
    return {"results": results}


@app.post("/predict-from-csv")
async def predict_from_csv(request: Request, file: UploadFile = File(...)):
    session_id = request.session.get("session_id")
    m = models_store.get(session_id) if session_id else None
    if m is None:
        raise HTTPException(status_code=400, detail="No model loaded. Please upload a model first.")

    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))

    y_true = None
    if "loan_status" in df.columns:
        y_true = df["loan_status"]
        df = df.drop(columns=["loan_status"])

    predictions = m.predict(df)

    roc_auc = None
    if y_true is not None and hasattr(m, "predict_proba"):
        try:
            proba = m.predict_proba(df)[:, 1]
            roc_auc = float(roc_auc_score(y_true, proba))
        except Exception:
            pass

    df["predicted_loan_status"] = [_label(p) for p in predictions]

    return {"roc_auc": roc_auc, "data": df.to_dict(orient="records")}
