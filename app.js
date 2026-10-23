/* ============================================================
   SPM PHARMACY — приложение: XP-оболочка, три темы, роутер, корзина.
   Тема (aqua/y2k/vapor) — это «программа» внутри окна Windows XP,
   рабочий стол всегда в стиле frutiger aero.
   ============================================================ */

(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = n => n.toLocaleString("ru-RU");

  const items = window.SHOP.items;
  const byId = id => items.find(i => i.id === id);
  const cur = window.SHOP.currencyShort;
  const THEMES = window.THEMES;

  /* ============================================================
     ТЕМА
     ============================================================ */

  let theme = localStorage.getItem("palata-theme") || "aqua";
  if (!THEMES[theme]) theme = "aqua";

  function setTheme(id, opts = {}) {
    if (!THEMES[id]) return;
    theme = id;
    localStorage.setItem("palata-theme", id);
    document.body.className = "theme-" + id;
    const t = THEMES[id];
    $("#xp-title").textContent = t.winTitle;
    $("#xp-address").textContent = t.address;
    $("#xp-status").textContent = t.status;
    $$(".xp-tab").forEach(b => {
      const on = b.dataset.theme === id;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on);
    });
    if (!opts.silent) {
      burst(window.innerWidth / 2, window.innerHeight / 2, 8);
      toast(`Тема «${t.label}» — ${t.description}.`);
    }
    route(); // перерендерить текущую страницу в новой теме
  }

  $$(".xp-tab").forEach(b => b.addEventListener("click", () => setTheme(b.dataset.theme)));
  $$(".dicon").forEach(b => b.addEventListener("dblclick", () => setTheme(b.dataset.open)));
  $$(".dicon").forEach(b => b.addEventListener("click", () => {
    $$(".dicon").forEach(x => x.classList.remove("sel"));
    b.classList.add("sel");
  }));
  $$("#xp-startmenu [data-open]").forEach(b => b.addEventListener("click", () => {
    hideStartMenu();
    if (b.dataset.open === "about") { location.hash = "#/about"; return; }
    if (b.dataset.open === "exhibit") { location.hash = "#/exhibit"; return; }
    setTheme(b.dataset.open);
  }));

  /* ============================================================
     XP-ОБОЛОЧКА: окно, панель задач, меню, часы
     ============================================================ */

  // часы в трее тикают, стартуют с 4:17 (канон «Палаты Росы")
  let clockMin = 4 * 60 + 17;
  function tickClock() {
    clockMin = (clockMin + 1) % 1440;
    const h = String(Math.floor(clockMin / 60)).padStart(2, "0");
    const m = String(clockMin % 60).padStart(2, "0");
    $("#xp-clock").textContent = `${h}:${m}`;
  }
  setInterval(tickClock, 60000);

  // кнопки окна
  $("#xp-min").addEventListener("click", () => {
    $("#xp-window").classList.add("minimized");
    $("#task-main").classList.remove("active");
  });
  $("#xp-max").addEventListener("click", () => {
    const w = $("#xp-window");
    w.classList.toggle("maximized");
    // «развернуть» = окно во весь экран без полей
    if (w.classList.contains("maximized")) {
      w.style.cssText = "top:0;left:0;transform:none;width:100vw;height:calc(100vh - 44px);border-radius:0";
    } else {
      w.style.cssText = "";
    }
  });
  $("#xp-close").addEventListener("click", () => {
    $("#xp-window").classList.add("minimized");
    $("#task-main").classList.remove("active");
    toast("Окно закрыто. Но SPM Pharmacy не закрывается никогда — она ждёт на рабочем столе.");
  });
  $("#task-main").addEventListener("click", () => {
    const w = $("#xp-window");
    if (w.classList.contains("minimized")) {
      w.classList.remove("minimized");
      $("#task-main").classList.add("active");
    } else {
      w.classList.add("minimized");
      $("#task-main").classList.remove("active");
    }
  });
  $("#task-cart").addEventListener("click", openCart);

  // меню «пуск»
  const startMenu = $("#xp-startmenu");
  function hideStartMenu() { startMenu.hidden = true; }
  $("#xp-start").addEventListener("click", e => {
    e.stopPropagation();
    startMenu.hidden = !startMenu.hidden;
  });
  document.addEventListener("click", e => {
    if (!startMenu.hidden && !e.target.closest("#xp-startmenu") && !e.target.closest("#xp-start")) hideStartMenu();
  });
  $("#start-shutdown").addEventListener("click", () => {
    hideStartMenu();
    burst(window.innerWidth / 2, window.innerHeight / 2, 20);
    toast("Дождь выключен. До следующего сна.");
  });

  // строка меню (Файл / Вид / Справка)
  const MENUS = {
    file: [
      { label: "Новая корзина", fn: () => { cart.clear(); updateCartBadge(); renderCart(); toast("Корзина очищена росой."); } },
      { label: "Открыть товар по названию…", fn: () => { const n = prompt("Введите название товара:"); if (!n) return; const f = items.find(i => i.name.toLowerCase().includes(n.toLowerCase())); if (f) location.hash = "#/product/" + f.id; else toast("Такой росы не нашлось."); } },
      null,
      { label: "Выход", fn: () => $("#xp-close").click() }
    ],
    view: [
      { label: "Тема: aqua (frutiger aero)", fn: () => setTheme("aqua") },
      { label: "Тема: y2k (архив 2000)", fn: () => setTheme("y2k") },
      { label: "Тема: vapor (ночной сеанс)", fn: () => setTheme("vapor") },
      null,
      { label: "Режим выставки", fn: () => { location.hash = "#/exhibit"; } }
    ],
    help: [
      { label: "Манифест", fn: () => { location.hash = "#/about"; } },
      { label: "О программе", fn: () => toast("«SPM Pharmacy» · версия роса-1.0 · арт-объект, не интернет-магазин.") }
    ]
  };
  const menuPop = $("#xp-menu-pop");
  $$("#xp-menubar > button").forEach(btn => btn.addEventListener("click", e => {
    e.stopPropagation();
    const key = btn.dataset.menu;
    if (menuPop.hidden || menuPop.dataset.for === key) {
      if (!menuPop.hidden && menuPop.dataset.for === key) { menuPop.hidden = true; btn.classList.remove("open"); return; }
      menuPop.dataset.for = key;
      menuPop.innerHTML = MENUS[key].map((m, i) =>
        m === null ? "<hr>" : `<button data-mi="${i}">${esc(m.label)}</button>`
      ).join("");
      menuPop.hidden = false;
      btn.classList.add("open");
      $$("button", menuPop).forEach(b => b.addEventListener("click", () => {
        menuPop.hidden = true; btn.classList.remove("open");
        MENUS[key][+b.dataset.mi].fn();
      }));
    }
  }));
  document.addEventListener("click", e => {
    if (!(e.target instanceof Element) || !e.target.closest("#xp-menubar")) {
      menuPop.hidden = true;
      $$("#xp-menubar > button").forEach(b => b.classList.remove("open"));
    }
  });

  /* ============================================================
     ФОНОВЫЕ ЭФФЕКТЫ: пузырьки и травинки (рабочий стол)
     ============================================================ */

  const bubbleLayer = $("#bubbles");
  function spawnBubble(x, y, size) {
    const b = document.createElement("div");
    b.className = "bubble";
    b.style.width = b.style.height = size + "px";
    b.style.left = x + "px";
    b.style.setProperty("--sway", (Math.random() * 120 - 60) + "px");
    b.style.animationDuration = (7 + Math.random() * 8) + "s";
    bubbleLayer.appendChild(b);
    b.addEventListener("animationend", () => b.remove());
  }

  setInterval(() => {
    if (document.hidden) return;
    spawnBubble(
      window.innerWidth * (0.08 + Math.random() * 0.84),
      window.innerHeight,
      10 + Math.random() * 34
    );
  }, 1400);

  function burst(x, y, n = 12) {
    for (let i = 0; i < n; i++) {
      const b = document.createElement("div");
      b.className = "bubble";
      const size = 8 + Math.random() * 26;
      b.style.width = b.style.height = size + "px";
      b.style.left = x + "px";
      b.style.top = y + "px";
      const ang = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 130;
      const keyframes = [
        { transform: "translate(-50%,-50%) scale(.5)", opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist - 60}px)) scale(1.1)`, opacity: 0 }
      ];
      const opts = { duration: 900 + Math.random() * 700, easing: "cubic-bezier(.22,.9,.36,1)" };
      bubbleLayer.appendChild(b);
      if (typeof b.animate === "function") {
        b.animate(keyframes, opts).onfinish = () => b.remove();
      } else {
        setTimeout(() => b.remove(), opts.duration);
      }
    }
  }

  // клик по рабочему столу — пузырёк
  $("#desktop").addEventListener("pointerdown", e => {
    burst(e.clientX, e.clientY, 5);
    window.Ambient.pop(e.clientX, e.clientY);
  });

  // травинки на холме
  const grass = $("#grass");
  for (let i = 0; i < 90; i++) {
    const b = document.createElement("div");
    b.className = "blade";
    b.style.left = Math.random() * 100 + "%";
    b.style.height = 14 + Math.random() * 34 + "px";
    b.style.animationDelay = (Math.random() * 4) + "s";
    b.style.opacity = .5 + Math.random() * .5;
    grass.appendChild(b);
  }

  /* ============================================================
     ТОСТЫ
     ============================================================ */

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    $("#toasts").appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 380); }, 2600);
  }

  /* ============================================================
     КОРЗИНА (общая для всех тем)
     ============================================================ */

  const cart = new Map();
  const cartCount = () => { let n = 0; cart.forEach(q => n += q); return n; };
  const cartSum = () => { let s = 0; cart.forEach((q, id) => s += byId(id).price * q); return s; };

  function updateCartBadge() {
    $("#cart-count").textContent = cartCount();
    const btn = $("#task-cart");
    btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump");
  }

  function renderCart() {
    const box = $("#cart-items");
    if (!cart.size) {
      box.innerHTML = `<p class="cart-empty">Пока пусто.<br>Роса собирается сама — выберите что-нибудь на витрине.</p>`;
    } else {
      box.innerHTML = [...cart.entries()].map(([id, q]) => {
        const it = byId(id);
        return `<div class="cart-item" data-id="${id}">
          <div class="thumb">${window.ART.render(it)}</div>
          <div>
            <div class="ci-name">${esc(it.name)}</div>
            <div class="ci-price">${q} × ${fmt(it.price)} ${cur}</div>
          </div>
          <button class="ci-remove" aria-label="Убрать">✕</button>
        </div>`;
      }).join("");
      $$(".ci-remove", box).forEach(b => b.addEventListener("click", () => {
        cart.delete(b.closest(".cart-item").dataset.id);
        updateCartBadge(); renderCart();
      }));
    }
    $("#cart-total").textContent = fmt(cartSum()) + " " + cur;
  }

  function openCart() {
    $("#cart-drawer").classList.add("open");
    $("#cart-drawer").setAttribute("aria-hidden", "false");
    $("#scrim").classList.add("open");
    $("#task-cart").classList.add("active");
  }
  function closeCart() {
    $("#cart-drawer").classList.remove("open");
    $("#cart-drawer").setAttribute("aria-hidden", "true");
    $("#scrim").classList.remove("open");
    $("#task-cart").classList.remove("active");
  }

  $("#cart-close").addEventListener("click", closeCart);
  $("#scrim").addEventListener("click", () => { closeCart(); closeModal(); });

  $("#checkout").addEventListener("click", e => {
    if (!cart.size) { toast("Сначала выберите росу. Она ждёт на витрине."); return; }
    burst(e.clientX, e.clientY, 22);
    cart.clear(); updateCartBadge(); renderCart(); closeCart();
    toast("Роса набрана. Она растает, но вы помните вкус.");
  });

  function addToCart(id, x, y, qty = 1) {
    for (let i = 0; i < qty; i++) cart.set(id, (cart.get(id) || 0) + 1);
    updateCartBadge(); renderCart();
    if (x != null) burst(x, y, 10);
  }

  /* ============================================================
     МОДАЛКА ТОВАРА
     ============================================================ */

  function openModal(id) {
    const it = byId(id);
    $("#modal-body").innerHTML = productHTML(it, true);
    bindProduct($("#modal-body"), it);
    $("#modal").classList.add("open");
    $("#modal").setAttribute("aria-hidden", "false");
  }
  function closeModal() {
    $("#modal").classList.remove("open");
    $("#modal").setAttribute("aria-hidden", "true");
  }
  $("#modal-close").addEventListener("click", closeModal);

  /* ============================================================
     ШАБЛОНЫ (общие; стили карточек задаёт тема через CSS)
     ============================================================ */

  function productHTML(it, inModal) {
    return `
      ${inModal ? "" : `<a class="back-link" href="#/">← назад к витрине</a>`}
      <div class="product fade-in">
        <div class="art-big">${window.ART.render(it)}</div>
        <div>
          <h1>${esc(it.name)}</h1>
          <div class="cat">${esc(it.cat)}</div>
          <p class="desc">${esc(it.desc)}</p>
          <p class="meta">${it.meta}</p>
          <p class="poem">${esc(it.poem)}</p>
          <div class="price-line">${fmt(it.price)} ${cur}</div>
          <div class="buy-row">
            <div class="qty">
              <button class="aqua-btn ghost qty-minus" aria-label="Меньше">−</button>
              <span class="qty-val">1</span>
              <button class="aqua-btn ghost qty-plus" aria-label="Больше">+</button>
            </div>
            <button class="aqua-btn big add-btn" style="width:auto">положить в корзину</button>
          </div>
        </div>
      </div>`;
  }

  function bindProduct(root, it) {
    let qty = 1;
    const val = $(".qty-val", root);
    $(".qty-minus", root).addEventListener("click", () => { if (qty > 1) val.textContent = --qty; });
    $(".qty-plus", root).addEventListener("click", () => { if (qty < 99) val.textContent = ++qty; });
    $(".add-btn", root).addEventListener("click", e => {
      addToCart(it.id, e.clientX, e.clientY, qty);
      toast(`«${it.name}» × ${qty} — в корзине.`);
      if (root.closest("#modal")) closeModal();
    });
  }

  function cardHTML(it, i) {
    return `
      <article class="card" style="animation-delay:${i * 55}ms" data-id="${it.id}" data-name="${esc(it.name)}" tabindex="0" role="button" aria-label="${esc(it.name)}">
        ${it.badge ? `<span class="badge ${it.badge === "new" ? "new" : ""}">${it.badge === "new" ? "новое" : it.badge}</span>` : ""}
        <div class="art">${window.ART.render(it)}</div>
        <h3>${esc(it.name)}</h3>
        <div class="cat">${esc(it.cat)}</div>
        <div class="price">${fmt(it.price)} <small>${cur}</small></div>
        <button class="aqua-btn add">в корзину</button>
      </article>`;
  }

  /* ============================================================
     СТРАНИЦЫ
     ============================================================ */

  const routes = {
    home() {
      return `
        <section class="hero glass fade-in">
          <img class="hero-logo" src="assets/logo.svg" alt="Логотип SPM Pharmacy" width="120" height="173">
          <h1>SPM PHARMACY</h1>
          <div class="sub">аптека для тех, кто спит · витрина состояний</div>
          <p class="poem">«Мы не продаём лекарства. Мы отпускаем то, чего нет в инструкциях:<br>
          полчаса тишины, утро из чужого сна, дождь по требованию.»</p>
          <div class="cta-row">
            <button class="aqua-btn big" id="cta-shop" style="width:auto">смотреть витрину</button>
            <a class="aqua-btn ghost" href="#/about" style="text-decoration:none;display:inline-flex;align-items:center">читать манифест</a>
          </div>
        </section>
        <div class="grid" id="vitrina">
          ${items.map(cardHTML).join("")}
        </div>`;
    },

    product(id) {
      const it = byId(id);
      if (!it) return routes.notFound();
      return `<div class="fade-in">${productHTML(it, false)}</div>`;
    },

    about() {
      const m = window.SHOP.manifesto;
      return `
        <section class="manifest glass fade-in">
          <h1>${esc(m.title)}</h1>
          ${m.paragraphs.map(p => `<p>${esc(p)}</p>`).join("")}
          <p class="sig">— ${esc(m.signature)}</p>
        </section>`;
    },

    notFound() {
      return `<section class="manifest glass fade-in"><h1>404</h1><p>Такой росы не существует. Она вся на витрине.</p></section>`;
    }
  };

  /* ============================================================
     РОУТЕР
     ============================================================ */

  const app = $("#app");

  function route() {
    closeCart(); closeModal();
    const hash = location.hash || "#/";

    if (hash === "#/exhibit") { Exhibit.start(); return; }

    let html;
    if (hash.startsWith("#/product/")) {
      html = routes.product(hash.slice("#/product/".length));
    } else if (hash === "#/about") {
      html = routes.about();
    } else {
      html = routes.home();
    }

    app.innerHTML = html;
    // декор темы
    $$(".chrome-ball, .y2k-star, .vapor-column", app).forEach(n => n.remove());
    window.THEME_DECOR[theme](app);

    // карточки
    $$(".card", app).forEach(card => {
      const id = card.dataset.id;
      card.addEventListener("click", e => {
        if (e.target.closest(".add")) return;
        openModal(id);
      });
      card.addEventListener("keydown", e => { if (e.key === "Enter") openModal(id); });
      $(".add", card).addEventListener("click", e => {
        e.stopPropagation();
        addToCart(id, e.clientX, e.clientY);
        toast(`«${byId(id).name}» — в корзине. Ещё немного росы.`);
      });
    });

    if (app.querySelector(".product")) bindProduct(app, byId(location.hash.slice("#/product/".length)));

    app.scrollTop = 0;
  }

  window.addEventListener("hashchange", route);

  app.addEventListener("click", e => {
    if (e.target.closest("#cta-shop")) {
      const v = $("#vitrina");
      if (v) v.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  /* ============================================================
     ЗВУК
     ============================================================ */

  const soundBtn = $("#sound-btn");
  soundBtn.addEventListener("click", async () => {
    const on = await window.Ambient.toggle();
    soundBtn.textContent = on ? "🔊" : "🔇";
    toast(on ? "Туман включился. Дождь идёт локально, в вашем браузере." : "Туман выключен. Тишина тоже вариант.");
  });

  /* ============================================================
     РЕЖИМ ВЫСТАВКИ (attract mode)
     ============================================================ */

  const Exhibit = {
    timer: null, bubbleTimer: null, idx: 0,

    start() {
      const ex = $("#exhibit");
      ex.classList.add("on");
      ex.setAttribute("aria-hidden", "false");
      this.show(0);
      this.timer = setInterval(() => this.show((this.idx + 1) % items.length), 6000);
      this.bubbleTimer = setInterval(() => {
        if (!document.hidden) spawnBubble(
          window.innerWidth * Math.random(),
          window.innerHeight + 40,
          12 + Math.random() * 30
        );
      }, 700);
    },

    show(i) {
      this.idx = i;
      const it = items[i];
      $("#exhibit-stage").innerHTML = window.ART.render(it);
      $("#ex-title").textContent = it.name;
      $("#ex-poem").textContent = it.poem;
      $("#ex-meta").textContent = `${it.cat} · ${fmt(it.price)} ${cur} · spm pharmacy`;
    },

    stop() {
      const ex = $("#exhibit");
      if (!ex.classList.contains("on")) return;
      ex.classList.remove("on");
      ex.setAttribute("aria-hidden", "true");
      clearInterval(this.timer);
      clearInterval(this.bubbleTimer);
      if (!location.hash || location.hash === "#/exhibit") location.hash = "#/";
      else route();
    }
  };

  $("#exhibit").addEventListener("click", () => Exhibit.stop());
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { Exhibit.stop(); closeCart(); closeModal(); }
  });

  /* ============================================================
     СТАРТ
     ============================================================ */

  $("#year").textContent = new Date().getFullYear();
  renderCart();
  setTheme(theme, { silent: true });
  route();
})();
