// util.js — общие маленькие помощники: математика, цвета, форматирование чисел.
// Все модули игры живут в одном пространстве имён window.R, чтобы не засорять
// глобальную область и чтобы файлы можно было подключать обычными <script>
// (так игра открывается даже двойным кликом по index.html, без сервера)

(function (root) {
    const R = root.R = root.R || {};

    const U = R.util = {};

    U.clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));
    U.lerp = (a, b, t) => a + (b - a) * t;
    U.rand = (a, b) => a + Math.random() * (b - a);
    U.randInt = (a, b) => Math.floor(U.rand(a, b + 1));
    U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    U.easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    U.easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
    U.easeOutBack = (t) => {
        const c1 = 1.70158, c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };

    // ---- Цвета: храним как '#rrggbb', смешиваем в RGB ----
    U.hexToRgb = (hex) => {
        const h = hex.replace('#', '');
        const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    U.rgbToHex = (r, g, b) => '#' + [r, g, b]
        .map(v => U.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
    U.mix = (hexA, hexB, t) => {
        const a = U.hexToRgb(hexA), b = U.hexToRgb(hexB);
        return U.rgbToHex(U.lerp(a[0], b[0], t), U.lerp(a[1], b[1], t), U.lerp(a[2], b[2], t));
    };
    U.rgba = (hex, alpha) => {
        const c = U.hexToRgb(hex);
        return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
    };
    // Осветлить (t>0, к белому) или затемнить (t<0, к чёрному)
    U.shade = (hex, t) => (t >= 0 ? U.mix(hex, '#ffffff', t) : U.mix(hex, '#000000', -t));

    // ---- Даты: ключ дня для ежедневных заданий и подарка ----
    U.dayKey = (time) => {
        const d = new Date(time);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };
    U.daysBetween = (keyA, keyB) => {
        const a = new Date(keyA + 'T00:00:00'), b = new Date(keyB + 'T00:00:00');
        return Math.round((b - a) / 86400000);
    };

    // ---- Форматирование больших чисел ----
    // Короткие суффиксы: до триллионов — словами, дальше — буквенные aa, ab...
    // (как в большинстве idle-игр: числа растут очень быстро)
    const SUFFIXES = {
        ru: ['', ' тыс', ' млн', ' млрд', ' трлн', ' квдр', ' квнт', ' скст', ' сптл', ' октл', ' нонл', ' децл'],
        en: ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']
    };

    function letterSuffix(index) {
        // index 0 -> 'aa', 1 -> 'ab' ...
        const a = 'abcdefghijklmnopqrstuvwxyz';
        return a[Math.floor(index / 26) % 26] + a[index % 26];
    }

    // fmt(12345) -> "12,3 тыс" / "12.3K". Дробная часть без лишних нулей:
    // 130000 -> "130 тыс", а не "13 тыс" (старый баг из первой версии)
    U.fmt = (num, lang) => {
        lang = lang || (R.i18n ? R.i18n.lang : 'ru');
        if (num !== num) { console.warn('fmt: не число'); return '0'; }
        if (!isFinite(num)) return '∞';
        const sign = num < 0 ? '-' : '';
        let abs = Math.abs(num);
        if (abs < 1000) {
            // Маленькие дробные числа (доход 0.5/сек) показываем с одной цифрой
            // Меньше единицы — с одной цифрой после запятой (0,5), иначе целые
            const s = abs < 1 && abs > 0 ? (Math.floor(abs * 10) / 10).toString() : Math.floor(abs).toString();
            return sign + (lang === 'ru' ? s.replace('.', ',') : s);
        }
        const tier = Math.floor(Math.log10(abs) / 3);
        const short = abs / Math.pow(1000, tier);
        const digits = short < 10 ? 2 : (short < 100 ? 1 : 0);
        // Округляем вниз, чтобы "999,99 тыс" не превращалось в "1000 тыс"
        const p = Math.pow(10, digits);
        let text = (Math.floor(short * p) / p).toFixed(digits);
        if (text.includes('.')) text = text.replace(/0+$/, '').replace(/\.$/, '');
        if (lang === 'ru') text = text.replace('.', ',');
        const list = SUFFIXES[lang] || SUFFIXES.en;
        const suffix = tier < list.length ? list[tier] : (lang === 'ru' ? ' ' : '') + letterSuffix(tier - list.length);
        return sign + text + suffix;
    };

    // Целое число с разделителями разрядов: 1234567 -> "1 234 567"
    U.fmtInt = (num) => Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

    // Время "1:05", "12:30", "1 ч 20 мин"
    U.fmtTime = (ms) => {
        const s = Math.max(0, Math.ceil(ms / 1000));
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
        if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
        return m + ':' + String(sec).padStart(2, '0');
    };

    // Простая шина событий: модули сообщают о важном (покупка, новая эпоха...),
    // а звук/интерфейс/достижения подписываются, не зная друг о друге
    const listeners = {};
    R.on = (name, fn) => { (listeners[name] = listeners[name] || []).push(fn); };
    R.emit = (name, data) => {
        (listeners[name] || []).forEach(fn => {
            try { fn(data); } catch (e) { console.error('Ошибка в обработчике события', name, e); }
        });
    };
})(typeof window !== 'undefined' ? window : globalThis);
