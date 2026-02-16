# Деплой AVIARIUM: сайт + чат + заявки

Чтобы в сети работали **чат-помощник** и **отправка заявок** (обратный звонок, заказ из корзины), нужно выложить две части:

1. **Бэкенд** (папка `backend/`) — API для чата и приёма заявок.
2. **Сайт** (все HTML, CSS, JS, картинки) — статика на Netlify.

Заявки можно получать в **Telegram** — настройте бота и укажите переменные окружения на бэкенде.

---

## Шаг 0. Выложить проект на GitHub

Так Render и Netlify смогут подтягивать код по ссылке на репозиторий. Делается один раз.

### 0.1. Установить Git (если ещё нет)

- Скачайте установщик: [git-scm.com/download/win](https://git-scm.com/download/win), установите с настройками по умолчанию.
- Откройте **PowerShell** или **Терминал** (в Cursor: Terminal → New Terminal). Проверьте: `git --version` — должна появиться версия.

### 0.2. Создать репозиторий на GitHub

1. Зайдите на [github.com](https://github.com) и войдите (или зарегистрируйтесь).
2. Справа вверху нажмите **+** → **New repository**.
3. **Repository name:** например `aviarium-site`.
4. Оставьте **Public**, галочку **Add a README** можно не ставить (файлы добавим со своего компьютера).
5. Нажмите **Create repository**.
6. На открывшейся странице скопируйте **URL репозитория** — он выглядит так:  
   `https://github.com/ВАШ_ЛОГИН/aviarium-site.git`  
   (или с SSH: `git@github.com:ВАШ_ЛОГИН/aviarium-site.git`)

### 0.3. Залить проект с компьютера

В терминале выполните команды **по очереди**, подставив свой путь к папке и свой URL репозитория:

```powershell
cd "C:\Users\admin\Downloads\Obsidian_System_Max_Context\04_Business_New\AVIARIUM_site"
git init
git add .
git status
```

`git status` покажет список файлов, которые будут загружены. Должны быть `index.html`, `script.js`, `styles.css`, папка `backend/` и т.д. Файла `.env` и папки `node_modules` в списке быть не должно (их исключает `.gitignore`).

Дальше:

```powershell
git commit -m "Первый коммит: сайт AVIARIUM и бэкенд"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/aviarium-site.git
git push -u origin main
```

- Вместо `https://github.com/ВАШ_ЛОГИН/aviarium-site.git` подставьте **ваш** URL из шага 0.2.
- При `git push` браузер или окно могут попросить войти в GitHub (логин и пароль или токен). Если просят пароль — в GitHub теперь используют **Personal Access Token**: GitHub → Settings → Developer settings → Personal access tokens → создать токен с правом `repo` и ввести его вместо пароля.

После успешного `git push` обновите страницу репозитория на GitHub — там появятся все файлы. Дальше в Render и Netlify можно ссылаться на этот репозиторий.

---

## Шаг 1. Деплой бэкенда (Render)

1. Зарегистрируйтесь на [render.com](https://render.com) (бесплатный аккаунт).
2. **New → Web Service**.
3. Подключите репозиторий:
   - **Connect a repository** — выберите GitHub и репозиторий `aviarium-site` (или как вы его назвали).
   - **Root Directory** укажите: `backend` (Render будет собирать и запускать только папку с API).
4. **Build Command:** `npm install`
5. **Start Command:** `npm start`
6. **Environment** (переменные окружения) — добавьте:

   | Key | Значение |
   |-----|----------|
   | `PORT` | Оставьте как есть (Render подставит сам) или `3000` |
   | `OPENAI_API_KEY` | Ваш ключ OpenAI (или совместимого API) — для чата |
   | `TELEGRAM_BOT_TOKEN` | Токен бота от @BotFather — для заявок в Telegram |
   | `TELEGRAM_CHAT_ID` | ID чата (личный или группы), куда слать заявки |

   Опционально:
   - `OPENAI_BASE_URL` — если используете прокси к YandexGPT/GigaChat.
   - `CHAT_MODEL` — модель (по умолчанию `gpt-4o-mini`).

7. Нажмите **Create Web Service**. Дождитесь сборки.
8. Скопируйте **URL сервиса**, например: `https://aviarium-xxxx.onrender.com` — это адрес вашего API.

---

## Шаг 2. Указать URL API в сайте

Откройте файл **`script.js`** в корне сайта. Найдите строку:

```javascript
: 'https://YOUR_BACKEND_URL'; // замените на реальный URL
```

Замените `YOUR_BACKEND_URL` на ваш URL с Render **без** `https://` в середине — должно получиться так:

```javascript
: 'https://aviarium-xxxx.onrender.com';
```

(подставьте свой URL). Сохраните файл.

---

## Шаг 3. Деплой сайта (Netlify)

1. Зарегистрируйтесь на [netlify.com](https://netlify.com).
2. **Sites → Add new site → Deploy manually**.
3. Перетащите в окно браузера **всю папку сайта** `AVIARIUM_site`:
   - Внутри должны быть: `index.html`, `script.js`, `styles.css`, папки `images`, страницы `collection-*.html`, `breed-*.html` и т.д.
   - Папку **`backend`** можно не включать — она уже на Render.
4. После загрузки Netlify покажет адрес сайта, например: `https://random-name-123.netlify.app`.
5. При желании в **Domain settings** можно задать своё доменное имя.

Готово: сайт открывается по ссылке Netlify, чат и формы отправляют данные на ваш бэкенд на Render.

---

## Проверка

- Откройте сайт на Netlify, нажмите «Оформить заказ» или «Заказать» на коллекции — должна появиться надпись об успешной отправке (если бэкенд доступен).
- Откройте чат слева внизу, отправьте сообщение — должен прийти ответ (если задан `OPENAI_API_KEY`).
- Заявки приходят в Telegram, если заданы `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`.

Проверка бэкенда отдельно: откройте в браузере  
`https://ВАШ_BACKEND_URL/api/health` — должен вернуться JSON: `{"ok":true,"chat":true/false}`.

---

## Кратко

| Что | Где |
|-----|-----|
| Бэкенд (чат + заявки) | Render → Web Service, папка `backend`, переменные OPENAI_API_KEY, TELEGRAM_* |
| URL API в коде | В `script.js` заменить `YOUR_BACKEND_URL` на URL с Render |
| Сайт | Netlify → Deploy manually, перетащить папку сайта (без backend) |

Если чат не нужен, можно не указывать `OPENAI_API_KEY` — тогда чат будет показывать сообщение «позвоните нам». Заявки при этом продолжают уходить на бэкенд и в Telegram (если настроены).
