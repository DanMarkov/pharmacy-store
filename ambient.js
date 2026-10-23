/* ============================================================
   AMBIENT «ТУМАН НАД ОЗЕРОМ» — генеративный звук на Web Audio.
   Слои: фильтрованный шум (дождь/ветер), низкий гул (туман),
   редкие «капли» (резонансные всплески). Всё синтезируется
   локально, внешних файлов нет. Запуск — по первому жесту.
   ============================================================ */

(function () {
  "use strict";

  const Ambient = {
    ctx: null,
    master: null,
    on: false,
    _nodes: [],

    _ensure() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
    },

    _noiseBuffer() {
      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      return buf;
    },

    _startLayers() {
      const ctx = this.ctx;

      // 1) дождь / ветер: белый шум через lowpass + медленный LFO на срезе
      const rain = ctx.createBufferSource();
      rain.buffer = this._noiseBuffer();
      rain.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1400;
      lp.Q.value = .7;
      const rainGain = ctx.createGain();
      rainGain.gain.value = .16;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = .07;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 500;
      lfo.connect(lfoGain).connect(lp.frequency);
      rain.connect(lp).connect(rainGain).connect(this.master);
      rain.start(); lfo.start();
      this._nodes.push(rain, lfo);

      // 2) туман: очень низкий гул (два детюнированных синуса)
      [.0, .0].forEach((_, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = 55 + i * 1.7;
        const g = ctx.createGain();
        g.gain.value = .05;
        const lfo2 = ctx.createOscillator();
        lfo2.frequency.value = .11 + i * .05;
        const lfo2g = ctx.createGain();
        lfo2g.gain.value = .02;
        lfo2.connect(lfo2g).connect(g.gain);
        osc.connect(g).connect(this.master);
        osc.start(); lfo2.start();
        this._nodes.push(osc, lfo2);
      });

      // 3) капли: случайные короткие «дзынь» (синус с быстрым затуханием)
      const drop = () => {
        if (!this.on) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = "sine";
        const base = 700 + Math.random() * 1400;
        osc.frequency.setValueAtTime(base, t);
        osc.frequency.exponentialRampToValueAtTime(base * .55, t + .12);
        const g = ctx.createGain();
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(.07 + Math.random() * .05, t + .008);
        g.gain.exponentialRampToValueAtTime(.0001, t + .18);
        // лёгкая ревербация-имитация: второй чуть тише и позже
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(.0001, t + .03);
        g2.gain.exponentialRampToValueAtTime(.03, t + .04);
        g2.gain.exponentialRampToValueAtTime(.0001, t + .22);
        osc.connect(g).connect(this.master);
        osc.connect(g2).connect(this.master);
        osc.start(t); osc.stop(t + .3);
        this._timer = setTimeout(drop, 900 + Math.random() * 3200);
      };
      this._timer = setTimeout(drop, 1500);
    },

    async toggle() {
      this._ensure();
      if (this.ctx.state === "suspended") await this.ctx.resume();
      this.on = !this.on;
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.linearRampToValueAtTime(this.on ? .9 : 0, now + (this.on ? 1.6 : .5));
      if (this.on && !this._nodes.length) this._startLayers();
      if (!this.on && this._timer) { clearTimeout(this._timer); this._timer = null; }
      return this.on;
    },

    // тихий «pop» пузырька при кликах (включается вместе со звуком)
    pop(x, y) {
      if (!this.on || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(420 + Math.random() * 260, t);
      osc.frequency.exponentialRampToValueAtTime(160, t + .1);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(.09, t);
      g.gain.exponentialRampToValueAtTime(.0001, t + .14);
      osc.connect(g).connect(this.master);
      osc.start(t); osc.stop(t + .16);
    }
  };

  window.Ambient = Ambient;
})();
