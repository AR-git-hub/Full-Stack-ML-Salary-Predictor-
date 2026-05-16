from typing import Any

from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    records: list[dict[str, Any]] = Field(min_length=1)


class PredictRecord(BaseModel):
    features: dict[str, Any]
    loan_status: str


class PredictResponse(BaseModel):
    results: list[PredictRecord]


class UploadResponse(BaseModel):
    status: str
    detail: str | None = None


class PredictCsvResponse(BaseModel):
    roc_auc: float | None = None
    data: list[dict[str, Any]]
