/* ============================================================
   THEMES — три эстетики «Палаты Росы»
   aqua (frutiger aero, по умолчанию) · y2k · vapor
   ============================================================ */

(function () {
  "use strict";

  const THEMES = {
    aqua: {
      id: "aqua",
      label: "Витрина · aqua",
      winTitle: "Палата Росы — витрина",
      address: "palata-rosy/витрина",
      status: "Готово. Роса свежая.",
      description: "основной зал: стекло, небо, пузырьки"
    },
    y2k: {
      id: "y2k",
      label: "Архив 2000 · y2k",
      winTitle: "Архив 2000.exe — Палата Росы",
      address: "C:\\palata-rosy\\архив_2000\\",
      status: "Соединение с 2000 годом установлено…",
      description: "тот же товар, но в chrome и неоне"
    },
    vapor: {
      id: "vapor",
      label: "Ночной сеанс · vapor",
      winTitle: "ночной сеанс — палата росы",
      address: "vapor://palata-rosy/ночной_сеанс",
      status: "Сеанс начат. Время остановлено. Вечность открыта.",
      description: "тот же товар, но в неоне и VHS"
    }
  };

  // декор для тем (элементы, которые добавляются в #app при активации)
  const DECOR = {
    y2k(app) {
      const balls = [[8, 12, 54], [88, 8, 38], [78, 78, 26], [16, 82, 20]];
      balls.forEach(([x, y, s], i) => {
        const b = document.createElement("div");
        b.className = "chrome-ball";
        b.style.cssText = `left:${x}%;top:${y}%;width:${s}px;height:${s}px;animation-delay:${i * 1.3}s`;
        app.appendChild(b);
      });
      const stars = [[30, 6, "✦"], [60, 14, "★"], [92, 40, "✦"], [24, 55, "★"], [50, 88, "✦"], [70, 30, "★"]];
      stars.forEach(([x, y, ch], i) => {
        const s = document.createElement("div");
        s.className = "y2k-star";
        s.textContent = ch;
        s.style.cssText = `left:${x}%;top:${y}%;animation-delay:${i * .4}s`;
        app.appendChild(s);
      });
    },
    vapor(app) {
      const col = document.createElement("div");
      col.className = "vapor-column";
      col.textContent = "🏛️";
      col.setAttribute("aria-hidden", "true");
      app.appendChild(col);
    },
    aqua() { /* у aqua декор — само небо вокруг окна */ }
  };

  window.THEMES = THEMES;
  window.THEME_DECOR = DECOR;
})();
