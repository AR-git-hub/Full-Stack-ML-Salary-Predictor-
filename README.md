# Mortgage Approval Predictor

Простой ML-сервис по лабораторной работе: FastAPI + HTML-интерфейс.

## Клонируем репозиторий
```bash
mkdir site
cd site
git clone https://github.com/AR-git-hub/Full-Stack-ML-Salary-Predictor-.git .
```

## Запускам сайт локально:
```bash
cd develop
docker compose up -d --build
```

## Создаём модели, обучаем на датасете, сохраняем в pkl
```bash
cd ml
uv venv
uv sync
source ./.venv/bin/activate
uv run train.py
```

## Разворячиваем сайт на сервере 82.117.87.36
```bash
docker compose up -d --build
```