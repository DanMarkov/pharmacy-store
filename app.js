/* ============================================================
   SPM PHARMACY — интернет-аптека.
   Роутер, корзина, карточки товаров, uncanny-слой.
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
     КОРЗИНА
     ============================================================ */

  const cart = new Map();
  const cartCount = () => { let n = 0; cart.forEach(q => n += q); return n; };
  const cartSum = () => { let s = 0; cart.forEach((q, id) => s += byId(id).price * q); return s; };

  function updateCartBadge() {
    $("#cart-count").textContent = cartCount();
  }

  function renderCart() {
    const box = $("#cart-items");
    if (!cart.size) {
      box.innerHTML = `<p class="cart-empty">Пока пусто.<br>Выберите товар в каталоге — доставка ночью, оплата при получении.</p>`;
    } else {
      box.innerHTML = [...cart.entries()].map(([id, q]) => {
        const it = byId(id);
        return `<div class="cart-item" data-id="${id}">
          <div class="thumb">${window.ART.photo(it)}</div>
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
  }
  function closeCart() {
    $("#cart-drawer").classList.remove("open");
    $("#cart-drawer").setAttribute("aria-hidden", "true");
    $("#scrim").classList.remove("open");
  }

  $("#cart-btn").addEventListener("click", openCart);
  $("#cart-close").addEventListener("click", closeCart);
  $("#scrim").addEventListener("click", () => { closeCart(); closeModal(); });

  $("#checkout").addEventListener("click", () => {
    if (!cart.size) { toast("Корзина пуста. Выберите товар в каталоге."); return; }
    const total = fmt(cartSum()) + " " + cur;
    cart.clear(); updateCartBadge(); renderCart(); closeCart();
    toast(`Заказ оформлен · ${total} · доставка ночью, курьер позвонит за час.`);
  });

  function addToCart(id, qty = 1) {
    for (let i = 0; i < qty; i++) cart.set(id, (cart.get(id) || 0) + 1);
    updateCartBadge(); renderCart();
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
     ШАБЛОНЫ
     ============================================================ */

  function productHTML(it, inModal) {
    return `
      ${inModal ? "" : `<a class="back-link" href="#/">← назад в каталог</a>`}
      <div class="product fade-in">
        <div class="art-big"><div class="studio-box">${window.ART.photo(it)}</div></div>
        <div>
          <div class="brand" style="font-size:10px;font-weight:700;letter-spacing:.34em;color:var(--ink-faint);margin-bottom:8px">SPM PHARMACY</div>
          <h1>${esc(it.name)}</h1>
          <div class="cat">${esc(it.dose)} · ${esc(it.cat)}</div>
          <p class="desc">${esc(it.desc)}</p>
          <p class="meta">${it.meta}</p>
          <p class="poem">${esc(it.poem)}</p>
          <div class="price-line">${fmt(it.price)} ${cur}</div>
          <div class="buy-row">
            <div class="qty">
              <button class="ghost-btn qty-minus" aria-label="Меньше">−</button>
              <span class="qty-val">1</span>
              <button class="ghost-btn qty-plus" aria-label="Больше">+</button>
            </div>
            <button class="buy-btn add-btn" style="width:auto">в корзину</button>
          </div>
        </div>
      </div>`;
  }

  function bindProduct(root, it) {
    let qty = 1;
    const val = $(".qty-val", root);
    $(".qty-minus", root).addEventListener("click", () => { if (qty > 1) val.textContent = --qty; });
    $(".qty-plus", root).addEventListener("click", () => { if (qty < 99) val.textContent = ++qty; });
    $(".add-btn", root).addEventListener("click", () => {
      addToCart(it.id, qty);
      toast(`«${it.name}» × ${qty} добавлен в корзину. Заказ будет собран до утра.`);
      if (root.closest("#modal")) closeModal();
    });
  }

  function cardHTML(it, i) {
    return `
      <article class="card" style="animation-delay:${i * 55}ms" data-id="${it.id}" tabindex="0" role="button" aria-label="${esc(it.name)}">
        <div class="card-photo">
          ${it.badge ? `<span class="badge ${it.badge === "new" ? "new" : ""}">${it.badge === "new" ? "новое" : it.badge}</span>` : ""}
          <div class="art">${window.ART.photo(it)}</div>
        </div>
        <div class="card-info">
          <div class="brand">SPM PHARMACY</div>
          <h3>${esc(it.name)}</h3>
          <div class="dose">${esc(it.dose)} · ${esc(it.cat)}</div>
          <div class="price">${fmt(it.price)} <small>${cur}</small></div>
          <button class="buy-btn add">в корзину</button>
        </div>
      </article>`;
  }

  /* ============================================================
     СТРАНИЦЫ
     ============================================================ */

  const routes = {
    home() {
      return `
        <section class="hero fade-in">
          <img class="hero-logo" src="assets/logo.svg" alt="Логотип SPM Pharmacy" width="84" height="121">
          <h1>SPM PHARMACY</h1>
          <div class="sub">интернет-аптека · доставка ночью · работаем с 2007 года</div>
          <p class="poem">«Роса свежая. Доставка — ночью, пока город пуст.<br>
          Принимаем заказы с 2007 года. Чек прилагается.»</p>
          <div class="cta-row">
            <button class="buy-btn" id="cta-shop" style="width:auto">смотреть каталог</button>
            <a class="ghost-btn" href="#/about" style="text-decoration:none;display:inline-flex;align-items:center">о магазине</a>
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
        <section class="manifest fade-in">
          <h1>${esc(m.title)}</h1>
          ${m.paragraphs.map(p => `<p>${esc(p)}</p>`).join("")}
          <p class="sig">— ${esc(m.signature)}</p>
        </section>`;
    },

    delivery() {
      return `
        <section class="manifest fade-in">
          <h1>Доставка</h1>
          <p>Доставка по городу — ночью, пока улицы пусты. Курьер позвонит за час до приезда.</p>
          <p>Оплата при получении. Чек прилагается. Сдачи не будет — курьер не берёт наличные после полуночи.</p>
          <p>Если заказ «завис» в оформлении — не закрывайте страницу. Он уже в пути. Он всегда в пути.</p>
          <p class="sig">— служба доставки spm · ночная смена</p>
        </section>`;
    },

    notFound() {
      return `<section class="manifest fade-in"><h1>404</h1><p>Такого товара нет на складе. Возможно, он закончился. Возможно — появится ночью.</p></section>`;
    }
  };

  /* ============================================================
     РОУТЕР
     ============================================================ */

  const app = $("#app");

  function route() {
    closeCart(); closeModal();
    const hash = location.hash || "#/";

    let html;
    if (hash.startsWith("#/product/")) {
      html = routes.product(hash.slice("#/product/".length));
    } else if (hash === "#/about") {
      html = routes.about();
    } else if (hash === "#/delivery") {
      html = routes.delivery();
    } else {
      html = routes.home();
    }

    app.innerHTML = html;

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
        addToCart(id);
        toast(`«${byId(id).name}» добавлен в корзину. Заказ будет собран до утра.`);
      });
    });

    if (app.querySelector(".product")) bindProduct(app, byId(location.hash.slice("#/product/".length)));

    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", route);

  app.addEventListener("click", e => {
    if (e.target.closest("#cta-shop")) {
      const v = $("#vitrina");
      if (v) v.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  // «Доставка» в шапке — тоже страница
  $("#nav-delivery").addEventListener("click", e => {
    e.preventDefault();
    location.hash = "#/delivery";
  });

  /* ============================================================
     ЧАСЫ — тикают, стартуют с 4:17
     ============================================================ */

  let clockMin = 4 * 60 + 17;
  function tickClock() {
    clockMin = (clockMin + 1) % 1440;
    const h = String(Math.floor(clockMin / 60)).padStart(2, "0");
    const m = String(clockMin % 60).padStart(2, "0");
    $("#clock").textContent = `${h}:${m}`;
  }
  setInterval(tickClock, 60000);

  /* ============================================================
     UNCANNY — сайт выглядит почти нормально, но иногда
     чуть-чуть «не так». Ничего не ломается, всё возвращается.
     ============================================================ */

  const reduceMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  if (!reduceMotion) {
    const clockEl = $("#clock");
    const brandEl = $(".brand-name");
    const navLinks = $$("#nav a");
    const brandSaved = brandEl.textContent;
    const clockSaved = () => clockEl.textContent;

    // иногда часы в шапке на минуту показывают другое время
    setInterval(() => {
      if (document.hidden || Math.random() > .3) return;
      const t = clockSaved();
      clockEl.textContent = "4:18";
      setTimeout(() => { clockEl.textContent = t; }, 1200 + Math.random() * 900);
    }, 150000);

    // иногда название магазина на долю секунды «мигает» по-другому
    setInterval(() => {
      if (document.hidden || Math.random() > .35) return;
      const variants = ["SPM PHARMACY", "SPM PHARMACY", "SPM PHARMACY", "SPM PHARMACУ"];
      brandEl.textContent = variants[Math.floor(Math.random() * variants.length)];
      setTimeout(() => { brandEl.textContent = brandSaved; }, 90 + Math.random() * 160);
    }, 97000);

    // раз в ~40–90 с случайная карточка на миг тускнеет
    function scheduleCardFlicker() {
      setTimeout(() => {
        if (document.hidden) { scheduleCardFlicker(); return; }
        const cards = $$("#app .card");
        const card = cards[Math.floor(Math.random() * cards.length)];
        if (card && Math.random() < .6) {
          card.style.opacity = ".5";
          setTimeout(() => { card.style.opacity = ""; }, 110 + Math.random() * 200);
        }
        // иногда на карточке на миг появляется «чужая» цена
        if (card && Math.random() < .25) {
          const price = $(".price", card);
          if (price) {
            const saved = price.innerHTML;
            const it = byId(card.dataset.id);
            if (it) price.innerHTML = `${fmt(it.price + 1)} <small>${cur}</small>`;
            setTimeout(() => { price.innerHTML = saved; }, 140 + Math.random() * 180);
          }
        }
        scheduleCardFlicker();
      }, 40000 + Math.random() * 50000);
    }
    scheduleCardFlicker();

    // иногда один пункт меню на секунду «называется иначе»
    setInterval(() => {
      if (document.hidden || Math.random() > .3 || !navLinks.length) return;
      const link = navLinks[Math.floor(Math.random() * navLinks.length)];
      const saved = link.textContent;
      const weird = ["Каталог", "О магазине", "Доставка", "Кaталог", "О магаз1не", "Д0ставка"];
      link.textContent = weird[Math.floor(Math.random() * weird.length)];
      setTimeout(() => { link.textContent = saved; }, 100 + Math.random() * 200);
    }, 130000);

    // иногда тост «запинается» — появляется пустой и сразу исчезает
    setInterval(() => {
      if (document.hidden || Math.random() > .4) return;
      const t = document.createElement("div");
      t.className = "toast";
      t.textContent = "…";
      $("#toasts").appendChild(t);
      setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 380); }, 700 + Math.random() * 900);
    }, 110000);

    // иногда страница на миг прокручивается сама на пиксель и назад
    setInterval(() => {
      if (document.hidden || Math.random() > .3) return;
      const y = window.scrollY;
      window.scrollTo(0, y + 1);
      setTimeout(() => window.scrollTo(0, y), 60);
    }, 170000);
  }

  /* ============================================================
     СТАРТ
     ============================================================ */

  $("#year").textContent = new Date().getFullYear();
  renderCart();
  route();
})();
