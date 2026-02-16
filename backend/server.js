/**
 * AVIARIUM — бэкенд чат-помощника.
 * Принимает сообщения от виджета, отправляет в API нейросети, возвращает ответ.
 * Поддерживается OpenAI-совместимый API (OpenAI, некоторые прокси к YandexGPT/GigaChat).
 */

import 'dotenv/config';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Ключ и URL API (OpenAI или совместимый)
const API_KEY = process.env.OPENAI_API_KEY || process.env.API_KEY;
const API_BASE = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const MODEL = process.env.CHAT_MODEL || 'gpt-4o-mini';

// Системный промпт: помощник AVIARIUM
const SYSTEM_PROMPT = `Ты — вежливый помощник премиум-бренда AVIARIUM. Отвечай кратко и по делу, в стиле люкс-сервиса.

О бренде: AVIARIUM продаёт подарочные коллекции редких куриных яиц (цветная скорлупа от редких пород) в авторской упаковке. Целевая аудитория — состоятельные клиенты, подарки, гастрономия.

Ты знаешь:
- Коллекции: «Рассвет Империи» (24 900 ₽), «Лазурит» (34 500 ₽), «Перламутр и Золото» (59 000 ₽) и другие (Лунный сад, Осенний лес, Нефертити, Северное сияние, Павлин, Кобальт и золото, Ночной сад, Алмаз, Османский).
- Упаковка: ларец из берёзы, стеклянный кейс на мраморе, кожаный сундучок и др.
- Услуги: выездной завтрак, гравировка на скорлупе, корпоративные подарки.
- Когда яйца съедены: (1) Повторный заказ яиц — набор без упаковки, дешевле; или подбор по цвету и количеству. (2) Скорлупа и писанки — обработанная скорлупа (натуральная — в т.ч. чтобы наполнить пустую шкатулку; или писанка: стандарт, по эскизу, разработка дизайна нами). (3) Шкатулки подходят для хранения драгоценностей; возможны умные опции: умный замок, датчики открытия и температуры — уточнять по запросу.
- Контакты: +7 (921) 925-55-11, Telegram.

Правила:
- Не придумывай цены, акции и факты — опирайся только на информацию выше.
- Если вопрос вне темы (политика, медицина и т.п.), вежливо верни к теме подарков и коллекций.
- При сложных или персональных запросах предлагай оставить заявку или позвонить нам.
- Пиши на русском, короткими абзацами, без сленга.`;

app.use(express.json());

// CORS: разрешаем запросы с сайта (и с file:// при локальной разработке)
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// История диалога в памяти (в продакшене лучше Redis/БД)
const sessions = new Map();
const MAX_HISTORY = 20;

function getHistory(sessionId) {
  if (!sessions.has(sessionId)) sessions.set(sessionId, []);
  return sessions.get(sessionId);
}

function appendHistory(sessionId, role, content) {
  const h = getHistory(sessionId);
  h.push({ role, content });
  if (h.length > MAX_HISTORY) h.splice(0, h.length - MAX_HISTORY);
}

// POST /api/chat — отправить сообщение и получить ответ
app.post('/api/chat', async (req, res) => {
  const { message, sessionId: rawId } = req.body || {};
  const sessionId = rawId || 'default';

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Требуется поле message' });
  }

  const text = message.trim().slice(0, 2000);
  if (!text) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым' });
  }

  if (!API_KEY) {
    return res.status(503).json({
      error: 'Чат временно недоступен',
      reply: 'Служба поддержки AVIARIUM доступна по телефону +7 (921) 925-55-11 и в Telegram. Пожалуйста, напишите или позвоните нам.'
    });
  }

  const history = getHistory(sessionId);
  appendHistory(sessionId, 'user', text);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-MAX_HISTORY).map(({ role, content }) => ({ role, content }))
  ];

  try {
    const response = await fetch(`${API_BASE.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: 512,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('LLM API error:', response.status, errText);
      appendHistory(sessionId, 'assistant', '(ошибка сервера)');
      return res.status(502).json({
        error: 'Ошибка сервиса ответов',
        reply: 'Не удалось получить ответ. Пожалуйста, позвоните нам: +7 (921) 925-55-11.'
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || 'Извините, не могу ответить. Позвоните нам: +7 (921) 925-55-11.';
    appendHistory(sessionId, 'assistant', reply);

    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({
      error: 'Ошибка сервера',
      reply: 'Соединение недоступно. Обратитесь, пожалуйста, по телефону +7 (921) 925-55-11 или в мессенджеры.'
    });
  }
});

// Проверка работы API (без ключа тоже отвечает)
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    chat: !!API_KEY
  });
});

// ——— Заявки: обратный звонок и заказ (отправка в Telegram при наличии настроек) ———
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendToTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'HTML'
      })
    });
    return res.ok;
  } catch (e) {
    console.error('Telegram send error:', e);
    return false;
  }
}

// POST /api/callback — заказ обратного звонка (имя, телефон; опционально продукт и цена со страницы коллекции)
app.post('/api/callback', async (req, res) => {
  const { name, phone, product, price } = req.body || {};
  if (!name || !phone) {
    return res.status(400).json({ ok: false, error: 'Укажите имя и телефон' });
  }
  let text = `🔄 <b>Обратный звонок AVIARIUM</b>\nИмя: ${String(name).replace(/</g, '')}\nТелефон: ${String(phone).replace(/</g, '')}`;
  if (product && String(product).trim()) {
    text += `\nТовар: ${String(product).replace(/</g, '')}`;
  }
  if (price && String(price).trim()) {
    text += `\nЦена: ${String(price).replace(/</g, '')}`;
  }
  console.log('Callback:', name, phone, product || '', price || '');
  await sendToTelegram(text);
  res.json({ ok: true });
});

// POST /api/order — заявка на заказ (данные формы + состав корзины)
app.post('/api/order', async (req, res) => {
  const body = req.body || {};
  const { name, phone, email, address, urgency, date_wish, comment, items, total } = body;
  if (!name || !phone) {
    return res.status(400).json({ ok: false, error: 'Укажите имя и телефон' });
  }
  const lines = [
    '📦 <b>Заказ AVIARIUM</b>',
    `Имя: ${String(name).replace(/</g, '')}`,
    `Телефон: ${String(phone).replace(/</g, '')}`,
    email ? `Email: ${String(email).replace(/</g, '')}` : '',
    address ? `Адрес: ${String(address).replace(/</g, '')}` : '',
    urgency ? `Срочность: ${String(urgency).replace(/</g, '')}` : '',
    date_wish ? `Дата: ${String(date_wish).replace(/</g, '')}` : '',
    comment ? `Комментарий: ${String(comment).replace(/</g, '')}` : '',
    items && items.length ? '\nСостав:\n' + items.map(i => `• ${i.name} — ${i.price} ₽`).join('\n') : '',
    total != null ? `\nИтого: ${total} ₽` : ''
  ].filter(Boolean);
  const text = lines.join('\n');
  console.log('Order:', name, phone, total);
  await sendToTelegram(text);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`AVIARIUM backend: http://localhost:${PORT}`);
  if (!API_KEY) console.warn('OPENAI_API_KEY не задан — чат будет возвращать заглушку.');
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) console.warn('TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID не заданы — заявки будут только в логе.');
});
