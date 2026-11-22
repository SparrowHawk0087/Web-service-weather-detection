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
| Recovery | Отдельный Rails-процесс `dispatch-recovery` | Восстановление неотправленных outbox-записей |
| `ml-service/` | Python + FastAPI | Mock API модели классификации |
| Real-time | ActionCable | Push-обновление статусов через WebSocket |

## Быстрый старт через Docker Compose

Для локального запуска не требуется предварительно создавать `.env`: Compose содержит безопасные для локальной разработки значения по умолчанию.

Из корня репозитория выполни:

```bash
docker compose up --build
```

При желании можно создать собственный файл настроек:

```bash
cp .env.example .env
```

После этого отредактируй значения в `.env`. Compose автоматически загрузит этот файл. Он игнорируется Git — не добавляй реальные пароли и секреты в коммиты.

> **Важно:** значения по умолчанию предназначены только для локальной разработки. Перед production-развёртыванием обязательно задай уникальные `DB_PASSWORD` и `SECRET_KEY_BASE`, а также настрой остальные секреты и сетевой доступ.

### Как запускается база данных

Compose выполняет запуск в следующем порядке:

1. `db` запускает PostgreSQL. Healthcheck проверяет не только готовность сервера, но и успешное подключение с заданными пользователем и паролем.
2. Одноразовый сервис `db-setup` дожидается PostgreSQL, выполняет `bin/rails db:prepare` и загружает сиды.
3. `backend-api`, `sidekiq` и `dispatch-recovery` запускаются только после успешного завершения `db-setup`.
4. Frontend запускается вместе с API.

Таким образом, Rails-процессы не обращаются к таблицам до завершения подготовки базы данных. При последующих запусках `db:prepare` безопасно проверяет состояние схемы и применяет ожидающие миграции.

Для запуска в фоне:

```bash
docker compose up --build -d
```

| Сервис | Адрес |
| :--- | :--- |
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Sidekiq Web UI | http://localhost:3000/sidekiq |
| Mock ML API / Swagger | http://localhost:8000/docs |
| Проверка mock | http://localhost:8000/health |

### Диагностика запуска

Посмотреть состояние контейнеров:

```bash
docker compose ps -a
```

Посмотреть логи PostgreSQL и одноразовой подготовки БД:

```bash
docker compose logs db db-setup
```

Посмотреть логи приложения и фоновых процессов:

```bash
docker compose logs -f backend-api sidekiq dispatch-recovery
```

Если `db-setup` завершился с ошибкой, сначала исправь указанную в его логах проблему. API, Sidekiq и recovery не должны запускаться до успешной подготовки БД.

### Повторное использование PostgreSQL volume

Пароль пользователя PostgreSQL задаётся только при первоначальной инициализации пустого volume. Изменение `DB_PASSWORD` в `.env` не меняет пароль уже созданного пользователя в существующей БД.

Поэтому при повторном запуске с ранее созданным `pgdata` используй те же `DB_USER` и `DB_PASSWORD`, с которыми этот volume был создан. Если пароль необходимо сменить, сначала измени его внутри PostgreSQL (например, через `ALTER USER`), затем укажи такое же значение в `.env`.

Обычная остановка без удаления данных:

```bash
docker compose down
```

Полное удаление контейнеров и volumes:

```bash
docker compose down -v
```

> **Внимание:** `docker compose down -v` удаляет PostgreSQL volume, Redis volume и загруженные изображения. Используй эту команду только когда действительно нужно начать с чистого состояния и данные можно потерять.

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
  spec/jobs/recover_prediction_dispatches_job_spec.rb \
  spec/services/prediction_dispatch_service_spec.rb \
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
docker compose logs -f backend-api sidekiq dispatch-recovery ml-service
```

### Sidekiq Web UI

Для мониторинга очередей открой `http://localhost:3000/sidekiq`. Интерфейс защищён HTTP Basic Authentication. Укажи собственные значения в локальном `.env`:

```dotenv
SIDEKIQ_WEB_USERNAME=your-monitoring-user
SIDEKIQ_WEB_PASSWORD=replace-with-a-long-random-password
```

Создай отдельный пароль для мониторинга и не используй пароль от PostgreSQL или Rails. Если одно или оба значения не заданы, Sidekiq Web UI отклоняет все запросы. Не публикуй этот интерфейс в интернет без HTTPS и дополнительного ограничения доступа.

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
