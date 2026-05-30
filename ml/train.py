"""
train.py — ML-пайплайн одобрения ипотеки.

Использует ТОЛЬКО стандартные классы sklearn и lightgbm.
Сериализованный pkl не требует никакого кастомного кода на сервере —
достаточно установленных пакетов sklearn и lightgbm.

Сравниваются 3 модели, лучшая сохраняется в models/model.pkl.

Запуск:
    python -m ml.train
"""

import json
import logging
import pickle
import warnings
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, roc_auc_score
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder, OneHotEncoder, StandardScaler

warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Пути и константы
# ---------------------------------------------------------------------------
DATA_PATH  = Path("data/loan_data.csv")
MODEL_DIR  = Path("models")
MODEL_PATH = MODEL_DIR / "model.pkl"
CARD_PATH  = MODEL_DIR / "model_card.json"

RANDOM_STATE = 42
TEST_SIZE    = 0.20
CV_FOLDS     = 5

# Группы признаков
_NUMERIC = [
    "person_age", "person_income", "person_emp_exp", "loan_amnt",
    "loan_int_rate", "loan_percent_income", "cb_person_cred_hist_length", "credit_score",
]
_BINARY = ["person_gender", "previous_loan_defaults_on_file"]
_ORDINAL = ["person_education"]
_OHE = ["person_home_ownership", "loan_intent"]

# Явный порядок категорий для воспроизводимости
_BINARY_CATS  = [["female", "male"], ["No", "Yes"]]
_ORDINAL_CATS = [["High School", "Associate", "Bachelor", "Master", "Doctorate"]]

# LightGBM: консервативная регуляризация
_LGBM_BASE = dict(
    n_estimators=800, learning_rate=0.03, num_leaves=63,
    min_child_samples=15, reg_alpha=0.05, reg_lambda=0.05,
    subsample=0.8, colsample_bytree=0.8, n_jobs=-1, verbose=-1,
)
_LGBM_SEEDS = [42, 7, 13, 99, 1337]


# ---------------------------------------------------------------------------
# Препроцессор (только стандартный sklearn)
# ---------------------------------------------------------------------------
def _make_preprocessor() -> ColumnTransformer:
    ct = ColumnTransformer(
        transformers=[
            ("num", "passthrough", _NUMERIC),
            ("bin", OrdinalEncoder(
                categories=_BINARY_CATS,
                handle_unknown="use_encoded_value",
                unknown_value=-1,
            ), _BINARY),
            ("ord", OrdinalEncoder(
                categories=_ORDINAL_CATS,
                handle_unknown="use_encoded_value",
                unknown_value=-1,
            ), _ORDINAL),
            ("ohe", OneHotEncoder(
                handle_unknown="ignore",
                sparse_output=False,
            ), _OHE),
        ],
        remainder="drop",
    )
    # Сохраняем имена столбцов → LightGBM не выдаёт warnings при инференсе
    ct.set_output(transform="pandas")
    return ct


# ---------------------------------------------------------------------------
# Пайплайны для сравнения
# ---------------------------------------------------------------------------
def _build_pipelines() -> dict[str, Pipeline]:
    lgbm_voter = VotingClassifier(
        estimators=[
            (f"lgb{s}", lgb.LGBMClassifier(**_LGBM_BASE, random_state=s))
            for s in _LGBM_SEEDS
        ],
        voting="soft",
    )
    return {
        "LogisticRegression": Pipeline([
            ("prep",   _make_preprocessor()),
            ("scaler", StandardScaler()),
            ("clf",    LogisticRegression(
                C=0.5, class_weight="balanced",
                max_iter=1000, random_state=RANDOM_STATE,
            )),
        ]),
        "RandomForest": Pipeline([
            ("prep", _make_preprocessor()),
            ("clf",  RandomForestClassifier(
                n_estimators=300, max_depth=8, min_samples_leaf=10,
                class_weight="balanced", n_jobs=-1, random_state=RANDOM_STATE,
            )),
        ]),
        "LightGBM-Ensemble": Pipeline([
            ("prep", _make_preprocessor()),
            ("clf",  lgbm_voter),
        ]),
    }


