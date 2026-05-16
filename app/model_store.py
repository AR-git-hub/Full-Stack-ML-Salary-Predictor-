import pickle
from pathlib import Path
from typing import Any

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "model.pkl"

_model: Any | None = None


def is_loaded() -> bool:
    return _model is not None


def get_model() -> Any:
    if _model is None:
        raise RuntimeError("Model not loaded")
    return _model


def set_model(model: Any) -> None:
    global _model
    _model = model
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    with MODEL_PATH.open("wb") as f:
        pickle.dump(model, f)


def load_saved() -> bool:
    global _model
    if not MODEL_PATH.exists():
        return False
    with MODEL_PATH.open("rb") as f:
        _model = pickle.load(f)
    return True
