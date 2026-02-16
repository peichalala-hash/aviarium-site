# Бэкенд чат-помощника AVIARIUM

Сервер принимает сообщения от виджета на сайте, отправляет их в API нейросети и возвращает ответ помощника.

## Быстрый старт

```bash
cd backend
npm install
cp .env.example .env
# Отредактируйте .env: вставьте OPENAI_API_KEY
npm start
```

Сервер будет доступен на `http://localhost:3000`. Виджет на сайте нужно настроить на этот URL (см. ниже).

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `OPENAI_API_KEY` или `API_KEY` | Ключ API нейросети. Без ключа чат возвращает заглушку с контактами. |
| `OPENAI_BASE_URL` | URL API (по умолчанию `https://api.openai.com/v1`). Для прокси к другим моделям укажите свой URL. |
| `CHAT_MODEL` | Модель (по умолчанию `gpt-4o-mini`). |
| `PORT` | Порт сервера (по умолчанию 3000). |

## Подключение YandexGPT / GigaChat

Бэкенд ожидает **OpenAI-совместимый** endpoint: `POST {BASE_URL}/chat/completions` с телом `{ model, messages }`.

- **YandexGPT**: используйте [прокси](https://github.com/andrew-shen/OpenAI-Proxy-for-Yandex-GPT) или сервис-адаптер, который принимает запрос в формате OpenAI и переводит его в Yandex Cloud API.
- **GigaChat**: проверьте, есть ли у провайдера совместимый с OpenAI endpoint; иначе нужен отдельный роут в `server.js` и вызов их API по документации.

После настройки прокси/адаптера задайте в `.env`:
- `OPENAI_BASE_URL=https://ваш-прокси/v1`
- `OPENAI_API_KEY=ваш-ключ-прокси-или-сервиса`

## API

- `POST /api/chat` — тело: `{ "message": "текст", "sessionId": "опционально" }`. Ответ: `{ "reply": "ответ нейросети" }`.
- `GET /api/health` — проверка работы; в ответе `chat: true/false` в зависимости от наличия ключа.

## Настройка виджета на сайте

В `index.html` перед `</body>` задаётся URL бэкенда:

```html
<script>
  window.AVIARIUM_CHAT_API = 'http://localhost:3000';
</script>
<script src="script.js"></script>
```

При публикации сайта замените на реальный адрес вашего сервера, например `https://ваш-домен.ru/api` (если бэкенд отдаётся с того же домена через прокси).
