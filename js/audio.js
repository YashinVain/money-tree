// audio.js — звук и музыка через Web Audio API. Все звуки синтезируются на
// лету (осцилляторы + огибающие громкости), внешние аудиофайлы не нужны —
// это надёжнее (нет сетевых загрузок и вопросов лицензии) и вписывается
// в неоновую sci-fi тему игры

// Аккорды фоновой музыки — медленно сменяющие друг друга "плывущие" паузы,
// а не навязчивая мелодия по кругу
const MUSIC_CHORDS = [
    [110, 164.81, 261.63, 392],      // Am9
    [87.31, 130.81, 220, 329.63],    // Fmaj7
    [130.81, 196, 329.63, 587.33],   // Cmaj9
    [82.41, 123.47, 293.66, 392]     // Em7
];

window.AudioState = {
    ctx: null,
    masterGain: null,
    sfxGain: null,
    musicGain: null,
    soundEnabled: true,
    musicEnabled: true,
    musicPlaying: false,
    musicChordIndex: 0,
    musicTimer: null,

    ensureContext() {
        if (this.ctx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;

        this.ctx = new AC();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.8;
        this.masterGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.6;
        this.sfxGain.connect(this.masterGain);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.22;
        this.musicGain.connect(this.masterGain);

        this.loadPrefs();
    },

    resume() {
        this.ensureContext();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    loadPrefs() {
        try {
            this.soundEnabled = localStorage.getItem('resonance_sound_enabled') !== '0';
            this.musicEnabled = localStorage.getItem('resonance_music_enabled') !== '0';
        } catch (error) {
            // localStorage недоступен — остаёмся со включённым звуком по умолчанию
        }
    },

    setSoundEnabled(on) {
        this.soundEnabled = on;
        try { localStorage.setItem('resonance_sound_enabled', on ? '1' : '0'); } catch (error) { /* noop */ }
    },

    setMusicEnabled(on) {
        this.musicEnabled = on;
        try { localStorage.setItem('resonance_music_enabled', on ? '1' : '0'); } catch (error) { /* noop */ }
        this.applyMusicState();
    },

    applyMusicState() {
        if (this.musicEnabled) this.startMusic();
        else this.stopMusic();
    },

    // ---- низкоуровневый помощник: один "голос" с огибающей громкости ----
    // Проходит через мягкий lowpass-фильтр — срезает резкие верхние обертоны
    // осцилляторов (особенно sawtooth), звук получается более округлым
    playEnvTone(freq, { type = 'sine', start = 0, attack = 0.01, hold = 0, decay = 0.15, peak = 0.3, detune = 0, endFreq = null, destination = null, cutoff = 3000 } = {}) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime + start;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        if (endFreq !== null) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t + attack + hold + decay);
        }
        if (detune) osc.detune.setValueAtTime(detune, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(cutoff, t);
        filter.Q.setValueAtTime(0.5, t);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(peak, t + attack);
        gain.gain.setValueAtTime(peak, t + attack + hold);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + decay);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(destination || this.sfxGain);
        osc.start(t);
        osc.stop(t + attack + hold + decay + 0.05);
    },

    // ---- игровые звуки ----
    playClick() {
        if (!this.soundEnabled) return;
        this.resume();
        const pitch = 0.94 + Math.random() * 0.12;
        this.playEnvTone(720 * pitch, { type: 'triangle', attack: 0.012, decay: 0.1, peak: 0.28, endFreq: 420 * pitch });
    },

    playCrit() {
        if (!this.soundEnabled) return;
        this.resume();
        this.playEnvTone(1400, { type: 'triangle', attack: 0.014, decay: 0.2, peak: 0.26, endFreq: 300 });
        this.playEnvTone(180, { type: 'sine', attack: 0.014, decay: 0.18, peak: 0.36, endFreq: 60 });
    },

    playBuy() {
        if (!this.soundEnabled) return;
        this.resume();
        [523.25, 783.99].forEach((freq, i) => {
            this.playEnvTone(freq, { type: 'sine', start: i * 0.05, attack: 0.018, decay: 0.24, peak: 0.24 });
        });
    },

    playRelease() {
        if (!this.soundEnabled) return;
        this.resume();
        this.playEnvTone(110, { type: 'triangle', attack: 0.1, decay: 0.5, peak: 0.22, endFreq: 440 });
    },

    playFanfare() {
        if (!this.soundEnabled) return;
        this.resume();
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
            this.playEnvTone(freq, { type: 'triangle', start: i * 0.11, attack: 0.03, decay: 0.38, peak: 0.26 });
        });
    },

    playPrestige() {
        if (!this.soundEnabled) return;
        this.resume();
        this.playEnvTone(800, { type: 'triangle', attack: 0.06, decay: 0.5, peak: 0.2, endFreq: 80 });
        [261.63, 329.63, 392.0, 523.25].forEach((freq) => {
            this.playEnvTone(freq, { type: 'sine', start: 0.5, attack: 0.25, decay: 1.35, peak: 0.16 });
        });
    },

    playUIHover() {
        if (!this.soundEnabled) return;
        this.resume();
        this.playEnvTone(900, { type: 'sine', attack: 0.02, decay: 0.05, peak: 0.045, cutoff: 2200 });
    },

    playUIClick() {
        if (!this.soundEnabled) return;
        this.resume();
        this.playEnvTone(500, { type: 'triangle', attack: 0.014, decay: 0.07, peak: 0.12, endFreq: 350, cutoff: 2600 });
    },

    // ---- фоновая музыка: медленно "плывущие" аккорды, не мелодия по кругу ----
    startMusic() {
        this.ensureContext();
        if (!this.ctx || this.musicPlaying || !this.musicEnabled) return;
        this.musicPlaying = true;
        this.scheduleNextChord();
    },

    scheduleNextChord() {
        if (!this.musicPlaying || !this.ctx) return;

        const chord = MUSIC_CHORDS[this.musicChordIndex % MUSIC_CHORDS.length];
        this.musicChordIndex++;
        const dur = 9;

        chord.forEach((freq, i) => {
            this.playEnvTone(freq, {
                type: i === 0 ? 'sine' : 'triangle',
                attack: dur * 0.35,
                hold: 0,
                decay: dur * 0.65,
                peak: i === 0 ? 0.07 : 0.05,
                detune: (Math.random() - 0.5) * 6,
                destination: this.musicGain
            });
        });

        this.musicTimer = setTimeout(() => this.scheduleNextChord(), (dur - 2) * 1000);
    },

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicTimer) {
            clearTimeout(this.musicTimer);
            this.musicTimer = null;
        }
        // Уже запущенные ноты сами угасают по своей огибающей — обрывать резко не нужно
    }
};

// Браузеры не дадут звуку заиграть до первого жеста пользователя — ловим
// самое первое касание/клик на странице и на этом же тике "открываем" звук
function unlockAudioOnce() {
    window.AudioState.ensureContext();
    window.AudioState.resume();
    window.AudioState.applyMusicState();
    document.removeEventListener('pointerdown', unlockAudioOnce);
    document.removeEventListener('touchstart', unlockAudioOnce);
}
document.addEventListener('pointerdown', unlockAudioOnce);
document.addEventListener('touchstart', unlockAudioOnce);

// Требование Яндекс Игр: звук останавливается при потере фокуса вкладки
document.addEventListener('visibilitychange', () => {
    if (!window.AudioState.ctx) return;
    if (document.hidden) {
        window.AudioState.ctx.suspend();
    } else if (window.AudioState.soundEnabled || window.AudioState.musicEnabled) {
        window.AudioState.ctx.resume();
    }
});
