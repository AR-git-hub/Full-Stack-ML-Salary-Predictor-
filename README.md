# Mortgage Approval Predictor

Простой ML-сервис по лабораторной работе: FastAPI + HTML-интерфейс.

## Быстрый запуск (Windows)

```powershell
cd "c:\Users\Aleksandr Riabkov\Desktop\Itmo.py\Full-Stack-ML-Salary-Predictor-"
uv sync
uv run python scripts/create_stub_model.py
uv run uvicorn app.main:app --reload
```

Откройте в браузере: **http://127.0.0.1:8000**

1. Загрузите `models/stub_model.pkl` через форму (или свою обученную `.pkl`).
2. Заполните поля и нажмите «Получить предсказание».

## Без uv

```powershell
pip install fastapi uvicorn[standard] python-multipart pandas scikit-learn pydantic
python scripts/create_stub_model.py
uvicorn app.main:app --reload
```

**Важно:** команду `uvicorn` запускайте из корня репозитория (там, где лежит папка `app`).

## API

- `POST /upload-model` — файл `.pkl`
- `POST /predict` — JSON `{ "records": [ { ...признаки... } ] }`
- `POST /predict-from-csv` — CSV-файл
- `GET /docs` — Swagger
