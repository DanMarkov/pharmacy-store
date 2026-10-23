/* ============================================================
   ГЕНЕРАТОР АРТ-ОБЪЕКТОВ (упаковок) — чистый SVG, без внешних файлов.
   Каждый «товар» — маленькая глянцевая скульптура из стекла.
   ============================================================ */

(function () {
  "use strict";

  const uid = (() => { let n = 0; return () => "g" + (++n); })();

  // общие градиенты стекла/глянца для каждого hue
  function defs(hue) {
    const id = uid();
    return {
      id,
      markup: `
        <defs>
          <linearGradient id="${id}-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="hsl(${hue} 70% 88%)"/>
            <stop offset=".18" stop-color="hsl(${hue} 85% 96%)"/>
            <stop offset=".5" stop-color="hsl(${hue} 75% 82%)"/>
            <stop offset=".82" stop-color="hsl(${hue} 85% 94%)"/>
            <stop offset="1" stop-color="hsl(${hue} 70% 78%)"/>
          </linearGradient>
          <linearGradient id="${id}-liquid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="hsl(${hue} 90% 62%)"/>
            <stop offset="1" stop-color="hsl(${hue} 95% 40%)"/>
          </linearGradient>
          <linearGradient id="${id}-cap" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#ffffff"/>
            <stop offset=".45" stop-color="#d9f4fb"/>
            <stop offset=".55" stop-color="#9ed9ea"/>
            <stop offset="1" stop-color="#5cb6cf"/>
          </linearGradient>
          <radialGradient id="${id}-shine" cx=".3" cy=".22" r=".9">
            <stop offset="0" stop-color="#ffffff" stop-opacity=".95"/>
            <stop offset=".4" stop-color="#ffffff" stop-opacity=".35"/>
            <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
        </defs>`
    };
  }

  const gloss = (id, x, y, w, h, rx = 8, op = .8) =>
    `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${h}" fill="url(#${id}-shine)" opacity="${op}" transform="rotate(-18 ${x} ${y})"/>`;

  const shadow = () =>
    `<ellipse cx="100" cy="182" rx="62" ry="9" fill="#0b4a63" opacity=".18"/>`;

  const label = (w, cx = 100) =>
    `<rect x="${cx - w / 2}" y="108" width="${w}" height="34" rx="6" fill="#fffdf4" opacity=".92" stroke="#cfe9f2"/>
     <line x1="${cx - w / 2 + 8}" y1="118" x2="${cx + w / 2 - 8}" y2="118" stroke="#9cc9d8" stroke-width="2" stroke-linecap="round"/>
     <line x1="${cx - w / 2 + 8}" y1="126" x2="${cx + w / 2 - 14}" y2="126" stroke="#c4e2ec" stroke-width="2" stroke-linecap="round"/>
     <line x1="${cx - w / 2 + 8}" y1="134" x2="${cx + w / 2 - 20}" y2="134" stroke="#d8eef5" stroke-width="2" stroke-linecap="round"/>`;

  const wrap = (inner, d) =>
    `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${d.markup}${shadow()}${inner}</svg>`;

  const ARTISTS = {

    // высокий флакон с пробкой
    flacon(item) {
      const d = defs(item.hue);
      return wrap(`
        <rect x="86" y="18" width="28" height="20" rx="5" fill="url(#${d.id}-cap)" stroke="#3d9dbb" stroke-width="1.5"/>
        <path d="M78 40 Q78 34 86 34 L114 34 Q122 34 122 40 L122 60 Q138 70 138 92 L138 158 Q138 174 122 174 L78 174 Q62 174 62 158 L62 92 Q62 70 78 60 Z"
              fill="url(#${d.id}-body)" stroke="#2f8fb0" stroke-width="2"/>
        <path d="M66 100 L66 156 Q66 168 78 169 L122 169 Q134 168 134 156 L134 100 Q134 96 130 96 L70 96 Q66 96 66 100 Z"
              fill="url(#${d.id}-liquid)" opacity=".85"/>
        ${gloss(d.id, 84, 78, 12, 46, 6, .9)}
        <circle cx="112" cy="126" r="5" fill="#ffffff" opacity=".5"/>
        <circle cx="104" cy="146" r="3" fill="#ffffff" opacity=".4"/>
        ${label(56)}`, d);
    },

    // ампула
    ampoule(item) {
      const d = defs(item.hue);
      return wrap(`
        <path d="M92 22 Q92 14 100 14 Q108 14 108 22 L106 44 L94 44 Z" fill="url(#${d.id}-cap)" stroke="#3d9dbb" stroke-width="1.5"/>
        <path d="M94 44 L106 44 L112 66 Q128 84 128 108 L128 150 Q128 172 100 172 Q72 172 72 150 L72 108 Q72 84 88 66 Z"
              fill="url(#${d.id}-body)" stroke="#2f8fb0" stroke-width="2"/>
        <path d="M76 104 L76 148 Q76 166 100 167 Q124 166 124 148 L124 104 Q124 100 120 100 L80 100 Q76 100 76 104 Z"
              fill="url(#${d.id}-liquid)" opacity=".85"/>
        <path d="M94 44 L106 44 L103 54 L97 54 Z" fill="#ffffff" opacity=".8"/>
        ${gloss(d.id, 84, 92, 9, 40, 5, .9)}
        <circle cx="100" cy="60" r="3" fill="#ffffff" opacity=".85"/>
        ${label(44)}`, d);
    },

    // шприц (лежит под углом)
    syringe(item) {
      const d = defs(item.hue);
      return wrap(`
        <g transform="rotate(-24 100 100)">
          <rect x="34" y="92" width="112" height="20" rx="9" fill="url(#${d.id}-body)" stroke="#2f8fb0" stroke-width="2"/>
          <rect x="52" y="95" width="76" height="14" rx="6" fill="url(#${d.id}-liquid)" opacity=".8"/>
          <rect x="146" y="88" width="16" height="28" rx="4" fill="url(#${d.id}-cap)" stroke="#3d9dbb" stroke-width="1.5"/>
          <rect x="162" y="97" width="26" height="10" rx="4" fill="#bfe9f5" stroke="#3d9dbb" stroke-width="1.5"/>
          <rect x="188" y="94" width="4" height="16" rx="2" fill="#8fd0e2"/>
          <line x1="22" y1="102" x2="36" y2="102" stroke="#2f8fb0" stroke-width="3" stroke-linecap="round"/>
          <line x1="24" y1="96" x2="24" y2="108" stroke="#2f8fb0" stroke-width="2"/>
          <line x1="29" y1="96" x2="29" y2="108" stroke="#2f8fb0" stroke-width="2"/>
          ${gloss(d.id, 60, 96, 34, 4, 3, .85)}
          ${[62, 78, 94, 110].map(x => `<line x1="${x}" y1="93" x2="${x}" y2="111" stroke="#5aa9c2" stroke-width="1" opacity=".6"/>`).join("")}
        </g>`, d);
    },

    // тюбик мази
    tube(item) {
      const d = defs(item.hue);
      return wrap(`
        <rect x="80" y="150" width="40" height="24" rx="5" fill="url(#${d.id}-cap)" stroke="#3d9dbb" stroke-width="1.5"/>
        <path d="M84 150 L116 150 L122 52 Q122 40 112 40 L88 40 Q78 40 78 52 Z"
              fill="url(#${d.id}-body)" stroke="#2f8fb0" stroke-width="2"/>
        <path d="M86 46 L114 46" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity=".7"/>
        <rect x="84" y="96" width="32" height="34" rx="5" fill="#fffdf4" opacity=".92" stroke="#cfe9f2"/>
        <line x1="90" y1="106" x2="110" y2="106" stroke="#9cc9d8" stroke-width="2" stroke-linecap="round"/>
        <line x1="90" y1="114" x2="106" y2="114" stroke="#c4e2ec" stroke-width="2" stroke-linecap="round"/>
        ${gloss(d.id, 88, 66, 8, 52, 4, .9)}`, d);
    },

    // банка с крышкой
    jar(item) {
      const d = defs(item.hue);
      return wrap(`
        <rect x="62" y="40" width="76" height="22" rx="9" fill="url(#${d.id}-cap)" stroke="#3d9dbb" stroke-width="1.5"/>
        <path d="M66 62 L134 62 Q142 62 142 74 L142 150 Q142 172 120 172 L80 172 Q58 172 58 150 L58 74 Q58 62 66 62 Z"
              fill="url(#${d.id}-body)" stroke="#2f8fb0" stroke-width="2"/>
        <path d="M62 96 L62 148 Q62 166 82 167 L118 167 Q138 166 138 148 L138 96 Q138 92 134 92 L66 92 Q62 92 62 96 Z"
              fill="url(#${d.id}-liquid)" opacity=".8"/>
        ${gloss(d.id, 76, 84, 11, 50, 6, .9)}
        <circle cx="112" cy="120" r="4" fill="#ffffff" opacity=".5"/>
        ${label(64)}`, d);
    },

    // ингалятор
    inhaler(item) {
      const d = defs(item.hue);
      return wrap(`
        <path d="M76 70 Q76 48 100 48 Q124 48 124 70 L124 158 Q124 174 100 174 Q76 174 76 158 Z"
              fill="url(#${d.id}-body)" stroke="#2f8fb0" stroke-width="2"/>
        <rect x="88" y="30" width="24" height="20" rx="4" fill="url(#${d.id}-cap)" stroke="#3d9dbb" stroke-width="1.5"/>
        <path d="M112 36 L138 36 Q146 36 146 44 L146 52 Q146 58 138 58 L112 58 Z" fill="#d9f4fb" stroke="#3d9dbb" stroke-width="1.5"/>
        <circle cx="146" cy="47" r="4" fill="#5cb6cf"/>
        <rect x="84" y="98" width="32" height="36" rx="6" fill="#fffdf4" opacity=".92" stroke="#cfe9f2"/>
        <line x1="90" y1="109" x2="110" y2="109" stroke="#9cc9d8" stroke-width="2" stroke-linecap="round"/>
        <line x1="90" y1="117" x2="106" y2="117" stroke="#c4e2ec" stroke-width="2" stroke-linecap="round"/>
        <line x1="90" y1="125" x2="103" y2="125" stroke="#d8eef5" stroke-width="2" stroke-linecap="round"/>
        ${gloss(d.id, 86, 84, 9, 60, 5, .9)}`, d);
    },

    // капсула (две половинки)
    capsule(item) {
      const d = defs(item.hue);
      const h2 = item.hue > 200 ? item.hue - 60 : item.hue + 60;
      const id2 = uid();
      const extra = `<defs><linearGradient id="${id2}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="hsl(${h2} 80% 80%)"/>
          <stop offset=".5" stop-color="hsl(${h2} 85% 92%)"/>
          <stop offset="1" stop-color="hsl(${h2} 80% 72%)"/>
        </linearGradient></defs>`;
      const dd = defs(item.hue);
      return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${dd.markup}${extra}${shadow()}
        <g transform="rotate(-30 100 100)">
          <path d="M40 100 Q40 76 64 76 L100 76 L100 124 L64 124 Q40 124 40 100 Z" fill="url(#${dd.id}-body)" stroke="#2f8fb0" stroke-width="2"/>
          <path d="M100 76 L136 76 Q160 76 160 100 Q160 124 136 124 L100 124 Z" fill="url(#${id2})" stroke="#2f8fb0" stroke-width="2"/>
          <ellipse cx="100" cy="100" rx="4" ry="24" fill="#ffffff" opacity=".55"/>
          ${gloss(dd.id, 56, 90, 18, 6, 4, .9)}
          ${gloss(dd.id, 128, 90, 18, 6, 4, .8)}
        </g></svg>`;
    },

    // спрей с помпой
    spray(item) {
      const d = defs(item.hue);
      return wrap(`
        <rect x="90" y="22" width="20" height="18" rx="4" fill="url(#${d.id}-cap)" stroke="#3d9dbb" stroke-width="1.5"/>
        <path d="M90 32 L74 32 Q66 32 66 40 L66 48 L90 48 Z" fill="#d9f4fb" stroke="#3d9dbb" stroke-width="1.5"/>
        <rect x="86" y="40" width="28" height="14" rx="4" fill="url(#${d.id}-cap)" stroke="#3d9dbb" stroke-width="1.5"/>
        <path d="M80 54 L120 54 Q132 54 132 66 L132 152 Q132 172 100 172 Q68 172 68 152 L68 66 Q68 54 80 54 Z"
              fill="url(#${d.id}-body)" stroke="#2f8fb0" stroke-width="2"/>
        <path d="M72 92 L72 150 Q72 166 100 167 Q128 166 128 150 L128 92 Q128 88 124 88 L76 88 Q72 88 72 92 Z"
              fill="url(#${d.id}-liquid)" opacity=".8"/>
        ${gloss(d.id, 80, 80, 9, 56, 5, .9)}
        <circle cx="52" cy="30" r="3" fill="#bfe9f5" opacity=".8"/>
        <circle cx="42" cy="20" r="2.4" fill="#bfe9f5" opacity=".6"/>
        <circle cx="34" cy="12" r="1.8" fill="#bfe9f5" opacity=".45"/>
        ${label(48)}`, d);
    },

    // пластырь (крест-накрест)
    patch(item) {
      const d = defs(item.hue);
      return wrap(`
        <g transform="rotate(8 100 100)">
          <rect x="42" y="82" width="116" height="36" rx="17" fill="url(#${d.id}-body)" stroke="#c98d4e" stroke-width="1.5"/>
          <rect x="82" y="42" width="36" height="116" rx="17" fill="url(#${d.id}-body)" stroke="#c98d4e" stroke-width="1.5"/>
          <rect x="88" y="88" width="24" height="24" rx="4" fill="#fff6e8" stroke="#e3c9a0" stroke-width="1"/>
          ${[52, 64].map(x => `<circle cx="${x}" cy="100" r="2" fill="#c98d4e" opacity=".5"/>`).join("")}
          ${[136, 148].map(x => `<circle cx="${x}" cy="100" r="2" fill="#c98d4e" opacity=".5"/>`).join("")}
          ${[100].map(y => [52, 64, 136, 148].map(x => `<circle cx="${x}" cy="${y}" r="2" fill="#c98d4e" opacity=".5"/>`).join("")).join("")}
          ${gloss(d.id, 66, 92, 26, 7, 4, .85)}
        </g>`, d);
    },

    // бутылка из коричневого стекла (аптечная)
    bottle(item) {
      const d = defs(item.hue);
      const id = uid();
      const brown = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#8a5a2b"/>
          <stop offset=".2" stop-color="#c99a5b"/>
          <stop offset=".5" stop-color="#a9763c"/>
          <stop offset=".8" stop-color="#c99a5b"/>
          <stop offset="1" stop-color="#7a4e24"/>
        </linearGradient></defs>`;
      const dd = defs(item.hue);
      return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${dd.markup}${brown}${shadow()}
        <rect x="88" y="26" width="24" height="16" rx="3" fill="#e8e2d4" stroke="#9a927e" stroke-width="1.5"/>
        <path d="M90 42 L110 42 L110 58 Q128 68 128 92 L128 156 Q128 172 100 172 Q72 172 72 156 L72 92 Q72 68 90 58 Z"
              fill="url(#${id})" stroke="#5f3d1a" stroke-width="2"/>
        ${gloss(dd.id, 84, 84, 9, 52, 5, .55)}
        <rect x="76" y="104" width="48" height="40" rx="5" fill="#f7efdc" stroke="#c9b98f"/>
        <line x1="83" y1="114" x2="117" y2="114" stroke="#a5946c" stroke-width="2" stroke-linecap="round"/>
        <line x1="83" y1="122" x2="112" y2="122" stroke="#c0b18a" stroke-width="2" stroke-linecap="round"/>
        <line x1="83" y1="130" x2="107" y2="130" stroke="#d2c6a2" stroke-width="2" stroke-linecap="round"/></svg>`;
    },

    // виала (маленький флакон) — набор: рисуем три
    vial(item) {
      const d = defs(item.hue);
      const one = (cx, s) => `
        <g transform="translate(${cx} 0) scale(${s})">
          <rect x="91" y="52" width="18" height="12" rx="3" fill="url(#${d.id}-cap)" stroke="#3d9dbb" stroke-width="1.5"/>
          <path d="M93 64 L107 64 L112 78 Q118 88 118 102 L118 150 Q118 166 100 166 Q82 166 82 150 L82 102 Q82 88 88 78 Z"
                fill="url(#${d.id}-body)" stroke="#2f8fb0" stroke-width="1.5"/>
          <path d="M85 100 L85 148 Q85 162 100 162 Q115 162 115 148 L115 100 Q115 97 112 97 L88 97 Q85 97 85 100 Z"
                fill="url(#${d.id}-liquid)" opacity=".85"/>
          <ellipse cx="92" cy="94" rx="3" ry="16" fill="#ffffff" opacity=".7" transform="rotate(-14 92 94)"/>
        </g>`;
      return wrap(`
        <rect x="48" y="150" width="104" height="14" rx="7" fill="#8a5f3b" opacity=".9"/>
        <rect x="48" y="146" width="104" height="6" rx="3" fill="#a9784e"/>
        ${one(100, 1)}
        <g transform="translate(-34 14) scale(.82)" opacity=".92">${one(100, 1)}</g>
        <g transform="translate(34 14) scale(.82)" opacity=".92">${one(100, 1)}</g>`, d);
    },

    // коробка
    box(item) {
      const d = defs(item.hue);
      return wrap(`
        <path d="M52 84 L100 62 L148 84 L148 150 L100 172 L52 150 Z" fill="url(#${d.id}-body)" stroke="#2f8fb0" stroke-width="2"/>
        <path d="M52 84 L100 106 L148 84 L100 62 Z" fill="#eafaff" stroke="#2f8fb0" stroke-width="2"/>
        <path d="M100 106 L100 172" stroke="#2f8fb0" stroke-width="2"/>
        <path d="M52 84 L52 150 L100 172 L100 106 Z" fill="#ffffff" opacity=".25"/>
        <rect x="112" y="118" width="30" height="24" rx="4" fill="#fffdf4" opacity=".95" stroke="#cfe9f2" transform="skewY(24)"/>
        ${gloss(d.id, 74, 122, 16, 12, 6, .8)}`, d);
    }
  };

  window.ART = {
    // отрендерить упаковку товара в строку SVG
    render(item) {
      const fn = ARTISTS[item.art] || ARTISTS.flacon;
      return fn(item);
    }
  };
})();
