import asyncio
import random
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Mock ML Weather Detection Service")

# Разрешаем запросы с фронтенда и бэкенда (настраиваем CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене заменить на конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WEATHER_CLASSES = [
    {"class": "rain", "label": "Дождь", "confidence_range": (0.75, 0.95)},
    {"class": "snow", "label": "Снег", "confidence_range": (0.80, 0.98)},
    {"class": "fog",  "label": "Туман", "confidence_range": (0.70, 0.90)},
]

@app.post("/predict")
async def predict_weather(file: UploadFile = File(...)):
    # 1. Простая валидация типа файла
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Файл должен быть изображением")
    
    # 2. Имитация времени инференса модели (1 секунда)
    await asyncio.sleep(1.0)
    
    # 3. Генерация случайного, но реалистичного ответа
    result = random.choice(WEATHER_CLASSES)
    confidence = round(random.uniform(result["confidence_range"][0], result["confidence_range"][1]), 2)
    
    return {
        "status": "success",
        "prediction": {
            "class": result["class"],
            "label": result["label"],
            "confidence": confidence
        },
        "filename": file.filename,
        "message": "Mock prediction completed successfully"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ml-mock"}