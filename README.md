# Web-service-weather-detection

Сервис классификации погодных условий (ясно, дождь, снег, туман) по изображениям дорожной сцены для систем автономного вождения.

## 🔗 Ссылки на документацию и дизайн
- 🏗 [Архитектура системы (Eraser.io)](https://app.eraser.io/workspace/cu8Lz52vfFLs8MKLUVrh?origin=share)
- 🎨 [UI-Kit (Figma)](https://www.figma.com/design/VYZ4rdQsB0D0Vyb0xPvn1G/Web-service-weather-detection?node-id=78-55)
- 🖼 [Черновой дизайн интерфейса (Figma)](https://www.figma.com/design/VYZ4rdQsB0D0Vyb0xPvn1G/Web-service-weather-detection?node-id=69-1669)

## 🏗 Архитектура и стек
Проект построен как монорепозиторий из трёх сервисов:
| Сервис | Стек | Назначение |
| :--- | :--- | :--- |
| `frontend-js/` | JS + Vite + React + Tailwind | Веб-интерфейс для загрузки изображений |
| `backend-api/` | Ruby on Rails | API-шлюз: аутентификация и маршрутизация |
| `ml-service/` | Python, PyTorch, FastAPI, OpenCV | Инференс и обучение модели классификации |

## 🚀 Быстрый старт
```bash
bin/rails server        # запуск backend API
npm run dev             # запуск frontend сервера
```

### Запуск через Docker Compose

Поднимает frontend, backend, ML-сервис и PostgreSQL одной командой:

```bash
docker compose up --build
```

После запуска:

| Сервис | Адрес |
| :--- | :--- |
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| ML-сервис (Swagger) | http://localhost:8000/docs |
| PostgreSQL | только внутри Docker-сети |

Остановка:

```bash
docker compose down
```

Остановка с удалением базы данных:

```bash
docker compose down -v
```

При первом запуске backend автоматически применяет миграции и загружает сиды. Для доступа к консоли Rails:

```bash
docker compose exec backend-api bin/rails console
```
