"""Create a minimal sklearn model for testing uploads and /predict."""

import pickle
from pathlib import Path

import pandas as pd
from sklearn.dummy import DummyClassifier

OUT = Path(__file__).resolve().parent.parent / "models" / "stub_model.pkl"

FEATURES = [
    "credit_score",
    "loan_amnt",
    "loan_int_rate",
    "person_income",
    "loan_percent_income",
]

if __name__ == "__main__":
    X = pd.DataFrame(
        [
            [720, 10000, 11.5, 80000, 0.2],
            [580, 15000, 14.0, 45000, 0.4],
        ],
        columns=FEATURES,
    )
    y = [1, 0]
    model = DummyClassifier(strategy="most_frequent")
    model.fit(X, y)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("wb") as f:
        pickle.dump(model, f)

    print(f"Saved: {OUT}")
