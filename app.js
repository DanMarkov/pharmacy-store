/* ============================================================
   ПАЛАТА РОСЫ — приложение: роутер, витрина, корзина, эффекты.
   Без зависимостей, работает офлайн (file:// тоже ок).
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

  /* ---------- фоновые эффекты: пузырьки и травинки ---------- */

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

  // поток пузырьков из холма
  setInterval(() => {
    if (document.hidden) return;
    spawnBubble(
      window.innerWidth * (0.08 + Math.random() * 0.84),
      window.innerHeight,
      10 + Math.random() * 34
    );
  }, 1400);

  // «взрыв» пузырьков из точки (клик / добавление в корзину)
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

  // клик по пустому месту — пузырёк + тихий звук
  document.addEventListener("pointerdown", e => {
    if (e.target.closest("a,button,input,.card,#cart-drawer,#modal,#exhibit")) return;
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

  /* ---------- тосты ---------- */

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    $("#toasts").appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 380); }, 2600);
  }

  /* ---------- корзина ---------- */

  const cart = new Map(); // id -> qty

  function cartCount() { let n = 0; cart.forEach(q => n += q); return n; }
  function cartSum() { let s = 0; cart.forEach((q, id) => s += byId(id).price * q); return s; }

  function updateCartBadge() {
    const n = cartCount();
    $("#cart-count").textContent = n;
    const btn = $("#cart-btn");
    btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump");
  }

  function addToCart(id, x, y) {
    cart.set(id, (cart.get(id) || 0) + 1);
    updateCartBadge();
    renderCart();
    const item = byId(id);
    toast(`«${item.name}» — в корзине. Ещё немного росы.`);
    if (x != null) burst(x, y, 10);
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

  function openCart() { $("#cart-drawer").classList.add("open"); $("#cart-drawer").setAttribute("aria-hidden", "false"); $("#scrim").classList.add("open"); }
  function closeCart() { $("#cart-drawer").classList.remove("open"); $("#cart-drawer").setAttribute("aria-hidden", "true"); $("#scrim").classList.remove("open"); }

  $("#cart-btn").addEventListener("click", openCart);
  $("#cart-close").addEventListener("click", closeCart);
  $("#scrim").addEventListener("click", () => { closeCart(); closeModal(); });

  $("#checkout").addEventListener("click", e => {
    if (!cart.size) { toast("Сначала выберите росу. Она ждёт на витрине."); return; }
    burst(e.clientX, e.clientY, 22);
    cart.clear(); updateCartBadge(); renderCart(); closeCart();
    toast("Роса набрана. Она растает, но вы помните вкус.");
  });

  /* ---------- модалка товара ---------- */

  function openModal(id) {
    const it = byId(id);
    $("#modal-body").innerHTML = productHTML(it, true);
    bindProduct($("#modal-body"), it);
    $("#modal").classList.add("open");
    $("#modal").setAttribute("aria-hidden", "false");
  }
  function closeModal() { $("#modal").classList.remove("open"); $("#modal").setAttribute("aria-hidden", "true"); }
  $("#modal-close").addEventListener("click", closeModal);

  /* ---------- шаблоны ---------- */

  function productHTML(it, inModal) {
    return `
      ${inModal ? "" : `<a class="back-link" href="#/">← назад к витрине</a>`}
      <div class="product">
        <div class="art-big">${window.ART.render(it)}</div>
        <div>
          <h1>${esc(it.name)}</h1>
          <div class="cat">${esc(it.cat)}</div>
          <p class="desc">${esc(it.desc)}</p>
          <p class="meta">${it.meta}</p>
          <p class="poem" style="font-style:italic;color:var(--ink-soft);margin-bottom:18px">${esc(it.poem)}</p>
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
    const add = $(".add-btn", root);
    add.addEventListener("click", e => {
      for (let i = 0; i < qty; i++) cart.set(it.id, (cart.get(it.id) || 0) + 1);
      updateCartBadge(); renderCart();
      burst(e.clientX, e.clientY, 14);
      toast(`«${it.name}» × ${qty} — в корзине.`);
      if (root.closest("#modal")) closeModal();
    });
  }

  function cardHTML(it, i) {
    return `
      <article class="card glass" style="animation-delay:${i * 60}ms" data-id="${it.id}" tabindex="0" role="button" aria-label="${esc(it.name)}">
        ${it.badge ? `<span class="badge ${it.badge === "new" ? "new" : ""}">${it.badge === "new" ? "новое" : it.badge}</span>` : ""}
        <div class="art">${window.ART.render(it)}</div>
        <h3>${esc(it.name)}</h3>
        <div class="cat">${esc(it.cat)}</div>
        <div class="price">${fmt(it.price)} <small>${cur}</small></div>
        <button class="aqua-btn add">в корзину</button>
      </article>`;
  }

  /* ---------- страницы ---------- */

  const routes = {
    home() {
      return `
        <section class="hero glass fade-in">
          <h1>ПАЛАТА РОСЫ</h1>
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
      return `<div class="glass fade-in" style="padding:clamp(10px,2vw,24px)">${productHTML(it, false)}</div>`;
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

  /* ---------- роутер ---------- */

  const app = $("#app");

  function route() {
    closeCart(); closeModal();
    const hash = location.hash || "#/";
    let html = "", nav = "shop";

    if (hash.startsWith("#/product/")) {
      html = routes.product(hash.slice("#/product/".length));
      nav = "shop";
    } else if (hash === "#/about") {
      html = routes.about(); nav = "about";
    } else if (hash === "#/exhibit") {
      Exhibit.start(); return;
    } else {
      html = routes.home();
    }

    app.innerHTML = html;

    $$("nav a").forEach(a => a.classList.toggle("active", a.dataset.nav === nav));

    // карточки: клик — модалка, кнопка — в корзину
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
      });
    });

    if (app.querySelector(".product")) bindProduct(app, byId(location.hash.slice("#/product/".length)));

    window.scrollTo({ top: 0 });
  }

  window.addEventListener("hashchange", route);

  // «смотреть витрину» — плавный скролл без смены маршрута
  app.addEventListener("click", e => {
    if (e.target.closest("#cta-shop")) {
      const v = $("#vitrina");
      if (v) v.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  /* ---------- звук ---------- */

  const soundBtn = $("#sound-btn");
  soundBtn.addEventListener("click", async () => {
    const on = await window.Ambient.toggle();
    soundBtn.textContent = on ? "🔊" : "🔇";
    toast(on ? "Туман включился. Дождь идёт локально, в вашем браузере." : "Туман выключен. Тишина тоже вариант.");
  });

  /* ---------- режим выставки (attract mode) ---------- */

  const Exhibit = {
    timer: null, idx: 0,

    start() {
      const ex = $("#exhibit");
      ex.classList.add("on");
      ex.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      $$("nav a").forEach(a => a.classList.remove("active"));
      this.show(0);
      this.timer = setInterval(() => this.show((this.idx + 1) % items.length), 6000);
      // пузырьки в тёмном зале
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
      $("#ex-meta").textContent = `${it.cat} · ${fmt(it.price)} ${cur} · палата росы`;
    },

    stop() {
      const ex = $("#exhibit");
      if (!ex.classList.contains("on")) return;
      ex.classList.remove("on");
      ex.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
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

  /* ---------- старт ---------- */

  $("#year").textContent = new Date().getFullYear();
  renderCart();
  route();
})();
