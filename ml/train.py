"""
train.py — ML-пайплайн одобрения ипотеки.

Содержит всё необходимое:
  LoanPreprocessor    — обработка и кодирование признаков
  TwoStageClassifier  — двухуровневый классификатор
  Обучение, CV-оценка, сохранение модели и экспорт model_card.json

Запуск обучения:
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
from sklearn.base import BaseEstimator, ClassifierMixin, TransformerMixin
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, roc_auc_score
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Пути
# ---------------------------------------------------------------------------
DATA_PATH  = Path("data/loan_data.csv")
MODEL_DIR  = Path("models")
MODEL_PATH = MODEL_DIR / "model.pkl"
CARD_PATH  = MODEL_DIR / "model_card.json"

# ---------------------------------------------------------------------------
# Константы
# ---------------------------------------------------------------------------
RANDOM_STATE  = 42
TEST_SIZE     = 0.20
CV_FOLDS      = 5
_DEFAULT_COL  = "previous_loan_defaults_on_file"

_LGBM_BASE = dict(
    n_estimators=800, learning_rate=0.03, num_leaves=63,
    min_child_samples=15, reg_alpha=0.05, reg_lambda=0.05,
    subsample=0.8, colsample_bytree=0.8, n_jobs=-1, verbose=-1,
)
_LGBM_SEEDS = [42, 7, 13, 99, 1337]


# ---------------------------------------------------------------------------
# LoanPreprocessor
# ---------------------------------------------------------------------------
class LoanPreprocessor(BaseEstimator, TransformerMixin):
    """
    Преобразует сырой DataFrame заявки в числовую матрицу признаков.

    Шаги:
      1. Обрезка выбросов (age ≤ 80, emp_exp ≤ 60)
      2. Производные признаки риска
      3. Бинарное кодирование (пол, история дефолтов)
      4. Порядковое кодирование (образование)
      5. One-hot кодирование (жильё, цель кредита)
    """
    _EDU = ["High School", "Associate", "Bachelor", "Master", "Doctorate"]
    _OWN = ["MORTGAGE", "OTHER", "OWN", "RENT"]
    _INT = ["DEBTCONSOLIDATION", "EDUCATION", "HOMEIMPROVEMENT",
            "MEDICAL", "PERSONAL", "VENTURE"]

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        df = pd.DataFrame(X).copy()

        df["person_age"]     = df["person_age"].clip(upper=80)
        df["person_emp_exp"] = df["person_emp_exp"].clip(upper=60)

        df["loan_to_income"]  = df["loan_amnt"] / (df["person_income"] + 1)
        df["rate_x_percent"]  = df["loan_int_rate"] * df["loan_percent_income"]
        df["income_per_loan"] = df["person_income"] / (df["loan_amnt"] + 1)
        df["credit_per_loan"] = df["credit_score"] / (df["loan_amnt"] / 1000 + 1)

        gender   = (df["person_gender"].astype(str).str.lower() == "male").astype(np.float64)
        prev_def = (df[_DEFAULT_COL].astype(str).str.lower() == "yes").astype(np.float64)
        edu_ord  = df["person_education"].map(
            {e: float(i) for i, e in enumerate(self._EDU)}
        ).fillna(0.0)

        own_ohe = (
            pd.get_dummies(df["person_home_ownership"], prefix="own")
            .reindex(columns=[f"own_{c}" for c in self._OWN], fill_value=0)
            .astype(np.float64)
        )
        int_ohe = (
            pd.get_dummies(df["loan_intent"], prefix="intent")
            .reindex(columns=[f"intent_{c}" for c in self._INT], fill_value=0)
            .astype(np.float64)
        )

        numeric = df[[
            "person_age", "person_income", "person_emp_exp", "loan_amnt",
            "loan_int_rate", "loan_percent_income", "cb_person_cred_hist_length",
            "credit_score", "loan_to_income", "rate_x_percent",
            "income_per_loan", "credit_per_loan",
        ]]

        return pd.concat([
            numeric.reset_index(drop=True),
            gender.reset_index(drop=True).rename("gender_male"),
            prev_def.reset_index(drop=True).rename("prev_default"),
            edu_ord.reset_index(drop=True).rename("education_ord"),
            own_ohe.reset_index(drop=True),
            int_ohe.reset_index(drop=True),
        ], axis=1).astype(np.float64)


# ---------------------------------------------------------------------------
# TwoStageClassifier
# ---------------------------------------------------------------------------
class TwoStageClassifier(BaseEstimator, ClassifierMixin):
    """
    Двухуровневый классификатор:
      Stage 1: previous_loan_defaults_on_file == "Yes" → детерминированный отказ
      Stage 2: внутренняя модель для случаев без дефолтов

    Датасетный инвариант: все 10 000 одобрений — без дефолтов.
    """
    def __init__(self, estimator):
        self.estimator = estimator
        self.classes_  = np.array([0, 1])

    @staticmethod
    def _no_default_mask(X: pd.DataFrame) -> pd.Series:
        return X[_DEFAULT_COL].astype(str).str.lower() == "no"

    def fit(self, X, y):
        X = pd.DataFrame(X)
        mask  = self._no_default_mask(X)
        y_sub = y.iloc[mask.values] if hasattr(y, "iloc") else y[mask.values]
        self.estimator.fit(X[mask], y_sub)
        return self

    def predict_proba(self, X):
        X    = pd.DataFrame(X)
        mask = self._no_default_mask(X)
        prob = np.zeros((len(X), 2), dtype=np.float64)
        prob[:, 0] = 1.0
        if mask.any():
            prob[mask.values] = self.estimator.predict_proba(X[mask])
        return prob

    def predict(self, X):
        return (self.predict_proba(X)[:, 1] >= 0.5).astype(int)


# ---------------------------------------------------------------------------
# Конфигурация пайплайнов
# ---------------------------------------------------------------------------
def _build_pipelines() -> dict[str, Pipeline]:
    lgbm_voter = VotingClassifier(
        [(f"lgb{s}", lgb.LGBMClassifier(**_LGBM_BASE, random_state=s))
         for s in _LGBM_SEEDS],
        voting="soft",
    )
    return {
        "LogisticRegression": Pipeline([
            ("prep",   LoanPreprocessor()),
            ("scaler", StandardScaler()),
            ("clf",    LogisticRegression(C=0.5, class_weight="balanced",
                                          max_iter=1000, random_state=RANDOM_STATE)),
        ]),
        "RandomForest": Pipeline([
            ("prep", LoanPreprocessor()),
            ("clf",  RandomForestClassifier(n_estimators=300, max_depth=8,
                                            min_samples_leaf=10, class_weight="balanced",
                                            n_jobs=-1, random_state=RANDOM_STATE)),
        ]),
        "LightGBM-Ensemble": Pipeline([
            ("prep", LoanPreprocessor()),
            ("clf",  lgbm_voter),
        ]),
    }


# ---------------------------------------------------------------------------
# Кросс-валидация
# ---------------------------------------------------------------------------
def _cv_auc(inner: Pipeline, X: pd.DataFrame, y: pd.Series) -> float:
    model = TwoStageClassifier(inner)
    cv    = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    scores = []
    for fold, (tr, val) in enumerate(cv.split(X, y), 1):
        model.fit(X.iloc[tr], y.iloc[tr])
        auc = roc_auc_score(y.iloc[val], model.predict_proba(X.iloc[val])[:, 1])
        log.info("    fold %d  AUC=%.4f", fold, auc)
        scores.append(auc)
    log.info("    mean=%.4f  std=%.4f", np.mean(scores), np.std(scores))
    return float(np.mean(scores))


# ---------------------------------------------------------------------------
# Экспорт model_card.json
# ---------------------------------------------------------------------------
def _save_model_card(model, X_test: pd.DataFrame, y_test: pd.Series) -> None:
    proba = model.predict_proba(X_test)[:, 1]
    preds = model.predict(X_test)
    mask_nd = X_test[_DEFAULT_COL].str.lower() == "no"
    report  = classification_report(y_test, preds,
                                    target_names=["rejected", "approved"],
                                    output_dict=True)
    card = {
        "model_type":       type(model).__name__,
        "inner_estimator":  type(model.estimator).__name__,
        "test_set_size":    int(len(y_test)),
        "metrics": {
            "roc_auc":           round(float(roc_auc_score(y_test, proba)), 4),
            "accuracy":          round(float(accuracy_score(y_test, preds)), 4),
            "no_default_auc":    round(float(roc_auc_score(y_test[mask_nd], proba[mask_nd])), 4),
            "yes_default_errors": int(preds[~mask_nd].sum()),
        },
        "classification_report": {
            cls: {k: round(v, 4) if isinstance(v, float) else v for k, v in vals.items()}
            for cls, vals in report.items() if isinstance(vals, dict)
        },
        "model_path": str(MODEL_PATH),
        "upload_hint": f"POST /upload-model --form file=@{MODEL_PATH}",
    }
    with open(CARD_PATH, "w", encoding="utf-8") as f:
        json.dump(card, f, indent=2, ensure_ascii=False)
    log.info("Model card saved to %s", CARD_PATH)


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

    # Сравнение моделей
    cv_scores: dict[str, float] = {}
    for name, inner in _build_pipelines().items():
        log.info("=== %s ===", name)
        cv_scores[name] = _cv_auc(inner, X_train, y_train)

    best_name = max(cv_scores, key=cv_scores.__getitem__)
    log.info("Best: %s  (CV AUC=%.4f)", best_name, cv_scores[best_name])

    # Финальное обучение на полном train
    best_inner = _build_pipelines()[best_name]
    best_model = TwoStageClassifier(best_inner)
    best_model.fit(X_train, y_train)

    test_auc = roc_auc_score(y_test, best_model.predict_proba(X_test)[:, 1])
    log.info("Test AUC=%.4f", test_auc)
    if cv_scores[best_name] - test_auc > 0.02:
        log.warning("CV-Test gap %.4f — возможно переобучение!", cv_scores[best_name] - test_auc)

    # Сохранение
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(best_model, f)
    log.info("Model saved to %s", MODEL_PATH)

    _save_model_card(best_model, X_test, y_test)

    # Итог
    log.info("")
    log.info("%-28s  CV AUC", "Model")
    log.info("-" * 42)
    for name, auc in cv_scores.items():
        log.info("%-28s  %.4f%s", name, auc, "  <- best" if name == best_name else "")
    log.info("")
    log.info("Test AUC = %.4f", test_auc)


if __name__ == "__main__":
    main()
