import asyncio
import io
import os
import random
import zipfile

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware


WEATHER_CLASSES = [
    {"class": "rain", "label": "Дождь", "confidence_range": (0.75, 0.95)},
    {"class": "snow", "label": "Снег", "confidence_range": (0.80, 0.98)},
    {"class": "fog", "label": "Туман", "confidence_range": (0.70, 0.90)},
]
WEATHER_CLASSES_BY_NAME = {item["class"]: item for item in WEATHER_CLASSES}

SUPPORTED_SCENARIOS = {
    "random",
    "rain",
    "snow",
    "fog",
    "invalid_image",
    "unavailable",
    "internal_error",
}


def _env_float(name: str, default: float) -> float:
    value = float(os.getenv(name, str(default)))
    if value < 0:
        raise ValueError(f"{name} must be greater than or equal to 0")
    return value


def _env_int(name: str, default: int) -> int:
    value = int(os.getenv(name, str(default)))
    if value < 0:
        raise ValueError(f"{name} must be greater than or equal to 0")
    return value


MOCK_SCENARIO = os.getenv("MOCK_SCENARIO", "random").strip().lower()
if MOCK_SCENARIO not in SUPPORTED_SCENARIOS:
    allowed = ", ".join(sorted(SUPPORTED_SCENARIOS))
    raise ValueError(f"Unsupported MOCK_SCENARIO={MOCK_SCENARIO!r}. Allowed values: {allowed}")

MOCK_DELAY_SECONDS = _env_float("MOCK_DELAY_SECONDS", 1.0)
MOCK_FAIL_FIRST_N_REQUESTS = _env_int("MOCK_FAIL_FIRST_N_REQUESTS", 0)
_requests_seen = 0


app = FastAPI(title="Mock ML Weather Detection Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _maybe_fail_first_request() -> None:
    """Return a temporary 503 for the configured number of initial requests."""
    global _requests_seen
    _requests_seen += 1

    if _requests_seen <= MOCK_FAIL_FIRST_N_REQUESTS:
        raise HTTPException(
            status_code=503,
            detail="Временная ошибка mock ML-сервиса (имитация недоступности)",
        )


def _validate_and_get_filename(file: UploadFile, content: bytes) -> str:
    filename = file.filename or "upload"
    content_type = (file.content_type or "").lower()
    is_zip = (
        content_type in {"application/zip", "application/x-zip-compressed"}
        or filename.lower().endswith(".zip")
    )

    if not content:
        raise HTTPException(status_code=400, detail="Файл пуст")

    if is_zip:
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                image_files = [
                    item.filename
                    for item in archive.infolist()
                    if not item.is_dir()
                    and item.filename.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
                ]
                if not image_files:
                    raise HTTPException(status_code=400, detail="В архиве нет изображений")
                return image_files[0]
        except zipfile.BadZipFile:
            raise HTTPException(status_code=400, detail="Некорректный ZIP архив")

    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Файл должен быть изображением или ZIP-архивом",
        )

    return filename


def _build_prediction():
    if MOCK_SCENARIO == "random":
        result = random.choice(WEATHER_CLASSES)
        confidence = round(
            random.uniform(*result["confidence_range"]),
            2,
        )
    else:
        result = WEATHER_CLASSES_BY_NAME[MOCK_SCENARIO]
        lower, upper = result["confidence_range"]
        confidence = round((lower + upper) / 2, 2)

    other_classes = [
        item["class"]
        for item in WEATHER_CLASSES
        if item["class"] != result["class"]
    ]

    remaining_confidence = round(1.0 - confidence, 2)
    first_probability = round(
        random.uniform(0.1, 0.9) * remaining_confidence,
        2,
    )
    second_probability = round(remaining_confidence - first_probability, 2)

    probabilities = {
        result["class"]: confidence,
        other_classes[0]: first_probability,
        other_classes[1]: second_probability,
    }

    return result, confidence, probabilities


@app.post("/predict")
async def predict_weather(
    file: UploadFile = File(...),
    model_id: str = Form("vision-v1"),
):
    content = await file.read()

    if MOCK_DELAY_SECONDS:
        await asyncio.sleep(MOCK_DELAY_SECONDS)

    _maybe_fail_first_request()

    if MOCK_SCENARIO == "invalid_image":
        raise HTTPException(
            status_code=400,
            detail="Изображение отклонено mock-сервисом (имитация некорректного файла)",
        )

    if MOCK_SCENARIO == "unavailable":
        raise HTTPException(
            status_code=503,
            detail="Mock ML-сервис временно недоступен",
        )

    if MOCK_SCENARIO == "internal_error":
        raise HTTPException(
            status_code=500,
            detail="Внутренняя ошибка mock ML-сервиса",
        )

    filename_to_process = _validate_and_get_filename(file, content)
    result, confidence, probabilities = _build_prediction()

    return {
        "status": "success",
        "prediction": {
            "class": result["class"],
            "label": result["label"],
            "confidence": confidence,
            "probabilities": probabilities,
        },
        "filename": filename_to_process,
        "model_used": model_id,
        "message": "Mock prediction completed successfully",
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ml-mock",
        "scenario": MOCK_SCENARIO,
    }