# ---------------------------------------------------------------------------
# 5-fold кросс-валидация
# ---------------------------------------------------------------------------
def _cv_auc(pipeline: Pipeline, X: pd.DataFrame, y: pd.Series) -> float:
    cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    scores = []
    for fold, (tr, val) in enumerate(cv.split(X, y), 1):
        pipeline.fit(X.iloc[tr], y.iloc[tr])
        auc = roc_auc_score(y.iloc[val], pipeline.predict_proba(X.iloc[val])[:, 1])
        log.info("    fold %d  AUC=%.4f", fold, auc)
        scores.append(auc)
    log.info("    mean=%.4f  std=%.4f", np.mean(scores), np.std(scores))
    return float(np.mean(scores))


# ---------------------------------------------------------------------------
# Сохранение model_card.json
# ---------------------------------------------------------------------------
def _save_card(model: Pipeline, X_test: pd.DataFrame, y_test: pd.Series) -> None:
    proba  = model.predict_proba(X_test)[:, 1]
    preds  = model.predict(X_test)
    report = classification_report(
        y_test, preds,
        target_names=["rejected", "approved"],
        output_dict=True,
    )
    card = {
        "model_type": type(model.named_steps["clf"]).__name__,
        "metrics": {
            "roc_auc":  round(float(roc_auc_score(y_test, proba)), 4),
            "accuracy": round(float(accuracy_score(y_test, preds)), 4),
        },
        "classification_report": {
            cls: {k: round(v, 4) if isinstance(v, float) else v
                  for k, v in vals.items()}
            for cls, vals in report.items()
            if isinstance(vals, dict)
        },
        "features": _NUMERIC + _BINARY + _ORDINAL + _OHE,
        "model_path": str(MODEL_PATH),
        "upload_hint": f"POST /upload-model  --form file=@{MODEL_PATH}",
    }
    with open(CARD_PATH, "w", encoding="utf-8") as f:
        json.dump(card, f, indent=2, ensure_ascii=False)
    log.info("Model card -> %s", CARD_PATH)


# ---------------------------------------------------------------------------
# Точка входа
# ---------------------------------------------------------------------------
def main() -> None:
    log.info("Loading %s", DATA_PATH)
    df = pd.read_csv(DATA_PATH)
    X, y = df.drop(columns=["loan_status"]), df["loan_status"]
    log.info("Shape=%s  balance=%s", X.shape, dict(y.value_counts()))

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, stratify=y, random_state=RANDOM_STATE,
    )
    log.info("Train=%d  Test=%d", len(X_train), len(X_test))

    # Сравнение моделей через CV на train-части
    cv_scores: dict[str, float] = {}
    for name, pipeline in _build_pipelines().items():
        log.info("=== %s ===", name)
        cv_scores[name] = _cv_auc(pipeline, X_train, y_train)

    best_name = max(cv_scores, key=cv_scores.__getitem__)
    log.info("Best: %s  (CV=%.4f)", best_name, cv_scores[best_name])

    # Финальное обучение на полном train, оценка на held-out test
    best_pipeline = _build_pipelines()[best_name]
    best_pipeline.fit(X_train, y_train)

    test_auc = roc_auc_score(y_test, best_pipeline.predict_proba(X_test)[:, 1])
    log.info("Test AUC=%.4f", test_auc)

    gap = cv_scores[best_name] - test_auc
    if gap > 0.02:
        log.warning("CV-Test gap=%.4f — возможно переобучение!", gap)

    # Сохранение
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(best_pipeline, f)
    log.info("Model saved -> %s", MODEL_PATH)

    _save_card(best_pipeline, X_test, y_test)

    # Итоговая таблица
    log.info("")
    log.info("%-28s  CV AUC", "Model")
    log.info("-" * 42)
    for name, auc in cv_scores.items():
        log.info("%-28s  %.4f%s", name, auc, "  <- best" if name == best_name else "")
    log.info("")
    log.info("Test AUC = %.4f", test_auc)


if __name__ == "__main__":
    main()
