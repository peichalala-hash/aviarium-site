(function () {
  // URL бэкенда: на локальной разработке — localhost; в сети — замените на ваш URL (Render/Railway)
  if (typeof window.AVIARIUM_CHAT_API === 'undefined') {
    window.AVIARIUM_CHAT_API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
      ? 'http://localhost:3000'
      : 'https://YOUR_BACKEND_URL'; // замените на реальный URL после деплоя бэкенда
  }

  /* Маска телефона +7 (___) ___-__-__ */
  function formatPhoneMask(value) {
    var digits = (value || '').replace(/\D/g, '');
    if (digits.charAt(0) === '8') digits = '7' + digits.slice(1);
    if (digits.charAt(0) !== '7') digits = '7' + digits;
    digits = digits.slice(0, 11);
    if (digits.length <= 1) return digits ? '+' + digits : '';
    var s = '+7';
    if (digits.length > 1) s += ' (' + digits.slice(1, 4);
    if (digits.length >= 4) s += ') ' + digits.slice(4, 7);
    if (digits.length >= 7) s += '-' + digits.slice(7, 9);
    if (digits.length >= 9) s += '-' + digits.slice(9, 11);
    return s;
  }
  function onPhoneInput(e) {
    var el = e.target;
    var start = el.selectionStart;
    var prevLen = el.value.length;
    var formatted = formatPhoneMask(el.value);
    el.value = formatted;
    var newLen = formatted.length;
    var newStart = Math.max(0, start + (newLen - prevLen));
    if (newStart > formatted.length) newStart = formatted.length;
    el.setSelectionRange(newStart, newStart);
  }
  function applyPhoneMaskToInput(input) {
    if (!input) return;
    input.addEventListener('input', onPhoneInput);
    input.addEventListener('paste', function (e) {
      setTimeout(function () { onPhoneInput({ target: input }); }, 0);
    });
    if (input.value) input.value = formatPhoneMask(input.value);
  }
  document.querySelectorAll('.phone-mask-input').forEach(applyPhoneMaskToInput);

  var header = document.querySelector('.header');
  if (header) {
    function onScroll() {
      header.classList.toggle('scrolled', window.scrollY > 80);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  var burger = document.querySelector('.burger');
  var nav = document.getElementById('nav');
  if (burger && nav) {
    function closeMenu() {
      burger.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
    }
    function openMenu() {
      burger.setAttribute('aria-expanded', 'true');
      nav.classList.add('is-open');
    }
    burger.addEventListener('click', function () {
      if (nav.classList.contains('is-open')) closeMenu();
      else openMenu();
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });
  }

  /* Страница коллекции: по клику «Заказать» открываем модальное окно «Быстрый заказ» */
  var quickOrderModal = null;
  function getQuickOrderModal() {
    if (quickOrderModal) return quickOrderModal;
    var overlay = document.createElement('div');
    overlay.className = 'quick-order-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    var box = document.createElement('div');
    box.className = 'quick-order-modal';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-labelledby', 'quick-order-title');
    box.setAttribute('aria-modal', 'true');
    box.innerHTML =
      '<button type="button" class="quick-order-close" aria-label="Закрыть">×</button>' +
      '<h3 id="quick-order-title" class="quick-order-title">Быстрый заказ</h3>' +
      '<p class="quick-order-product-line">Товар: <strong class="quick-order-product"></strong></p>' +
      '<p class="quick-order-price-line">Цена: <strong class="quick-order-price"></strong></p>' +
      '<form class="quick-order-form" id="quick-order-form">' +
      '<input type="text" name="name" placeholder="Ваше имя" required autocomplete="name">' +
      '<input type="tel" name="phone" placeholder="+7 (___) ___-__-__" required class="phone-mask-input quick-order-phone" autocomplete="tel">' +
      '<button type="submit" class="btn btn-primary quick-order-submit">Отправить заявку</button>' +
      '</form>' +
      '<p class="quick-order-success hidden" id="quick-order-success">Спасибо! Мы перезвоним вам в ближайшее время.</p>';
    overlay.appendChild(box);
    applyPhoneMaskToInput(box.querySelector('.quick-order-phone'));
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeQuickOrder();
    });
    box.querySelector('.quick-order-close').addEventListener('click', closeQuickOrder);
    box.querySelector('#quick-order-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var form = box.querySelector('#quick-order-form');
      var nameInput = form.querySelector('input[name="name"]');
      var phoneInput = form.querySelector('input[name="phone"]');
      var name = nameInput && nameInput.value ? nameInput.value.trim() : '';
      var phone = phoneInput && phoneInput.value ? phoneInput.value.trim() : '';
      if (!name || !phone) return;
      var product = box.querySelector('.quick-order-product').textContent;
      var price = box.querySelector('.quick-order-price').textContent;
      var btn = form.querySelector('button[type="submit"]');
      var origText = btn.textContent;
      btn.textContent = 'Отправка…';
      btn.disabled = true;
      var apiBase = (typeof window.AVIARIUM_CHAT_API !== 'undefined' ? window.AVIARIUM_CHAT_API : '').replace(/\/$/, '');
      fetch(apiBase + '/api/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, phone: phone, product: product, price: price })
      }).then(function (res) {
        if (res.ok) {
          form.classList.add('hidden');
          box.querySelector('#quick-order-success').classList.remove('hidden');
          setTimeout(closeQuickOrder, 2500);
        } else {
          btn.textContent = 'Ошибка, попробуйте позже';
          btn.disabled = false;
        }
      }).catch(function () {
        btn.textContent = 'Ошибка, попробуйте позже';
        btn.disabled = false;
      }).finally(function () {
        if (btn.disabled === false) setTimeout(function () { btn.textContent = origText; }, 3000);
      });
    });
    document.body.appendChild(overlay);
    quickOrderModal = overlay;
    return quickOrderModal;
  }
  function openQuickOrder(productName, productPrice) {
    var modal = getQuickOrderModal();
    modal.querySelector('.quick-order-product').textContent = productName || '';
    modal.querySelector('.quick-order-price').textContent = productPrice || '';
    modal.querySelector('#quick-order-form').classList.remove('hidden');
    modal.querySelector('#quick-order-success').classList.add('hidden');
    modal.querySelector('input[name="name"]').value = '';
    modal.querySelector('input[name="phone"]').value = '';
    modal.querySelector('button[type="submit"]').textContent = 'Отправить заявку';
    modal.querySelector('button[type="submit"]').disabled = false;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { modal.querySelector('input[name="name"]').focus(); }, 100);
  }
  function closeQuickOrder() {
    if (!quickOrderModal) return;
    quickOrderModal.classList.remove('is-open');
    quickOrderModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && quickOrderModal && quickOrderModal.classList.contains('is-open')) {
      closeQuickOrder();
    }
  });
  document.querySelectorAll('.btn-order-collection').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var page = document.querySelector('.page-collection');
      if (!page) return;
      e.preventDefault();
      var titleEl = page.querySelector('.collection-title');
      var priceEl = page.querySelector('.collection-price');
      var productName = titleEl ? titleEl.textContent.trim() : '';
      var productPrice = priceEl ? priceEl.textContent.trim() : '';
      openQuickOrder(productName, productPrice);
    });
  });

  var form = document.getElementById('callback-form');

  var form = document.getElementById('callback-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var nameInput = form.querySelector('input[name="name"]');
      var phoneInput = form.querySelector('input[name="phone"]');
      var name = nameInput && nameInput.value ? nameInput.value.trim() : '';
      var phone = phoneInput && phoneInput.value ? phoneInput.value.trim() : '';
      if (!name || !phone) return;
      var orderProduct = '';
      var orderPrice = '';
      try {
        orderProduct = sessionStorage.getItem('aviarium_order_product') || '';
        orderPrice = sessionStorage.getItem('aviarium_order_price') || '';
      } catch (err) {}
      var payload = { name: name, phone: phone };
      if (orderProduct) payload.product = orderProduct;
      if (orderPrice) payload.price = orderPrice;
      var origText = btn.textContent;
      btn.textContent = 'Отправка…';
      btn.disabled = true;
      var apiBase = (typeof window.AVIARIUM_CHAT_API !== 'undefined' ? window.AVIARIUM_CHAT_API : '').replace(/\/$/, '');
      fetch(apiBase + '/api/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (res.ok) {
          btn.textContent = 'Заявка отправлена';
          if (nameInput) nameInput.value = '';
          if (phoneInput) phoneInput.value = '';
          try {
            sessionStorage.removeItem('aviarium_order_product');
            sessionStorage.removeItem('aviarium_order_price');
          } catch (err) {}
        } else {
          btn.textContent = 'Ошибка, попробуйте позже';
        }
      }).catch(function () {
        btn.textContent = 'Ошибка, попробуйте позже';
      }).finally(function () {
        setTimeout(function () {
          btn.textContent = origText;
          btn.disabled = false;
        }, 3000);
      });
    });
  }

  var viewToggle = document.getElementById('view-toggle');
  var mobileOverlay = document.getElementById('mobile-overlay');
  var mobileClose = document.getElementById('mobile-overlay-close');
  var mobileIframe = document.getElementById('mobile-iframe');
  if (viewToggle && mobileOverlay && mobileIframe) {
    function openMobileView() {
      mobileOverlay.classList.add('is-open');
      mobileOverlay.setAttribute('aria-hidden', 'false');
      mobileIframe.src = window.location.href;
    }
    function closeMobileView() {
      mobileOverlay.classList.remove('is-open');
      mobileOverlay.setAttribute('aria-hidden', 'true');
      mobileIframe.src = 'about:blank';
    }
    viewToggle.addEventListener('click', openMobileView);
    if (mobileClose) mobileClose.addEventListener('click', closeMobileView);
    mobileOverlay.addEventListener('click', function (e) {
      if (e.target === mobileOverlay) closeMobileView();
    });
  }

  if (window.self !== window.top) {
    var toggle = document.querySelector('.view-toggle');
    if (toggle) toggle.classList.add('in-iframe-hidden');
    var chatWidget = document.getElementById('chat-widget');
    if (chatWidget) chatWidget.style.display = 'none';
  }

  /* Чат-помощник: открытие/закрытие панели и отправка сообщений */
  var chatPanel = document.getElementById('chat-panel');
  var chatToggle = document.getElementById('chat-toggle');
  var chatClose = document.getElementById('chat-panel-close');
  var chatMessages = document.getElementById('chat-messages');
  var chatInput = document.getElementById('chat-input');
  var chatSend = document.getElementById('chat-send');
  var chatApiBase = typeof window.AVIARIUM_CHAT_API !== 'undefined' ? window.AVIARIUM_CHAT_API : '';

  function chatPanelOpen() {
    if (chatPanel) {
      chatPanel.classList.add('is-open');
      chatPanel.setAttribute('aria-hidden', 'false');
      if (chatInput) chatInput.focus();
    }
  }

  function chatPanelClose() {
    if (chatPanel) {
      chatPanel.classList.remove('is-open');
      chatPanel.setAttribute('aria-hidden', 'true');
    }
  }

  if (chatToggle) chatToggle.addEventListener('click', chatPanelOpen);
  if (chatClose) chatClose.addEventListener('click', chatPanelClose);

  function addMessage(text, isUser) {
    if (!chatMessages) return;
    var div = document.createElement('div');
    div.className = 'chat-msg ' + (isUser ? 'chat-msg-user' : 'chat-msg-bot');
    var p = document.createElement('p');
    p.textContent = text;
    div.appendChild(p);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addLoading() {
    if (!chatMessages) return null;
    var div = document.createElement('div');
    div.className = 'chat-msg chat-msg-loading';
    div.setAttribute('data-loading', '1');
    var p = document.createElement('p');
    p.textContent = '…';
    div.appendChild(p);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
  }

  function removeLoading(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function sendMessage() {
    if (!chatInput || !chatSend) return;
    var text = chatInput.value.trim();
    if (!text) return;

    addMessage(text, true);
    chatInput.value = '';

    if (!chatApiBase) {
      addMessage('Чат не подключён к серверу. Пожалуйста, позвоните нам: +7 (921) 925-55-11 или напишите в Telegram.', false);
      return;
    }

    chatSend.disabled = true;
    var loadingEl = addLoading();

    fetch(chatApiBase.replace(/\/$/, '') + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        removeLoading(loadingEl);
        addMessage(data.reply || 'Не удалось получить ответ. Позвоните нам: +7 (921) 925-55-11.', false);
      })
      .catch(function () {
        removeLoading(loadingEl);
        addMessage('Соединение недоступно. Позвоните нам: +7 (921) 925-55-11 или напишите в Telegram.', false);
      })
      .finally(function () {
        chatSend.disabled = false;
        if (chatInput) chatInput.focus();
      });
  }

  if (chatSend) chatSend.addEventListener('click', sendMessage);
  if (chatInput) {
    chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  var CALC_BREEDS = {
    araukana: { name: 'Араукана', color: 'бирюза', price: 420, hue: 200, css: 'linear-gradient(135deg, #7eb8da 0%, #4a90a4 100%)' },
    uheilyuy: { name: 'Ухейилюй', color: 'олива', price: 480, hue: 120, css: 'linear-gradient(135deg, #6b8f6e 0%, #4a6b4e 100%)' },
    maran: { name: 'Маран медный', color: 'медь', price: 450, hue: 30, css: 'linear-gradient(135deg, #b8860b 0%, #6b4513 100%)' },
    'maran-dark': { name: 'Маран чёрно-медный', color: 'тёмный шоколад', price: 470, hue: 25, css: 'linear-gradient(135deg, #5c4033 0%, #3d2914 100%)' },
    olivegger: { name: 'Олив Эггер', color: 'оливка', price: 460, hue: 90, css: 'linear-gradient(135deg, #7a9b6e 0%, #5c7c50 100%)' },
    legorn: { name: 'Кремлёвская леггорн', color: 'крем', price: 380, hue: 55, css: 'linear-gradient(135deg, #e8e4df 0%, #c4b8a8 100%)' },
    orpington: { name: 'Орпингтон', color: 'персик', price: 400, hue: 40, css: 'linear-gradient(135deg, #e8d4c4 0%, #c9a882 100%)' },
    mix: { name: 'Микс', color: 'на выбор', price: 430, hue: 270, css: 'linear-gradient(135deg, #7eb8da 0%, #6b8f6e 30%, #b8860b 60%, #e8e4df 100%)' }
  };
  var PACK_EXTRA = 1200;

  var calcSubmit = document.getElementById('calc-submit');
  var calcQuantity = document.getElementById('calc-quantity');
  var calcPack = document.getElementById('calc-pack');
  var calcReset = document.getElementById('calc-reset');
  var calcResultPlaceholder = document.getElementById('calc-result-placeholder');
  var calcResultCard = document.getElementById('calc-result-card');
  var calcResultVisual = document.getElementById('calc-result-visual');
  var calcResultTitle = document.getElementById('calc-result-title');
  var calcResultDesc = document.getElementById('calc-result-desc');
  var calcResultPrice = document.getElementById('calc-result-price');
  var calcToCart = document.getElementById('calc-to-cart');
  var cartDrawer = document.getElementById('cart-drawer');
  var cartDrawerClose = document.getElementById('cart-drawer-close');
  var cartDrawerItems = document.getElementById('cart-drawer-items');
  var cartDrawerTotal = document.getElementById('cart-drawer-total');
  var cartSpiralWrap = document.getElementById('cart-spiral-wrap');
  var cartSpiral = document.getElementById('cart-spiral');
  var cartClear = document.getElementById('cart-clear');

  var currentCalcResult = null;
  var cartItems = [];

  function getSelectedBreed() {
    var radio = document.querySelector('input[name="breed"]:checked');
    if (!radio) return null;
    return CALC_BREEDS[radio.value];
  }

  function buildResult() {
    var breed = getSelectedBreed();
    if (!breed) return null;
    var qty = parseInt(calcQuantity.value, 10) || 6;
    if (qty < 1) qty = 1;
    if (qty > 100) qty = 100;
    calcQuantity.value = qty;
    var withPack = calcPack.value === 'box';
    var pricePer = breed.price;
    var total = qty * pricePer + (withPack ? PACK_EXTRA : 0);
    var breedId = document.querySelector('input[name="breed"]:checked').value;
    return {
      breed: breed,
      breedId: breedId,
      quantity: qty,
      withPack: withPack,
      total: total,
      packLabel: withPack ? 'Подарочная коробка' : 'Без упаковки'
    };
  }

  function resetForm() {
    if (calcQuantity) calcQuantity.value = 6;
    if (calcPack) calcPack.value = 'no';
    var firstBreed = document.querySelector('input[name="breed"]');
    if (firstBreed) firstBreed.checked = true;
    currentCalcResult = null;
    if (calcResultCard) calcResultCard.hidden = true;
    if (calcResultPlaceholder) calcResultPlaceholder.classList.remove('hidden');
  }

  function renderResultVisual(container, breed, qty) {
    container.innerHTML = '';
    var maxShow = Math.min(qty, 12);
    for (var i = 0; i < maxShow; i++) {
      var el = document.createElement('span');
      el.className = 'calc-result-egg';
      el.style.background = breed.css;
      container.appendChild(el);
    }
  }

  if (calcSubmit) {
    calcSubmit.addEventListener('click', function () {
      var result = buildResult();
      if (!result) return;
      currentCalcResult = result;
      calcResultPlaceholder.classList.add('hidden');
      calcResultCard.hidden = false;
      calcResultTitle.textContent = result.quantity + ' яиц · ' + result.breed.name + ' (' + result.breed.color + ')';
      calcResultDesc.textContent = result.packLabel + '. Ручная сборка, калибровка под шкатулку.';
      calcResultPrice.textContent = result.total.toLocaleString('ru-RU') + ' ₽';
      renderResultVisual(calcResultVisual, result.breed, result.quantity);
    });
  }

  if (calcReset) {
    calcReset.addEventListener('click', resetForm);
  }

  if (calcToCart) {
    calcToCart.addEventListener('click', function () {
      if (!currentCalcResult) return;
      cartItems.push({
        type: 'eggs',
        breedId: currentCalcResult.breedId,
        name: currentCalcResult.breed.name,
        quantity: currentCalcResult.quantity,
        packLabel: currentCalcResult.packLabel,
        price: currentCalcResult.total
      });
      currentCalcResult = null;
      calcResultCard.hidden = true;
      calcResultPlaceholder.classList.remove('hidden');
      updateCartUI();
      if (cartDrawer) {
        cartDrawer.setAttribute('aria-hidden', 'false');
        cartDrawer.classList.add('is-open');
      }
    });
  }

  function getEggsForSpiral() {
    var eggs = [];
    cartItems.forEach(function (item) {
      if (!item.breedId) return;
      var breed = CALC_BREEDS[item.breedId];
      if (!breed) return;
      for (var i = 0; i < item.quantity; i++) {
        eggs.push({ hue: breed.hue, css: breed.css });
      }
    });
    eggs.sort(function (a, b) { return a.hue - b.hue; });
    return eggs;
  }

  function renderSpiral() {
    if (!cartSpiral || !cartSpiralWrap) return;
    var eggs = getEggsForSpiral();
    if (eggs.length === 0) {
      cartSpiralWrap.style.display = 'none';
      return;
    }
    cartSpiralWrap.style.display = 'block';
    cartSpiral.innerHTML = '';
    var n = eggs.length;
    var turns = 2 + Math.min(n / 12, 5);
    var cx = 50;
    var cy = 50;
    var maxR = 40;
    var size = n > 60 ? 14 : n > 35 ? 16 : 20;
    for (var i = 0; i < n; i++) {
      var t = (i / Math.max(n - 1, 1)) * Math.PI * 2 * turns;
      var r = maxR * (0.15 + 0.85 * (i / Math.max(n, 1)));
      var x = cx + r * Math.cos(t);
      var y = cy + r * Math.sin(t);
      var el = document.createElement('span');
      el.className = 'cart-spiral-egg';
      el.style.background = eggs[i].css;
      el.style.left = x + '%';
      el.style.top = y + '%';
      el.style.width = size + 'px';
      el.style.height = (size * 1.3) + 'px';
      el.style.transform = 'translate(-50%, -50%)';
      cartSpiral.appendChild(el);
    }
  }

  function updateCartUI() {
    if (!cartDrawerItems || !cartDrawerTotal) return;
    var totalSum = 0;
    cartDrawerItems.innerHTML = '';
    cartItems.forEach(function (item, index) {
      totalSum += item.price;
      var div = document.createElement('div');
      div.className = 'cart-item';
      if (item.breedId) {
        var breed = CALC_BREEDS[item.breedId];
        div.innerHTML =
          '<span class="cart-item-egg" style="background:' + (breed ? breed.css : 'gray') + '"></span>' +
          '<span class="cart-item-qty">×' + item.quantity + '</span>' +
          '<span class="cart-item-info">' + item.name + ' · ' + item.packLabel + '</span>' +
          '<span class="cart-item-price">' + item.price.toLocaleString('ru-RU') + ' ₽</span>' +
          '<button type="button" class="cart-item-remove" data-index="' + index + '" aria-label="Удалить">×</button>';
      } else {
        div.innerHTML =
          '<span class="cart-item-icon cart-item-icon-box">📦</span>' +
          '<span class="cart-item-qty">×1</span>' +
          '<span class="cart-item-info">' + item.name + '</span>' +
          '<span class="cart-item-price">' + item.price.toLocaleString('ru-RU') + ' ₽</span>' +
          '<button type="button" class="cart-item-remove" data-index="' + index + '" aria-label="Удалить">×</button>';
      }
      cartDrawerItems.appendChild(div);
    });
    cartDrawerTotal.textContent = 'Итого: ' + totalSum.toLocaleString('ru-RU') + ' ₽';
    renderSpiral();
    cartDrawerItems.querySelectorAll('.cart-item-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-index'), 10);
        cartItems.splice(idx, 1);
        updateCartUI();
      });
    });
    if (cartClear) cartClear.style.display = cartItems.length ? 'block' : 'none';
    var headerCart = document.getElementById('header-cart');
    var headerCartCount = document.getElementById('header-cart-count');
    if (headerCart && headerCartCount) {
      var n = cartItems.length;
      headerCartCount.textContent = n;
      headerCart.setAttribute('data-count', n);
    }
  }

  document.addEventListener('click', function (e) {
    var addBtn = e.target && e.target.classList && e.target.classList.contains('add-to-cart-btn');
    if (!addBtn) return;
    var card = e.target.closest('.card, .pack-card, .pysanky-card');
    if (!card) return;
    var name = card.getAttribute('data-cart-name');
    var price = parseInt(card.getAttribute('data-cart-price'), 10);
    if (!name || isNaN(price)) return;
    cartItems.push({ type: 'packaging', name: name, price: price });
    updateCartUI();
    if (cartDrawer) {
      cartDrawer.setAttribute('aria-hidden', 'false');
      cartDrawer.classList.add('is-open');
    }
  });

  if (cartClear) {
    cartClear.addEventListener('click', function () {
      cartItems.length = 0;
      updateCartUI();
      if (cartSpiralWrap) cartSpiralWrap.style.display = 'none';
    });
  }

  if (cartDrawerClose && cartDrawer) {
    cartDrawerClose.addEventListener('click', function () {
      cartDrawer.setAttribute('aria-hidden', 'true');
      cartDrawer.classList.remove('is-open');
    });
  }

  document.addEventListener('click', function (e) {
    if (cartDrawer && cartDrawer.classList.contains('is-open') && e.target === cartDrawer) {
      cartDrawer.setAttribute('aria-hidden', 'true');
      cartDrawer.classList.remove('is-open');
    }
  });

  var orderModal = document.getElementById('order-modal');
  var orderModalClose = document.getElementById('order-modal-close');
  var orderModalBackdrop = document.getElementById('order-modal-backdrop');
  var orderModalSummary = document.getElementById('order-modal-summary');
  var orderForm = document.getElementById('order-form');
  var orderModalSuccess = document.getElementById('order-modal-success');
  var cartCheckoutBtn = document.getElementById('cart-checkout-btn');
  var orderUrgency = orderForm && orderForm.querySelector('select[name="urgency"]');
  var orderFieldDate = document.getElementById('order-field-date');

  function openOrderModal() {
    if (!orderModal) return;
    if (cartItems.length === 0) return;
    var html = '';
    cartItems.forEach(function (item) {
      var label = item.breedId ? item.name + ' ×' + item.quantity + ' · ' + item.packLabel : item.name;
      html += '<div class="order-summary-item"><span>' + label + '</span><span>' + item.price.toLocaleString('ru-RU') + ' ₽</span></div>';
    });
    var total = cartItems.reduce(function (sum, i) { return sum + i.price; }, 0);
    html += '<div class="order-summary-item"><strong>Итого</strong><strong>' + total.toLocaleString('ru-RU') + ' ₽</strong></div>';
    if (orderModalSummary) orderModalSummary.innerHTML = html;
    if (orderForm) orderForm.hidden = false;
    if (orderModalSuccess) orderModalSuccess.hidden = true;
    orderModal.setAttribute('aria-hidden', 'false');
    if (cartDrawer) {
      cartDrawer.setAttribute('aria-hidden', 'true');
      cartDrawer.classList.remove('is-open');
    }
  }

  function closeOrderModal() {
    if (orderModal) orderModal.setAttribute('aria-hidden', 'true');
  }

  if (cartCheckoutBtn) cartCheckoutBtn.addEventListener('click', function () {
    if (cartItems.length === 0) return;
    openOrderModal();
  });

  if (orderModalClose) orderModalClose.addEventListener('click', closeOrderModal);
  if (orderModalBackdrop) orderModalBackdrop.addEventListener('click', closeOrderModal);

  if (orderUrgency && orderFieldDate) {
    orderUrgency.addEventListener('change', function () {
      orderFieldDate.style.display = this.value === 'date' ? 'block' : 'none';
    });
  }

  if (orderForm) {
    orderForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(orderForm);
      var payload = {
        name: fd.get('name') || '',
        phone: fd.get('phone') || '',
        email: fd.get('email') || '',
        address: fd.get('address') || '',
        urgency: fd.get('urgency') || '',
        date_wish: fd.get('date_wish') || '',
        comment: fd.get('comment') || '',
        items: cartItems.map(function (i) {
          return { name: i.name + (i.quantity ? ' ×' + i.quantity : ''), price: i.price };
        }),
        total: cartItems.reduce(function (s, i) { return s + i.price; }, 0)
      };
      var submitBtn = orderForm.querySelector('.order-submit');
      var origBtnText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Отправка…'; }
      var apiBase = (typeof window.AVIARIUM_CHAT_API !== 'undefined' ? window.AVIARIUM_CHAT_API : '').replace(/\/$/, '');
      fetch(apiBase + '/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (res.ok) {
          orderForm.hidden = true;
          if (orderModalSuccess) orderModalSuccess.hidden = false;
          cartItems.length = 0;
          updateCartUI();
          if (cartSpiralWrap) cartSpiralWrap.style.display = 'none';
        } else {
          if (submitBtn) submitBtn.textContent = 'Ошибка, попробуйте снова';
        }
      }).catch(function () {
        if (submitBtn) submitBtn.textContent = 'Ошибка, попробуйте снова';
      }).finally(function () {
        if (submitBtn) {
          setTimeout(function () {
            submitBtn.disabled = false;
            submitBtn.textContent = origBtnText;
          }, 2000);
        }
      });
    });
  }

  var headerCartBtn = document.getElementById('header-cart');
  var cartDrawerEl = document.getElementById('cart-drawer');
  if (headerCartBtn && cartDrawerEl) {
    headerCartBtn.addEventListener('click', function () {
      cartDrawerEl.setAttribute('aria-hidden', 'false');
      cartDrawerEl.classList.add('is-open');
    });
  }

  var backToTop = document.getElementById('back-to-top');
  var backToBottom = document.getElementById('back-to-bottom');
  function updateScrollButtons() {
    var y = window.scrollY;
    if (backToTop) backToTop.setAttribute('aria-hidden', y > 400 ? 'false' : 'true');
    if (backToBottom) backToBottom.setAttribute('aria-hidden', y <= 400 ? 'false' : 'true');
  }
  if (backToTop) {
    window.addEventListener('scroll', updateScrollButtons, { passive: true });
    updateScrollButtons();
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  if (backToBottom) {
    if (!backToTop) {
      window.addEventListener('scroll', updateScrollButtons, { passive: true });
    }
    updateScrollButtons();
    backToBottom.addEventListener('click', function () {
      var end = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: end, behavior: 'smooth' });
    });
  }

  /* Переход из авиариума в калькулятор с подсветкой породы */
  var CALC_HIGHLIGHT_KEY = 'calcHighlightBreed';
  document.querySelectorAll('.aviary-egg-link').forEach(function (link) {
    link.addEventListener('click', function () {
      var breed = link.getAttribute('data-breed');
      if (breed) {
        try { sessionStorage.setItem(CALC_HIGHLIGHT_KEY, breed); } catch (e) {}
      }
    });
  });

  function applyCalcHighlight() {
    if (location.hash !== '#calculator') return;
    var breed;
    try { breed = sessionStorage.getItem(CALC_HIGHLIGHT_KEY); } catch (e) { return; }
    if (!breed) return;
    try { sessionStorage.removeItem(CALC_HIGHLIGHT_KEY); } catch (e) {}
    setTimeout(function () {
      var card = document.querySelector('.calc-breed-card[data-breed="' + breed + '"]');
      if (!card) return;
      var input = card.querySelector('.calc-breed-input');
      if (input) {
        input.checked = true;
      }
      card.classList.add('calc-breed-card-highlight');
      setTimeout(function () {
        card.classList.remove('calc-breed-card-highlight');
      }, 700);
    }, 150);
  }

  window.addEventListener('hashchange', applyCalcHighlight);
  if (location.hash === '#calculator') {
    applyCalcHighlight();
  }
})();
