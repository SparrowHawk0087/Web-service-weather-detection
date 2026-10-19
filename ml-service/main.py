import asyncio
import random
import zipfile
import io
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Mock ML Weather Detection Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
async def predict_weather(
    file: UploadFile = File(...), 
    model_id: str = Form("vision-v1")
):
    content = await file.read()
    
    # Валидация и распаковка (как в прошлом шаге)
    if file.content_type in ["application/zip", "application/x-zip-compressed"] or file.filename.endswith('.zip'):
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as z:
                image_files = [f for f in z.namelist() if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
                if not image_files:
                    raise HTTPException(status_code=400, detail="В архиве нет изображений")
                filename_to_process = image_files[0]
        except zipfile.BadZipFile:
            raise HTTPException(status_code=400, detail="Некорректный ZIP архив")
    else:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Файл должен быть изображением или ZIP-архивом")
        filename_to_process = file.filename

    await asyncio.sleep(1.0) # Имитация работы модели
    
    # Выбираем победителя
    result = random.choice(WEATHER_CLASSES)
    winner_class = result["class"]
    confidence = round(random.uniform(result["confidence_range"][0], result["confidence_range"][1]), 2)
    
    # Генерируем вероятности для остальных классов (остаток от 1.0)
    other_classes = [c["class"] for c in WEATHER_CLASSES if c["class"] != winner_class]
    remaining_conf = round(1.0 - confidence, 2)
    
    # Случайно делим остаток между двумя другими классами
    split_1 = round(random.uniform(0.1, 0.9) * remaining_conf, 2)
    split_2 = round(remaining_conf - split_1, 2)
    
    probabilities = {
        winner_class: confidence,
        other_classes[0]: split_1,
        other_classes[1]: split_2
    }
    
    return {
        "status": "success",
        "prediction": {
            "class": result["class"],
            "label": result["label"],
            "confidence": confidence,
            "probabilities": probabilities # <-- Отдаем полную картину
        },
        "filename": filename_to_process,
        "model_used": model_id,
        "message": "Mock prediction completed successfully"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ml-mock"}