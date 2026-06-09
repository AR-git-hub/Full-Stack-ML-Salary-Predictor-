# Mortgage Approval Predictor

Простой ML-сервис по лабораторной работе: FastAPI + HTML-интерфейс.

## Скринкасты
- [ml](https://drive.google.com/file/d/1DaBxKRoujIqdeu63G8d5ZjgNkdpTYJXo/view?usp=sharing)
- [web](https://drive.google.com/file/d/1nICKNFQwi8KFZtOA_G_XGnfqlyZbMLGl/view?usp=sharing)

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

## Разворачиваем сайт на сервере 45.146.131.194
```bash
docker compose up -d --build
```