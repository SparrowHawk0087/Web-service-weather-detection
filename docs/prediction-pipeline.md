# Асинхронный конвейер обработки изображений

## Назначение

Система принимает изображение дорожной сцены, сохраняет его, ставит задачу классификации в фоновую очередь и сообщает клиенту об изменении статуса. В текущей конфигурации FastAPI-сервис является **mock-заглушкой**: он имитирует контракт ML API, но не анализирует пиксели изображения и не запускает настоящую модель компьютерного зрения.

## Компоненты

| Компонент | Ответственность |
| --- | --- |
| React + Vite | Загрузка изображения, история, отображение статусов и результата |
| Rails API | Аутентификация, приём файла, запись prediction, выдача API |
| PostgreSQL | Пользователи, predictions, погодные классы и результаты |
| Shared Docker volume | Передача сохранённого изображения между Rails и Sidekiq |
| Redis | Брокер фоновых задач Sidekiq и pub/sub для ActionCable |
| Sidekiq | Выполнение фоновой задачи |
| FastAPI mock | Имитация ML API и управляемые тестовые ответы |
| ActionCable | Push-обновления статусов в браузер |
| Sidekiq Web | Мониторинг очереди, выполняющихся задач, retry и failed jobs; HTTP Basic Auth |

## Последовательность обработки

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as React UI
    participant API as Rails API
    participant DB as PostgreSQL
    participant FS as Shared image volume
    participant Redis
    participant Worker as Sidekiq / AnalyzePredictionJob
    participant ML as FastAPI mock
    participant Cable as ActionCable

    User->>UI: Выбирает изображение
    UI->>API: POST /predictions/async
    API->>FS: Сохраняет файл
    API->>DB: Создаёт prediction со статусом pending
    API->>Cable: Broadcast pending
    API->>Redis: Ставит AnalyzePredictionJob в очередь
    API-->>UI: 202 Accepted + prediction
    Redis->>Worker: Передаёт задачу
    Worker->>DB: claim! (pending → processing)
    Worker->>Cable: Broadcast processing
    Worker->>FS: Читает сохранённое изображение
    Worker->>ML: POST /predict (multipart file + model_id)

    alt Успешный ответ 2xx
        ML-->>Worker: Класс, confidence, probabilities
        Worker->>DB: Сохраняет результат (completed)
        Worker->>Cable: Broadcast completed
    else Отклонённый файл 400/422
        ML-->>Worker: Ошибка валидации
        Worker->>DB: Сохраняет ошибку (failed)
        Worker->>Cable: Broadcast failed
    else Временная ошибка / 5xx / timeout
        ML-->>Worker: Ошибка сервиса
        Worker->>DB: Возвращает pending, увеличивает retry_count
        Worker->>Cable: Broadcast pending
        Note over Redis,Worker: Повтор через 5 секунд, максимум 4 выполнения
        Redis->>Worker: Повторная задача
        Worker->>ML: POST /predict
        ML-->>Worker: Повторный ответ
        Note over Worker,DB: Успех → completed; исчерпаны попытки → failed
    end
```

## Статусы prediction

| Статус | Значение |
| --- | --- |
| `pending` | Запись создана или задача ожидает повторной попытки |
| `processing` | Worker захватил задачу и выполняет запрос к ML API |
| `completed` | Результат сохранён |
| `failed` | Обработка завершилась ошибкой |
| `cancelled` | Отменённое состояние модели данных; отдельный сценарий отмены в описанном конвейере не проверялся |

## Обработка ошибок и повторы

`MlService::WeatherPredictionClient` разделяет ошибки на два основных вида:

| Ситуация | Тип ошибки Rails | Повтор |
| --- | --- | --- |
| ML API ответил HTTP 400 или 422 | `RejectedFileError` | Нет |
| ML API ответил другой ошибкой, например HTTP 500/503 | `TransientError` | Да |
| Timeout, отказ соединения, сетевой сбой | `TransientError` | Да |
| Некорректный JSON от ML API | `TransientError` | Да |
| Неожиданная ошибка внутри обработки | Общая ошибка | Нет; prediction переводится в `failed` |

В `AnalyzePredictionJob` задано:

- задержка между попытками — 5 секунд;
- максимум — 4 выполнения задачи, включая первоначальное;
- при временной ошибке статус возвращается в `pending`, увеличивается `retry_count`;
- после исчерпания четырёх выполнений вызывается `Prediction#fail!`;
- при окончательном отказе сохраняются `error_code`, `error_message` и `finished_at`.

Успешная последовательность при одном временном сбое: `pending → processing → pending → processing → completed`.

Постоянная ошибка сервиса приводит к четырём HTTP-запросам и конечному статусу `failed`.

## API и real-time обновления

| Метод | Endpoint | Назначение |
| --- | --- | --- |
| `POST` | `/predictions/async` | Принять файл и поставить задачу в очередь; ответ — HTTP 202 |
| `GET` | `/predictions` | Получить историю пользователя |
| `GET` | `/predictions/:id` | Получить конкретный prediction |
| WebSocket | `/cable` | Получать события ActionCable |
| HTTP | `/sidekiq` | Sidekiq Web UI; HTTP Basic Auth, credentials обязательны для доступа |

Событие ActionCable имеет тип `prediction.updated` и содержит объект `prediction` со статусом, результатом или `error_code`. Доступ к потоку ограничен пользователем, прошедшим аутентификацию.

