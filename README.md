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
| `ml-service/` | Python + FastAPI (mock) | Заглушка API инференса для проверки интеграции |

## 🚀 Быстрый старт
```bash
bin/rails server        # запуск backend API
npm run dev             # запуск frontend сервера
```

### Запуск через Docker Compose

Поднимает frontend, backend, mock ML-сервис и PostgreSQL одной командой:

```bash
docker compose up --build
```

После запуска:

| Сервис | Адрес |
| :--- | :--- |
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Mock ML-сервис (Swagger) | http://localhost:8000/docs |
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

## Управляемые сценарии mock ML-сервиса

Заглушка не анализирует содержимое изображения: она имитирует API настоящей модели и возвращает тестовый результат. Сценарий выбирается переменными окружения; менять код для переключения не нужно.

| Переменная | Значение по умолчанию | Назначение |
| :--- | :--- | :--- |
| `MOCK_SCENARIO` | `random` | Сценарий ответа: `random`, `rain`, `snow`, `fog`, `invalid_image`, `unavailable`, `internal_error` |
| `MOCK_DELAY_SECONDS` | `1` | Задержка перед ответом в секундах; `0` отключает её |
| `MOCK_FAIL_FIRST_N_REQUESTS` | `0` | Вернуть HTTP 503 на первые N запросов, затем перейти к обычному сценарию |

Примеры запуска отдельных сценариев из корня проекта:

```bash
# Всегда успешно возвращать класс «Дождь»
MOCK_SCENARIO=rain docker compose up -d --force-recreate ml-service

# Имитировать некорректное изображение (HTTP 400; повторять запрос не нужно)
MOCK_SCENARIO=invalid_image docker compose up -d --force-recreate ml-service

# Имитировать постоянную недоступность (HTTP 503; Sidekiq будет повторять попытки)
MOCK_SCENARIO=unavailable docker compose up -d --force-recreate ml-service

# Один временный сбой HTTP 503, затем успешный ответ — удобно для проверки retry
MOCK_SCENARIO=snow MOCK_FAIL_FIRST_N_REQUESTS=1 docker compose up -d --force-recreate ml-service

# Увеличить задержку mock до 4 секунд
MOCK_DELAY_SECONDS=4 docker compose up -d --force-recreate ml-service
```

После смены сценария проверить активную конфигурацию можно запросом:

```bash
curl http://localhost:8000/health
```

Чтобы вернуться к обычному случайному результату:

```bash
docker compose up -d --force-recreate ml-service
```

Переменные действуют только на контейнер mock ML-сервиса. Для изменения сценария уже запущенный контейнер нужно пересоздать. Счётчик `MOCK_FAIL_FIRST_N_REQUESTS` хранится в памяти процесса и сбрасывается при пересоздании контейнера.
