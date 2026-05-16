import io
import pickle
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sklearn.metrics import roc_auc_score

from app import model_store
from app.predict import predict_record
from app.schemas import PredictCsvResponse, PredictRequest, PredictResponse, PredictRecord, UploadResponse

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

app = FastAPI(title="Mortgage Approval Predictor")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

model_store.load_saved()


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.post("/upload-model", response_model=UploadResponse)
async def upload_model(file: UploadFile = File(...)) -> UploadResponse:
    if not file.filename or not file.filename.endswith(".pkl"):
        return UploadResponse(status="error", detail="Expected a .pkl file")

    try:
        data = await file.read()
        model = pickle.loads(data)
        model_store.set_model(model)
        return UploadResponse(status="ok")
    except Exception as exc:
        return UploadResponse(status="error", detail=str(exc))


@app.post("/predict", response_model=PredictResponse)
def predict(body: PredictRequest) -> PredictResponse:
    if not model_store.is_loaded():
        raise HTTPException(status_code=400, detail="Model not loaded")

    model = model_store.get_model()
    results = []
    for record in body.records:
        status = predict_record(model, record)
        features = {k: v for k, v in record.items() if k != "loan_status"}
        results.append(PredictRecord(features=features, loan_status=status))

    return PredictResponse(results=results)


@app.post("/predict-from-csv", response_model=PredictCsvResponse)
async def predict_from_csv(file: UploadFile = File(...)) -> PredictCsvResponse:
    if not model_store.is_loaded():
        raise HTTPException(status_code=400, detail="Model not loaded")

    raw = await file.read()
    df = pd.read_csv(io.BytesIO(raw))
    model = model_store.get_model()

    predicted = []
    for _, row in df.iterrows():
        record = row.to_dict()
        predicted.append(predict_record(model, record))

    df = df.copy()
    df["predicted_loan_status"] = predicted

    roc_auc = None
    if "loan_status" in df.columns:
        try:
            y_true = df["loan_status"].apply(
                lambda x: 1 if str(x).lower() in {"1", "approved", "true"} else 0
            )
            y_score = df["predicted_loan_status"].apply(
                lambda x: 1 if str(x).lower() == "approved" else 0
            )
            roc_auc = float(roc_auc_score(y_true, y_score))
        except ValueError:
            roc_auc = None

    return PredictCsvResponse(roc_auc=roc_auc, data=df.to_dict(orient="records"))