React hook использует ActionCable consumer. Библиотека отвечает за повторное открытие соединения после разрыва. Callback `connected` вызывается и при первоначальном подключении, и после восстановления; Dashboard в этот момент запрашивает актуальную историю, чтобы закрыть пропуски событий во время разрыва.

### Sidekiq Web UI

Адрес в локальной Docker-среде: `http://localhost:3000/sidekiq`.

Задай в локальном `.env` оба параметра:

```dotenv
SIDEKIQ_WEB_USERNAME=your-monitoring-user
SIDEKIQ_WEB_PASSWORD=replace-with-a-long-random-password
```

HTTP Basic Auth применяется ко всем запросам Web UI. При отсутствии одного или обоих значений доступ закрыт (fail closed). Не используй учётные данные БД и не публикуй интерфейс без HTTPS и сетевого ограничения доступа.

В API-only Rails приложении Sidekiq Web использует отдельные cookie и session middleware для CSRF-защиты своих форм. Эти middleware добавлены к Rack-приложению Sidekiq Web, а не включены глобально для JSON API.

## Управление mock ML-сервисом

Переменные задаются для контейнера `ml-service`:

| Переменная | По умолчанию | Описание |
| --- | --- | --- |
| `MOCK_SCENARIO` | `random` | `random`, `rain`, `snow`, `fog`, `invalid_image`, `unavailable`, `internal_error` |
| `MOCK_DELAY_SECONDS` | `1` | Задержка ответа в секундах |
| `MOCK_FAIL_FIRST_N_REQUESTS` | `0` | Первые N запросов возвращают HTTP 503, далее включается выбранный сценарий |

Пример: один 503, затем успешный результат «Снег»:

```bash
export MOCK_SCENARIO=snow
export MOCK_FAIL_FIRST_N_REQUESTS=1
export MOCK_DELAY_SECONDS=1
docker compose up -d --force-recreate ml-service
curl http://localhost:8000/health
```

Проверка постоянной ошибки:

```bash
export MOCK_SCENARIO=unavailable
export MOCK_FAIL_FIRST_N_REQUESTS=0
docker compose up -d --force-recreate ml-service
```

Обычный случайный режим:

```bash
export MOCK_SCENARIO=random
export MOCK_FAIL_FIRST_N_REQUESTS=0
docker compose up -d --force-recreate ml-service
```

Переменные `export` действуют в текущем shell. При открытии нового терминала их нужно задать повторно либо использовать файл `.env` в корне проекта. После изменения значений контейнер нужно пересоздать.

## Команды проверки

Запуск всех Rails RSpec тестов. Контейнер backend API по умолчанию работает с `RAILS_ENV=development`, поэтому нужно явно переключить команду в `test` и подготовить отдельную тестовую БД:

```bash
docker compose exec -e RAILS_ENV=test backend-api bin/rails db:prepare
docker compose exec -e RAILS_ENV=test backend-api bundle exec rspec
```

Интеграционные проверки фоновой задачи, множественных независимых отправок, Sidekiq Web UI и retry:

```bash
docker compose exec -e RAILS_ENV=test backend-api bundle exec rspec \
  spec/jobs/analyze_prediction_job_spec.rb \
  spec/requests/prediction_pipeline_integration_spec.rb \
  spec/requests/sidekiq_web_spec.rb
```

Unit-тесты mock ML-сервиса:

```bash
docker compose exec ml-service python -m unittest discover -s tests -v
```

Сборка frontend:

```bash
docker compose exec frontend npm run build
```

Логи worker и mock:

```bash
docker compose logs -f sidekiq ml-service
```

Состояние контейнеров:

```bash
docker compose ps
```

## Демонстрация параллельных задач и переподключения WebSocket

1. Установи `MOCK_DELAY_SECONDS=5` и `MOCK_SCENARIO=rain` в `.env`, затем пересоздай mock и worker:

   ```bash
   docker compose up -d --force-recreate ml-service sidekiq
   ```

2. Отправь несколько разных изображений в Dashboard в короткий промежуток времени. В Sidekiq Web проверь очередь, активные задачи и завершённые задания. Worker настроен на concurrency 5. При достаточной нагрузке несколько задач должны выполняться одновременно.
3. Открой DevTools → Network → WS и найди соединение `/cable`. Во время обработки перезапусти backend:

   ```bash
   docker compose restart backend-api
   ```

4. Убедись, что ActionCable восстанавливает соединение, а Dashboard повторно запрашивает историю после callback `connected`. Это ручная демонстрационная проверка; автоматический RSpec не имитирует реальный TCP/WebSocket разрыв браузерного соединения.

После проверки верни `MOCK_DELAY_SECONDS=1` и `MOCK_SCENARIO=random`, затем пересоздай `ml-service`.

## Ограничения текущей реализации

- FastAPI mock не выполняет компьютерное зрение: погодный класс выбирается по конфигурации либо случайно.
- Проверка mock-сервиса валидирует multipart-запрос и базовые признаки типа файла/ZIP, но не подтверждает, что произвольный файл является декодируемым изображением реального формата.
- Фиксированные сценарии предназначены для воспроизводимых демонстраций и тестирования инфраструктуры, а не для оценки качества ML.
- Переменная `MOCK_FAIL_FIRST_N_REQUESTS` использует счётчик в памяти одного процесса и сбрасывается при перезапуске контейнера. Для этой демонстрации следует оставлять один экземпляр mock-сервиса.
