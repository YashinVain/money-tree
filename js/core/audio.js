// audio.js — весь звук синтезируется на лету через Web Audio API: никаких
// аудиофайлов (быстрая загрузка, нет вопросов с лицензиями).
// Тапы играют ноты пентатоники — частые тапы складываются в мелодию.
// Музыка — мягкий генеративный эмбиент, тональность меняется с эпохой.

(function (root) {
    const R = root.R = root.R || {};
    const A = R.audio = {
        ctx: null,
        soundOn: true,
        musicOn: true,
        unlocked: false,
        paused: false
    };

    let master, sfxBus, musicBus, fxSend, noiseBuffer;
    let musicTimer = null;
    let musicStep = 0;
    let musicKey = 0;          // сдвиг тональности в полутонах (по эпохе)
    let lastTapTime = 0;
    let tapIndex = 0;

    // Пентатоника (мажорная): ступени в полутонах
    const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
    // C, D, E, F, G, A, D, F — у каждой из 8 стадий дерева свой "цвет" музыки
    const ERA_KEYS = [0, 2, 4, 5, 7, 9, 2, 5];

    const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

    function init() {
        if (A.ctx) return;
        const AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) return;
        A.ctx = new AC();
        const ctx = A.ctx;

        // Компрессор на выходе — чтобы много звуков сразу не "хрипели"
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.knee.value = 12;
        comp.ratio.value = 4;
        comp.attack.value = 0.005;
        comp.release.value = 0.2;
        comp.connect(ctx.destination);

        master = ctx.createGain();
        master.gain.value = 0.9;
        master.connect(comp);

        sfxBus = ctx.createGain();
        sfxBus.gain.value = 0.5;
        sfxBus.connect(master);

        musicBus = ctx.createGain();
        musicBus.gain.value = 0;
        const musicLP = ctx.createBiquadFilter();
        musicLP.type = 'lowpass';
        musicLP.frequency.value = 2200;
        musicBus.connect(musicLP);
        musicLP.connect(master);

        // Простое "эхо пространства": задержка с затухающим повтором
        fxSend = ctx.createGain();
        fxSend.gain.value = 0.28;
        const delay = ctx.createDelay(1);
        delay.delayTime.value = 0.23;
        const fb = ctx.createGain();
        fb.gain.value = 0.32;
        const dlp = ctx.createBiquadFilter();
        dlp.type = 'lowpass';
        dlp.frequency.value = 2400;
        fxSend.connect(delay);
        delay.connect(dlp);
        dlp.connect(fb);
        fb.connect(delay);
        dlp.connect(master);

        // Буфер белого шума — для "вжух" при высвобождении
        noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }

    // Один тон с огибающей: мягкая атака, экспоненциальное затухание
    function tone(freq, opt) {
        if (!A.ctx || A.paused) return;
        // Звуки и музыка выключаются независимо: музыка идёт через свою шину
        if (!A.soundOn && !(opt && opt.bus)) return;
        const ctx = A.ctx;
        const o = Object.assign({ type: 'sine', at: 0, attack: 0.005, decay: 0.2, peak: 0.2, to: null, send: 0, cutoff: 5000, detune: 0 }, opt);
        const t = ctx.currentTime + o.at;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const f = ctx.createBiquadFilter();
        osc.type = o.type;
        osc.frequency.setValueAtTime(freq, t);
        if (o.detune) osc.detune.setValueAtTime(o.detune, t);
        if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + o.attack + o.decay);
        f.type = 'lowpass';
        f.frequency.value = o.cutoff;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(o.peak, t + o.attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + o.attack + o.decay);
        osc.connect(f);
        f.connect(g);
        g.connect(o.bus || sfxBus);
        if (o.send) {
            const s = ctx.createGain();
            s.gain.value = o.send;
            g.connect(s);
            s.connect(fxSend);
        }
        osc.start(t);
        osc.stop(t + o.attack + o.decay + 0.05);
    }

    function noise(opt) {
        if (!A.ctx || !A.soundOn || A.paused) return;
        const ctx = A.ctx;
        const o = Object.assign({ at: 0, dur: 0.6, peak: 0.15, from: 400, to: 4000, q: 1.2 }, opt);
        const t = ctx.currentTime + o.at;
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.Q.value = o.q;
        f.frequency.setValueAtTime(o.from, t);
        f.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(o.peak, t + o.dur * 0.35);
        g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
        src.connect(f);
        f.connect(g);
        g.connect(sfxBus);
        src.start(t);
        src.stop(t + o.dur + 0.05);
    }

    // Нота пентатоники в текущей тональности: step 0..9, octave сдвиг
    function pentaHz(step, base = 72) {
        const s = ((step % PENTA.length) + PENTA.length) % PENTA.length;
        return midiToHz(base + musicKey + PENTA[s]);
    }

    // Колокольчик: основной тон + тихий обертон
    function bell(freq, at = 0, peak = 0.12, decay = 0.6) {
        tone(freq, { at, peak, decay, attack: 0.004, send: 0.5 });
        tone(freq * 2.01, { at, peak: peak * 0.25, decay: decay * 0.5, attack: 0.003 });
    }

    // ---------- Публичные звуки ----------
    A.unlock = () => {
        init();
        if (!A.ctx) return;
        if (A.ctx.state === 'suspended' && !A.paused) A.ctx.resume();
        if (!A.unlocked) {
            A.unlocked = true;
            A.applyMusic();
        }
    };

    A.setEra = (index) => { musicKey = ERA_KEYS[index] || 0; };

    A.tap = (crit) => {
        if (!A.ctx) return;
        const now = performance.now();
        // Быстрые тапы идут вверх по гамме, после паузы мелодия начинается заново
        tapIndex = now - lastTapTime < 450 ? tapIndex + 1 : 0;
        lastTapTime = now;
        const step = tapIndex % 8;
        const f = pentaHz(step, 67);
        tone(f, { type: 'triangle', peak: 0.16, decay: 0.16, attack: 0.004, cutoff: 3200, send: 0.18 });
        tone(f * 0.5, { type: 'sine', peak: 0.1, decay: 0.12, attack: 0.003 });
        tone(140, { type: 'sine', peak: 0.12, decay: 0.07, to: 70 });
        if (crit) {
            bell(f * 2, 0.02, 0.12, 0.5);
            bell(f * 3, 0.08, 0.08, 0.6);
        }
    };

    A.autoTap = () => {
        tone(pentaHz(Math.floor(Math.random() * 5), 84), { type: 'sine', peak: 0.025, decay: 0.08, attack: 0.003 });
    };

    A.buy = () => {
        tone(pentaHz(4, 72), { type: 'triangle', peak: 0.12, decay: 0.12, send: 0.2 });
        tone(pentaHz(7, 72), { type: 'triangle', peak: 0.12, decay: 0.22, at: 0.06, send: 0.3 });
    };

    A.buyBig = () => {
        [0, 2, 4, 7].forEach((s, i) => tone(pentaHz(s + 3, 72), { type: 'triangle', peak: 0.1, decay: 0.2, at: i * 0.045, send: 0.3 }));
    };

    A.deny = () => {
        tone(220, { type: 'sine', peak: 0.08, decay: 0.12, to: 180 });
    };

    A.click = () => {
        tone(1200, { type: 'sine', peak: 0.04, decay: 0.04, attack: 0.002 });
    };

    A.open = () => {
        tone(pentaHz(2, 72), { type: 'sine', peak: 0.05, decay: 0.12, to: pentaHz(5, 72), send: 0.2 });
    };

    A.ready = () => {
        bell(pentaHz(5, 72), 0, 0.08, 0.5);
        bell(pentaHz(7, 72), 0.1, 0.07, 0.6);
    };

    A.release = () => {
        noise({ dur: 0.9, peak: 0.16, from: 300, to: 5000 });
        [0, 4, 7, 12].forEach((s, i) => tone(midiToHz(60 + musicKey + s), { type: 'triangle', peak: 0.09, decay: 1.1, attack: 0.04, at: i * 0.05, send: 0.4 }));
        tone(55, { type: 'sine', peak: 0.2, decay: 0.6, to: 40 });
    };

    A.buffEnd = () => {
        tone(pentaHz(4, 67), { type: 'sine', peak: 0.06, decay: 0.4, to: pentaHz(0, 67), send: 0.3 });
    };

    A.era = () => {
        const seq = [0, 2, 4, 5, 7, 9];
        seq.forEach((s, i) => bell(pentaHz(s, 72), i * 0.09, 0.11, 0.8));
        [0, 4, 7].forEach(s => tone(midiToHz(48 + musicKey + s), { type: 'triangle', peak: 0.08, decay: 2, attack: 0.2, at: 0.3, send: 0.4 }));
        noise({ dur: 1.2, peak: 0.08, from: 2000, to: 9000, at: 0.25 });
    };

    A.freq = () => {
        [0, 3, 7, 10].forEach((s, i) => tone(midiToHz(64 + musicKey + s), { type: 'sine', peak: 0.07, decay: 1.6, attack: 0.15, at: i * 0.12, send: 0.5 }));
    };

    A.cometAppear = () => {
        for (let i = 0; i < 5; i++) bell(pentaHz(9 - i, 84), i * 0.06, 0.035, 0.3);
    };

    A.cometCatch = () => {
        for (let i = 0; i < 8; i++) bell(pentaHz(i, 76), i * 0.04, 0.08, 0.4);
    };

    A.achievement = () => {
        bell(pentaHz(4, 79), 0, 0.12, 0.7);
        bell(pentaHz(7, 79), 0.12, 0.12, 0.9);
    };

    A.reward = () => {
        for (let i = 0; i < 6; i++) bell(pentaHz(i + 2, 76), i * 0.05, 0.08, 0.35);
    };

    A.prestige = () => {
        noise({ dur: 2.2, peak: 0.12, from: 150, to: 6000, q: 0.8 });
        [0, 7, 12, 16, 19, 24].forEach((s, i) => tone(midiToHz(48 + musicKey + s), { type: 'triangle', peak: 0.08, decay: 2.4, attack: 0.3, at: i * 0.14, send: 0.5 }));
        for (let i = 0; i < 10; i++) bell(pentaHz(9 - i, 84), 1.2 + i * 0.07, 0.05, 0.5);
    };

    // ---------- Музыка ----------
    // Прогрессия из 4 аккордов (ступени: I – vi – IV – V), каждый ~6 секунд
    const PROG = [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]];
    const STEP_MS = 750;

    function musicTick() {
        if (!A.ctx || !A.musicOn || A.paused) return;
        const chord = PROG[Math.floor(musicStep / 8) % PROG.length];
        const beat = musicStep % 8;

        if (beat === 0) {
            // Пэд: мягко нарастающий аккорд
            chord.forEach((s, i) => {
                tone(midiToHz(52 + musicKey + s), {
                    type: i % 2 ? 'triangle' : 'sine', peak: 0.05, attack: 1.6, decay: 4.6,
                    detune: (i - 1.5) * 6, bus: musicBus, cutoff: 1400
                });
            });
            tone(midiToHz(40 + musicKey + chord[0]), { type: 'sine', peak: 0.07, attack: 0.6, decay: 5, bus: musicBus });
        }
        // Тихие "звёздные" ноты — не каждый шаг, чтобы музыка дышала
        if (Math.random() < 0.42) {
            const note = chord[Math.floor(Math.random() * chord.length)] + (Math.random() < 0.5 ? 12 : 24);
            const f = midiToHz(60 + musicKey + note);
            const t0 = Math.random() * 0.1;
            tone(f, { type: 'sine', peak: 0.03, attack: 0.01, decay: 1.4, at: t0, bus: musicBus });
        }
        musicStep++;
    }

    A.applyMusic = () => {
        if (!A.ctx) return;
        const t = A.ctx.currentTime;
        musicBus.gain.cancelScheduledValues(t);
        musicBus.gain.setTargetAtTime(A.musicOn ? 0.55 : 0, t, 0.8);
        if (A.musicOn && !musicTimer) {
            musicTimer = setInterval(musicTick, STEP_MS);
            musicTick();
        } else if (!A.musicOn && musicTimer) {
            clearInterval(musicTimer);
            musicTimer = null;
        }
    };

    A.setSound = (on) => { A.soundOn = on; };
    A.setMusic = (on) => { A.musicOn = on; A.applyMusic(); };

    // Пауза: реклама, свёрнутая вкладка, потеря фокуса (требование Яндекса 1.3)
    A.pause = () => {
        A.paused = true;
        if (A.ctx && A.ctx.state === 'running') A.ctx.suspend();
    };
    A.resume = () => {
        A.paused = false;
        if (A.ctx && A.unlocked && A.ctx.state === 'suspended') A.ctx.resume();
    };
})(typeof window !== 'undefined' ? window : globalThis);
