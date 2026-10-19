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
    model_id: str = Form("vision-v1") # <-- Принимаем ID модели
):
    content = await file.read()
    
    # 1. Обработка архива (ZIP)
    if file.content_type in ["application/zip", "application/x-zip-compressed"] or file.filename.endswith('.zip'):
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as z:
                # Ищем первый попавшийся файл изображения в архиве
                image_files = [f for f in z.namelist() if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
                if not image_files:
                    raise HTTPException(status_code=400, detail="В архиве нет изображений")
                # В реальном приложении тут был бы цикл по всем фото, 
                # но для мока просто имитируем, что нашли фото
                filename_to_process = image_files[0]
        except zipfile.BadZipFile:
            raise HTTPException(status_code=400, detail="Некорректный ZIP архив")
    else:
        # 2. Обработка одиночного фото
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Файл должен быть изображением или ZIP-архивом")
        filename_to_process = file.filename

    # 3. Имитация времени инференса (1 секунда)
    await asyncio.sleep(1.0)
    
    # 4. Генерация ответа
    result = random.choice(WEATHER_CLASSES)
    confidence = round(random.uniform(result["confidence_range"][0], result["confidence_range"][1]), 2)
    
    return {
        "status": "success",
        "prediction": {
            "class": result["class"],
            "label": result["label"],
            "confidence": confidence
        },
        "filename": filename_to_process,
        "model_used": model_id,
        "message": "Mock prediction completed successfully"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ml-mock"}