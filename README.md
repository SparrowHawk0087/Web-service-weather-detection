# Web-service-weather-detection

Сервис классификации погодных условий (ясно, дождь, снег, туман) по изображениям дорожной сцены для систем автономного вождения.

> **Текущий статус ML:** интеграция с ML API и фоновым конвейером реализована, но сервис `ml-service` пока является управляемой FastAPI mock-заглушкой. Он имитирует ответы модели и ошибки, но не анализирует содержимое изображения настоящей нейросетью.

## 🔗 Ссылки на документацию и дизайн
- 🏗 [Архитектура системы (Eraser.io)](https://app.eraser.io/workspace/cu8Lz52vfFLs8MKLUVrh?origin=share)
- 🎨 [UI-Kit (Figma)](https://www.figma.com/design/VYZ4rdQsB0D0Vyb0xPvn1G/Web-service-weather-detection?node-id=78-55)
- 🖼 [Черновой дизайн интерфейса (Figma)](https://www.figma.com/design/VYZ4rdQsB0D0Vyb0xPvn1G/Web-service-weather-detection?node-id=69-1669)
- 📘 [Асинхронный конвейер, статусы, retry и тестирование](docs/prediction-pipeline.md)

## Архитектура и стек

| Компонент | Стек | Назначение |
| :--- | :--- | :--- |
| `frontend-js/` | React, Vite, Tailwind | Веб-интерфейс загрузки и истории |
| `backend-api/` | Ruby on Rails 8.1 | API, аутентификация, хранение predictions |
| База данных | PostgreSQL | Пользователи и результаты классификации |
| Очередь | Redis + Sidekiq 8 | Фоновая обработка и повторные попытки |
| `ml-service/` | Python + FastAPI | Mock API модели классификации |
| Real-time | ActionCable | Push-обновление статусов через WebSocket |

## Быстрый старт через Docker Compose

Из корня репозитория сначала создай локальный файл переменных окружения:

```bash
cp .env.example .env
sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$(openssl rand -hex 24)/" .env
sed -i "s/^SECRET_KEY_BASE=.*/SECRET_KEY_BASE=$(openssl rand -hex 64)/" .env
```

Файл `.env` игнорируется Git и содержит локальные секреты. Не добавляй его в коммиты. Если используешь уже созданный PostgreSQL volume от старой конфигурации, не меняй пароль только в `.env`: значение должно совпадать с паролем пользователя в существующей БД. Сначала обнови пароль PostgreSQL командой `ALTER USER`, затем укажи новое значение в `.env`.

Для другого адреса frontend измени `CORS_ALLOWED_ORIGINS` в `.env`, перечислив origins через запятую.

Затем запусти сервисы:

```bash
docker compose up --build
```

Для запуска в фоне:

```bash
docker compose up --build -d
```

При первом старте backend автоматически подготавливает базу данных и загружает сиды.

| Сервис | Адрес |
| :--- | :--- |
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Mock ML API / Swagger | http://localhost:8000/docs |
| Проверка mock | http://localhost:8000/health |

Остановка:

```bash
docker compose down
```

Остановка с удалением данных БД и загруженных файлов:

```bash
docker compose down -v
```

> `docker compose down -v` удаляет PostgreSQL volume и загруженные изображения. Не используй эту команду, если нужно сохранить локальные данные.

## Управляемые сценарии mock ML

| Переменная | По умолчанию | Назначение |
| :--- | :--- | :--- |
| `MOCK_SCENARIO` | `random` | `random`, `rain`, `snow`, `fog`, `invalid_image`, `unavailable`, `internal_error` |
| `MOCK_DELAY_SECONDS` | `1` | Задержка ответа, секунд |
| `MOCK_FAIL_FIRST_N_REQUESTS` | `0` | Первые N запросов возвращают HTTP 503, затем работает выбранный сценарий |

Пример: один временный сбой, затем успешный результат «Снег»:

```bash
export MOCK_SCENARIO=snow
export MOCK_FAIL_FIRST_N_REQUESTS=1
export MOCK_DELAY_SECONDS=1
docker compose up -d --force-recreate ml-service
curl http://localhost:8000/health
```

Постоянная недоступность:

```bash
export MOCK_SCENARIO=unavailable
export MOCK_FAIL_FIRST_N_REQUESTS=0
docker compose up -d --force-recreate ml-service
```

Возврат к обычному случайному результату:

```bash
export MOCK_SCENARIO=random
export MOCK_FAIL_FIRST_N_REQUESTS=0
docker compose up -d --force-recreate ml-service
```

Переменные `export` сохраняются в текущем терминале. Если открываешь новый терминал, задай их заново. Подробности всех сценариев и поведения retry — в [документации конвейера](docs/prediction-pipeline.md).

## Запуск тестов

Все Rails RSpec тесты. Контейнер backend API работает с `RAILS_ENV=development`, поэтому тестовую среду нужно указать явно:

```bash
docker compose exec -e RAILS_ENV=test backend-api bin/rails db:prepare
docker compose exec -e RAILS_ENV=test backend-api bundle exec rspec
```

Интеграционные проверки конвейера, нескольких независимых заданий, Sidekiq Web UI и retry:

```bash
docker compose exec -e RAILS_ENV=test backend-api bundle exec rspec \
  spec/jobs/analyze_prediction_job_spec.rb \
  spec/requests/prediction_pipeline_integration_spec.rb \
  spec/requests/sidekiq_web_spec.rb
```

Unit-тесты FastAPI mock:

```bash
docker compose exec ml-service python -m unittest discover -s tests -v
```

Сборка frontend:

```bash
docker compose exec frontend npm run build
```

Просмотр логов:

```bash
docker compose logs -f backend-api sidekiq ml-service
```


### Sidekiq Web UI

Для мониторинга очередей открой `http://localhost:3000/sidekiq`. Интерфейс защищён HTTP Basic Authentication. Укажи собственные значения в локальном `.env`:

```dotenv
SIDEKIQ_WEB_USERNAME=your-monitoring-user
SIDEKIQ_WEB_PASSWORD=replace-with-a-long-random-password
```

Создай отдельный пароль для мониторинга и не используй пароль от PostgreSQL или Rails. Если одно или оба значения не заданы, Sidekiq Web UI отклоняет все запросы. Не публикуй этот интерфейс в интернет без HTTPS и дополнительного ограничения доступа.

Добавь адрес в таблицу сервисов:
| Sidekiq Web UI | http://localhost:3000/sidekiq |

### Демонстрация нескольких задач и переподключения WebSocket

1. Задай `MOCK_DELAY_SECONDS=5` и `MOCK_SCENARIO=rain` в `.env`, затем пересоздай mock и Worker:
   ```bash
   docker compose up -d --force-recreate ml-service sidekiq
   ```
2. Открой три отдельные сессии браузера (например, три профиля) и войди под разными тестовыми пользователями. Отправь по одному изображению из каждой сессии почти одновременно. Открой Sidekiq Web UI и проверь очередь, активные задачи и завершённые задания. Worker настроен на concurrency 5; при достаточной нагрузке несколько задач должны выполняться одновременно. Один Dashboard ограничивает повторную отправку, пока текущий анализ активен.
3. В DevTools открой Network → WS и найди соединение `/cable`. Пока одна задача обрабатывается, перезапусти Rails API:
   ```bash
   docker compose restart backend-api
   ```
4. Убедись, что ActionCable подключается повторно, а Dashboard загружает актуальную историю после callback `connected`. Текущий hook вызывает `loadHistory` при каждом успешном подключении.

После демонстрации верни `MOCK_DELAY_SECONDS=1` и `MOCK_SCENARIO=random` в `.env`, затем пересоздай `ml-service`.
