from typing import Any


def _status_label(value: Any) -> str:
    if value in (1, "1", True, "approved", "Approved", "APPROVED"):
        return "approved"
    if value in (0, "0", False, "rejected", "Rejected", "REJECTED"):
        return "rejected"
    return "approved" if float(value) >= 0.5 else "rejected"


def predict_record(model: Any, record: dict[str, Any]) -> str:
    if hasattr(model, "predict"):
        features = {k: v for k, v in record.items() if k != "loan_status"}
        import pandas as pd

        row = pd.DataFrame([features])
        pred = model.predict(row)[0]
        return _status_label(pred)

    score = float(record.get("credit_score", 0))
    return "approved" if score >= 650 else "rejected"
