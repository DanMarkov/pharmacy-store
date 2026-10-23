/* ============================================================
   SPM PHARMACY — генератор «фотореалистичных» студийных рендеров.
   Чистый SVG: многослойное стекло (specular/diffuse lighting),
   контактная тень + отражение на глянцевой поверхности,
   этикетка с текстом и штрихкодом. Без внешних файлов.
   ============================================================ */

(function () {
  "use strict";

  const uid = (() => { let n = 0; return () => "p" + (++n); })();

  /* ---------- общая «студия»: фильтры и градиенты ---------- */

  function defs(hue) {
    const id = uid();
    // палитра стекла по hue
    const h = hue, s = 70;
    const glassLight = `hsl(${h} ${s}% 96%)`;
    const glassMid   = `hsl(${h} ${s}% 84%)`;
    const glassDeep  = `hsl(${h} ${s + 5}% 62%)`;
    const glassDark  = `hsl(${h} ${s + 8}% 44%)`;
    const liquidA    = `hsl(${h} 90% 58%)`;
    const liquidB    = `hsl(${h} 95% 34%)`;
    return {
      id,
      markup: `
      <defs>
        <!-- студийный свет: мягкая тень -->
        <filter id="${id}-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5"/>
        </filter>
        <filter id="${id}-soft2" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.2"/>
        </filter>
        <filter id="${id}-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <!-- объём стекла: diffuse + specular как в 3D-рендере -->
        <filter id="${id}-glass" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
          <feSpecularLighting in="blur" surfaceScale="4" specularConstant=".9" specularExponent="18" lighting-color="#ffffff" result="spec">
            <feDistantLight azimuth="235" elevation="55"/>
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specOut"/>
          <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="lit"/>
          <feComposite in="lit" in2="SourceAlpha" operator="in"/>
        </filter>
        <!-- тень под объектом -->
        <radialGradient id="${id}-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="#0a2a3a" stop-opacity=".5"/>
          <stop offset=".55" stop-color="#0a2a3a" stop-opacity=".22"/>
          <stop offset="1" stop-color="#0a2a3a" stop-opacity="0"/>
        </radialGradient>
        <!-- стеклянное тело: студийный свет слева, тень справа, отражение снизу -->
        <linearGradient id="${id}-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="${glassDark}"/>
          <stop offset=".07" stop-color="${glassDeep}"/>
          <stop offset=".2" stop-color="${glassLight}"/>
          <stop offset=".34" stop-color="#ffffff"/>
          <stop offset=".46" stop-color="${glassMid}"/>
          <stop offset=".72" stop-color="${glassDeep}"/>
          <stop offset=".88" stop-color="${glassMid}"/>
          <stop offset="1" stop-color="${glassDark}"/>
        </linearGradient>
        <linearGradient id="${id}-bodySoft" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="${glassDeep}" stop-opacity=".55"/>
          <stop offset=".22" stop-color="${glassLight}" stop-opacity=".9"/>
          <stop offset=".5" stop-color="${glassMid}" stop-opacity=".75"/>
          <stop offset=".8" stop-color="${glassDeep}" stop-opacity=".6"/>
          <stop offset="1" stop-color="${glassDark}" stop-opacity=".5"/>
        </linearGradient>
        <!-- жидкость с мениском -->
        <linearGradient id="${id}-liquid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${liquidA}"/>
          <stop offset=".7" stop-color="${liquidB}"/>
          <stop offset="1" stop-color="hsl(${h} 95% 26%)"/>
        </linearGradient>
        <!-- крышка: пластик/металл с рёбрами -->
        <linearGradient id="${id}-cap" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#7d8a94"/>
          <stop offset=".18" stop-color="#e8edf1"/>
          <stop offset=".4" stop-color="#f8fafc"/>
          <stop offset=".62" stop-color="#aab4bd"/>
          <stop offset=".85" stop-color="#6d7883"/>
          <stop offset="1" stop-color="#525c66"/>
        </linearGradient>
        <linearGradient id="${id}-capDark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#3c464f"/>
          <stop offset=".25" stop-color="#8d99a3"/>
          <stop offset=".5" stop-color="#c3ccd3"/>
          <stop offset=".78" stop-color="#5c6770"/>
          <stop offset="1" stop-color="#333c44"/>
        </linearGradient>
        <!-- блик (specular highlight) -->
        <radialGradient id="${id}-spec" cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="#ffffff" stop-opacity=".95"/>
          <stop offset=".4" stop-color="#ffffff" stop-opacity=".45"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
        <!-- поверхность: отражение под объектом -->
        <linearGradient id="${id}-reflect" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff" stop-opacity=".5"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
        <!-- этикетка -->
        <linearGradient id="${id}-label" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff"/>
          <stop offset=".85" stop-color="#f2f5f7"/>
          <stop offset="1" stop-color="#dfe5ea"/>
        </linearGradient>
      </defs>`
    };
  }

  /* контактная тень + отражение на глянцевой поверхности */
  const ground = (id, cx = 100, cy = 184, rx = 64) => `
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="8" fill="url(#${id}-shadow)"/>
    <ellipse cx="${cx}" cy="${cy - 1.5}" rx="${rx * .55}" ry="3.4" fill="#0a2a3a" opacity=".28" filter="url(#${id}-soft2)"/>`;

  /* вертикальный блик на стекле (ключ к фотореализму) */
  const specBar = (id, x, y, w, h, op = .85) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" fill="url(#${id}-spec)" opacity="${op}" filter="url(#${id}-soft2)" transform="rotate(-6 ${x + w / 2} ${y + h / 2})"/>`;

  const specDot = (id, cx, cy, r, op = .9) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * .62}" fill="url(#${id}-spec)" opacity="${op}" transform="rotate(-24 ${cx} ${cy})"/>`;

  /* этикетка с реальным текстом + штрихкод */
  function label(id, { x, y, w, h, title, dose, lines = 2 }) {
    const cx = x + w / 2;
    const barcode = Array.from({ length: 22 }, (_, i) => {
      const bw = [1, 1, 2, 1, 3, 1, 1, 2, 1, 1][i % 10];
      return `<rect x="${x + 6 + i * 2.1}" y="${y + h - 16}" width="${bw * .8}" height="10" fill="#2a3540"/>`;
    }).join("");
    const textLines = Array.from({ length: lines }, (_, i) =>
      `<line x1="${x + 6}" y1="${y + 16 + i * 5}" x2="${x + w - 8 - (i === lines - 1 ? 14 : 0)}" y2="${y + 16 + i * 5}" stroke="#9fb0ba" stroke-width="1.1" stroke-linecap="round"/>`
    ).join("");
    return `
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" fill="url(#${id}-label)" stroke="#c3ccd3" stroke-width=".8"/>
      <rect x="${x}" y="${y}" width="${w}" height="3" rx="1.5" fill="#ffffff" opacity=".8"/>
      <text x="${cx}" y="${y + 9.5}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="4.6" font-weight="700" letter-spacing="1.1" fill="#274294">SPM</text>
      <line x1="${x + 6}" y1="${y + 12}" x2="${x + w - 6}" y2="${y + 12}" stroke="#274294" stroke-width=".7" opacity=".55"/>
      <text x="${cx}" y="${y + 16 + lines * 5 - 3.5}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="6.4" font-weight="700" fill="#1d3a52">${title}</text>
      ${textLines}
      <text x="${x + w - 7}" y="${y + h - 4.5}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="4.4" fill="#5c7183">${dose}</text>
      ${barcode}`;
  }

  /* крышка с рёбрами (knurling) */
  const cap = (id, x, y, w, h, dark = false) => {
    const ribs = Array.from({ length: Math.max(4, Math.floor(w / 3.4)) }, (_, i) =>
      `<line x1="${x + 3 + i * 3.4}" y1="${y + 1.5}" x2="${x + 3 + i * 3.4}" y2="${y + h - 1.5}" stroke="#000000" stroke-width=".7" opacity=".18"/>`
    ).join("");
    return `
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="url(#${id}-${dark ? "capDark" : "cap"})" stroke="#3c464f" stroke-width=".8"/>
      ${ribs}
      <rect x="${x + 2}" y="${y + 1.5}" width="${w - 4}" height="2.2" rx="1.1" fill="#ffffff" opacity=".55"/>`;
  };

  /* пузырьки в жидкости */
  const bubbles = (seed, x0, y0, x1, y1, n = 5) => {
    let s = seed;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    return Array.from({ length: n }, () => {
      const cx = x0 + rnd() * (x1 - x0), cy = y0 + rnd() * (y1 - y0), r = .8 + rnd() * 2.2;
      return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="#ffffff" opacity="${(.25 + rnd() * .3).toFixed(2)}"/>`;
    }).join("");
  };

  /* стеклянное тело с подсветкой объёма */
  const glassBody = (id, d, extra = "") =>
    `<path d="${d}" fill="url(#${id}-body)" stroke="hsl(${0} 0% 30%)" stroke-width=".6" stroke-opacity=".25" filter="url(#${id}-glass)"/>${extra}`;

  /* обёртка: сцена 200x200 */
  const wrap = (inner, d, id) =>
    `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${d.markup}${inner}</svg>`;

  /* ============================================================
     12 типов упаковок, студийный свет, тени, этикетки
     ============================================================ */

  const ARTISTS = {

    /* высокий флакон с завинчивающейся крышкой */
    flacon(item) {
      const d = defs(item.hue); const id = d.id;
      const body = "M79 42 Q79 36 86 36 L114 36 Q121 36 121 42 L121 62 Q139 72 139 96 L139 160 Q139 176 123 176 L77 176 Q61 176 61 160 L61 96 Q61 72 79 62 Z";
      const liquid = "M65 104 L65 158 Q65 171 79 172 L121 172 Q135 171 135 158 L135 104 Q135 99 130 99 L70 99 Q65 99 65 104 Z";
      return wrap(`${ground(id)}
        ${cap(id, 84, 16, 32, 22, true)}
        ${glassBody(id, body)}
        <path d="${liquid}" fill="url(#${id}-liquid)" opacity=".92"/>
        <ellipse cx="100" cy="101" rx="33" ry="4.5" fill="#ffffff" opacity=".35"/>
        ${bubbles(7, 72, 112, 128, 166, 6)}
        ${label(id, { x: 71, y: 112, w: 58, h: 40, title: item.short, dose: item.dose })}
        ${specBar(id, 70, 66, 7, 88, .9)}
        ${specDot(id, 118, 76, 9, .7)}
        <rect x="61" y="160" width="78" height="16" rx="8" fill="url(#${id}-reflect)" opacity=".35"/>`, d, id);
    },

    /* стеклянная ампула с перетяжкой */
    ampoule(item) {
      const d = defs(item.hue); const id = d.id;
      const body = "M95 46 L105 46 L111 68 Q128 86 128 110 L128 150 Q128 172 100 172 Q72 172 72 150 L72 110 Q72 86 89 68 Z";
      const liquid = "M76 106 L76 148 Q76 166 100 167 Q124 166 124 148 L124 106 Q124 101 119 101 L81 101 Q76 101 76 106 Z";
      return wrap(`${ground(id, 100, 184, 46)}
        <path d="M92 22 Q92 15 100 15 Q108 15 108 22 L106 46 L94 46 Z" fill="url(#${id}-cap)" stroke="#3c464f" stroke-width=".8"/>
        <path d="M93 46 L107 46 L104 56 L96 56 Z" fill="#e8edf1" opacity=".9"/>
        ${glassBody(id, body)}
        <path d="${liquid}" fill="url(#${id}-liquid)" opacity=".92"/>
        ${bubbles(3, 82, 112, 118, 160, 4)}
        ${label(id, { x: 78, y: 118, w: 44, h: 34, title: item.short, dose: item.dose, lines: 1 })}
        ${specBar(id, 79, 84, 6, 60, .9)}
        ${specDot(id, 114, 72, 7, .8)}
        <circle cx="100" cy="63" r="2.6" fill="#ffffff" opacity=".85"/>`, d, id);
    },

    /* шприц под углом, с делениями и поршнем */
    syringe(item) {
      const d = defs(item.hue); const id = d.id;
      return wrap(`${ground(id, 100, 172, 92)}
        <g transform="rotate(-22 100 108)">
          <rect x="30" y="98" width="118" height="22" rx="10" fill="url(#${id}-body)" stroke="#3c464f" stroke-width=".7" stroke-opacity=".3" filter="url(#${id}-glass)"/>
          <rect x="48" y="101" width="82" height="16" rx="7" fill="url(#${id}-liquid)" opacity=".9"/>
          ${[58, 74, 90, 106, 122].map(x => `<line x1="${x}" y1="99.5" x2="${x}" y2="106" stroke="#1d3a52" stroke-width="1" opacity=".7"/><line x1="${x}" y1="114" x2="${x}" y2="118.5" stroke="#1d3a52" stroke-width="1" opacity=".7"/>`).join("")}
          <rect x="148" y="94" width="14" height="30" rx="3" fill="url(#${id}-cap)" stroke="#3c464f" stroke-width=".8"/>
          <rect x="162" y="102" width="10" height="14" rx="2" fill="url(#${id}-capDark)" stroke="#3c464f" stroke-width=".7"/>
          <rect x="172" y="98" width="24" height="22" rx="4" fill="url(#${id}-cap)" stroke="#3c464f" stroke-width=".8"/>
          <rect x="196" y="105" width="5" height="8" rx="2" fill="#8d99a3"/>
          <line x1="18" y1="109" x2="32" y2="109" stroke="#5c6770" stroke-width="3.4" stroke-linecap="round"/>
          <line x1="21" y1="102" x2="21" y2="116" stroke="#5c6770" stroke-width="2.2"/>
          <line x1="26" y1="102" x2="26" y2="116" stroke="#5c6770" stroke-width="2.2"/>
          ${specBar(id, 52, 102, 26, 4, .8)}
          <rect x="66" y="104" width="30" height="10" rx="2" fill="url(#${id}-label)" stroke="#c3ccd3" stroke-width=".5"/>
          <text x="81" y="110.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="4.2" font-weight="700" fill="#274294">SPM · ${item.short}</text>
        </g>`, d, id);
    },

    /* тюбик мази с конической крышкой */
    tube(item) {
      const d = defs(item.hue); const id = d.id;
      return wrap(`${ground(id, 100, 184, 40)}
        <rect x="82" y="150" width="36" height="26" rx="4" fill="url(#${id}-capDark)" stroke="#3c464f" stroke-width=".8"/>
        <path d="M86 150 L114 150 L121 54 Q121 42 111 42 L89 42 Q79 42 79 54 Z" fill="url(#${id}-body)" stroke="#3c464f" stroke-width=".6" stroke-opacity=".25" filter="url(#${id}-glass)"/>
        <path d="M84 150 L116 150 L114 60 L86 60 Z" fill="url(#${id}-liquid)" opacity=".18"/>
        ${label(id, { x: 83, y: 84, w: 34, h: 44, title: item.short, dose: item.dose })}
        ${specBar(id, 84, 52, 6, 84, .85)}`, d, id);
    },

    /* стеклянная банка с широкой крышкой */
    jar(item) {
      const d = defs(item.hue); const id = d.id;
      const body = "M68 64 L132 64 Q142 64 142 76 L142 150 Q142 172 120 172 L80 172 Q58 172 58 150 L58 76 Q58 64 68 64 Z";
      const liquid = "M62 98 L62 148 Q62 166 82 167 L118 167 Q138 166 138 148 L138 98 Q138 93 133 93 L67 93 Q62 93 62 98 Z";
      return wrap(`${ground(id)}
        ${cap(id, 60, 40, 80, 26, true)}
        ${glassBody(id, body)}
        <path d="${liquid}" fill="url(#${id}-liquid)" opacity=".9"/>
        ${bubbles(11, 70, 108, 130, 160, 5)}
        ${label(id, { x: 68, y: 108, w: 64, h: 40, title: item.short, dose: item.dose })}
        ${specBar(id, 66, 84, 8, 62, .9)}
        ${specDot(id, 124, 80, 10, .6)}`, d, id);
    },

    /* ингалятор: корпус + мундштук */
    inhaler(item) {
      const d = defs(item.hue); const id = d.id;
      const body = "M78 72 Q78 50 100 50 Q122 50 122 72 L122 158 Q122 174 100 174 Q78 174 78 158 Z";
      return wrap(`${ground(id)}
        ${cap(id, 88, 30, 24, 22, true)}
        <path d="M112 38 L136 38 Q146 38 146 47 L146 54 Q146 60 138 60 L112 60 Z" fill="url(#${id}-cap)" stroke="#3c464f" stroke-width=".8"/>
        <ellipse cx="146" cy="49" rx="4.5" ry="5.5" fill="#2a3540" opacity=".8"/>
        ${glassBody(id, body)}
        ${label(id, { x: 84, y: 100, w: 32, h: 40, title: item.short, dose: item.dose, lines: 1 })}
        ${specBar(id, 84, 84, 7, 62, .9)}
        ${specDot(id, 112, 66, 8, .7)}`, d, id);
    },

    /* капсула: две половинки, перламутр */
    capsule(item) {
      const d = defs(item.hue); const id = d.id;
      const h2 = item.hue > 200 ? item.hue - 70 : item.hue + 70;
      const id2 = uid();
      const extra = `<defs>
        <linearGradient id="${id2}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="hsl(${h2} 70% 55%)"/>
          <stop offset=".2" stop-color="hsl(${h2} 85% 88%)"/>
          <stop offset=".45" stop-color="#ffffff"/>
          <stop offset=".7" stop-color="hsl(${h2} 80% 78%)"/>
          <stop offset="1" stop-color="hsl(${h2} 70% 48%)"/>
        </linearGradient>
      </defs>`;
      return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${d.markup}${extra}${ground(id, 100, 150, 84)}
        <g transform="rotate(-28 100 100)">
          <path d="M38 100 Q38 74 64 74 L100 74 L100 126 L64 126 Q38 126 38 100 Z" fill="url(#${id}-body)" stroke="#3c464f" stroke-width=".7" stroke-opacity=".3" filter="url(#${id}-glass)"/>
          <path d="M100 74 L136 74 Q162 74 162 100 Q162 126 136 126 L100 126 Z" fill="url(#${id2})" stroke="#3c464f" stroke-width=".7" stroke-opacity=".3" filter="url(#${id}-glass)"/>
          <ellipse cx="100" cy="100" rx="3.5" ry="26" fill="#ffffff" opacity=".6"/>
          <text x="69" y="97" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="5.4" font-weight="700" letter-spacing=".8" fill="#ffffff" opacity=".92" transform="rotate(-90 69 100)">SPM</text>
          <text x="69" y="106" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="4.6" fill="#ffffff" opacity=".8" transform="rotate(-90 69 100)">${item.short}</text>
          ${specBar(id, 50, 82, 16, 9, .9)}
          ${specBar(id, 120, 82, 22, 8, .8)}
        </g></svg>`;
    },

    /* спрей с помпой-распылителем */
    spray(item) {
      const d = defs(item.hue); const id = d.id;
      const body = "M80 56 L120 56 Q132 56 132 68 L132 152 Q132 172 100 172 Q68 172 68 152 L68 68 Q68 56 80 56 Z";
      const liquid = "M72 96 L72 150 Q72 166 100 167 Q128 166 128 150 L128 96 Q128 91 123 91 L77 91 Q72 91 72 96 Z";
      return wrap(`${ground(id)}
        <rect x="90" y="20" width="20" height="18" rx="3" fill="url(#${id}-cap)" stroke="#3c464f" stroke-width=".8"/>
        <path d="M90 30 L72 30 Q64 30 64 38 L64 46 L90 46 Z" fill="url(#${id}-cap)" stroke="#3c464f" stroke-width=".8"/>
        <ellipse cx="64" cy="38" rx="3.4" ry="4" fill="#2a3540" opacity=".75"/>
        <rect x="86" y="38" width="28" height="18" rx="4" fill="url(#${id}-capDark)" stroke="#3c464f" stroke-width=".8"/>
        ${glassBody(id, body)}
        <path d="${liquid}" fill="url(#${id}-liquid)" opacity=".9"/>
        ${label(id, { x: 76, y: 108, w: 48, h: 38, title: item.short, dose: item.dose, lines: 1 })}
        ${specBar(id, 76, 80, 6, 62, .9)}
        <circle cx="50" cy="30" r="2.6" fill="#bfe9f5" opacity=".85"/>
        <circle cx="40" cy="20" r="2" fill="#bfe9f5" opacity=".6"/>
        <circle cx="32" cy="12" r="1.5" fill="#bfe9f5" opacity=".45"/>`, d, id);
    },

    /* пластырь телесного цвета с подушечкой */
    patch(item) {
      const d = defs(item.hue); const id = d.id;
      const skin = "#f2d3b3", skinDark = "#e0b98d";
      const body = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="url(#${id}-label)" stroke="${skinDark}" stroke-width="1.2"/>`;
      const dots = (cx, cy) => Array.from({ length: 12 }, (_, i) => {
        const a = i / 12 * Math.PI * 2, r = 9;
        return `<circle cx="${(cx + Math.cos(a) * r).toFixed(1)}" cy="${(cy + Math.sin(a) * r).toFixed(1)}" r=".9" fill="${skinDark}" opacity=".55"/>`;
      }).join("");
      return wrap(`${ground(id, 100, 160, 80)}
        <g transform="rotate(6 100 100)">
          ${body(38, 82, 124, 36)}
          ${body(82, 38, 36, 124)}
          <rect x="88" y="88" width="24" height="24" rx="3" fill="#fdf6ec" stroke="${skinDark}" stroke-width="1"/>
          ${dots(100, 100)}
          <rect x="44" y="86" width="70" height="5" rx="2.5" fill="#ffffff" opacity=".5"/>
          <text x="100" y="104" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="5.6" font-weight="700" letter-spacing=".6" fill="#a5763f">SPM</text>
          <text x="100" y="110" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="4.6" fill="#a5763f">${item.short}</text>
        </g>`, d, id);
    },

    /* коричневое аптечное стекло (как в старых аптеках) */
    bottle(item) {
      const d = defs(item.hue); const id = d.id;
      const aid = uid();
      const amber = `<defs>
        <linearGradient id="${aid}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#5e3a17"/>
          <stop offset=".12" stop-color="#8a5a26"/>
          <stop offset=".3" stop-color="#c08b45"/>
          <stop offset=".46" stop-color="#e0b878"/>
          <stop offset=".6" stop-color="#a06c30"/>
          <stop offset=".82" stop-color="#7a4c1e"/>
          <stop offset="1" stop-color="#4a2c10"/>
        </linearGradient>
      </defs>`;
      return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${d.markup}${amber}${ground(id)}
        <rect x="87" y="24" width="26" height="18" rx="3" fill="#e8e2d4" stroke="#9a927e" stroke-width="1"/>
        <path d="M90 42 L110 42 L110 58 Q128 68 128 92 L128 156 Q128 172 100 172 Q72 172 72 156 L72 92 Q72 68 90 58 Z" fill="url(#${aid})" stroke="#3c2408" stroke-width=".8"/>
        ${label(id, { x: 76, y: 104, w: 48, h: 44, title: item.short, dose: item.dose })}
        ${specBar(id, 80, 80, 6, 56, .5)}
        <rect x="72" y="156" width="56" height="16" rx="8" fill="url(#${id}-reflect)" opacity=".25"/></svg>`;
    },

    /* набор из трёх виал на деревянной подставке */
    vial(item) {
      const d = defs(item.hue); const id = d.id;
      const one = (cx) => `
        <g transform="translate(${cx} 0)">
          ${cap(id, 91, 52, 18, 12)}
          <path d="M93 64 L107 64 L112 78 Q118 88 118 102 L118 150 Q118 166 100 166 Q82 166 82 150 L82 102 Q82 88 88 78 Z"
                fill="url(#${id}-body)" stroke="#3c464f" stroke-width=".6" stroke-opacity=".3" filter="url(#${id}-glass)"/>
          <path d="M85 100 L85 148 Q85 162 100 162 Q115 162 115 148 L115 100 Q115 96 111 96 L89 96 Q85 96 85 100 Z" fill="url(#${id}-liquid)" opacity=".9"/>
          ${specBar(id, 88, 92, 4.5, 42, .85)}
        </g>`;
      return wrap(`${ground(id, 100, 178, 62)}
        <rect x="46" y="150" width="108" height="16" rx="4" fill="url(#${id}-capDark)" stroke="#3c464f" stroke-width=".7"/>
        <rect x="46" y="146" width="108" height="6" rx="3" fill="#8a5f3b"/>
        ${one(100)}
        <g transform="translate(-36 16) scale(.82)" opacity=".94">${one(100)}</g>
        <g transform="translate(36 16) scale(.82)" opacity=".94">${one(100)}</g>
        <text x="100" y="162" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="6" font-weight="700" letter-spacing="1.4" fill="#e8e2d4">SPM · ${item.short}</text>`, d, id);
    },

    /* коробка с глянцевой ламинацией */
    box(item) {
      const d = defs(item.hue); const id = d.id;
      return wrap(`${ground(id, 100, 180, 66)}
        <path d="M52 84 L100 62 L148 84 L148 152 L100 174 L52 152 Z" fill="url(#${id}-body)" stroke="#3c464f" stroke-width=".8" stroke-opacity=".3"/>
        <path d="M52 84 L100 106 L148 84 L100 62 Z" fill="#ffffff" opacity=".85"/>
        <path d="M100 106 L100 174" stroke="#3c464f" stroke-width=".8" stroke-opacity=".3"/>
        <path d="M52 84 L52 152 L100 174 L100 106 Z" fill="#000000" opacity=".12"/>
        <rect x="108" y="116" width="32" height="28" rx="2" fill="url(#${id}-label)" stroke="#c3ccd3" stroke-width=".7" transform="skewY(22)"/>
        <text x="124" y="127" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="7" font-weight="700" fill="#274294" transform="skewY(22)">SPM</text>
        <text x="124" y="135" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="5.4" font-weight="700" fill="#1d3a52" transform="skewY(22)">${item.short}</text>
        ${specBar(id, 66, 96, 10, 40, .55)}
        <path d="M100 62 L148 84 L148 90 L100 68 Z" fill="#ffffff" opacity=".5"/>`, d, id);
    }
  };

  window.ART = {
    render(item) {
      const fn = ARTISTS[item.art] || ARTISTS.flacon;
      return fn(item);
    }
  };
})();
