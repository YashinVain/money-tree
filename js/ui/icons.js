// icons.js — значки интерфейса в формате SVG (вектор: чёткие на любом экране).
// R.icon('gear') возвращает строку <svg>, которую можно вставить в HTML.
// Картинки зверят, цветов и деревьев берутся из рисунков сада (scene.portrait).

(function (root) {
    const R = root.R = root.R || {};

    const S = (body, vb = '0 0 48 48') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
    const line = 'stroke="#5a3a1f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';

    const ICONS = {
        // Дерево (вкладка)
        tree: S(`<rect x="20" y="26" width="8" height="16" rx="3" fill="#a8703f" ${line}/>
            <circle cx="24" cy="20" r="14" fill="#6fcf4f" ${line}/>
            <circle cx="19" cy="15" r="4.5" fill="#a8ec7a"/>
            <circle cx="30" cy="22" r="2.6" fill="#ff5a5a"/><circle cx="18" cy="25" r="2.6" fill="#ff5a5a"/>`),
        // Лапка (зверята)
        paw: S(`<ellipse cx="24" cy="31" rx="10" ry="8.5" fill="#c08a5a" ${line}/>
            <circle cx="12" cy="20" r="4.5" fill="#c08a5a" ${line}/><circle cx="19" cy="13" r="4.5" fill="#c08a5a" ${line}/>
            <circle cx="29" cy="13" r="4.5" fill="#c08a5a" ${line}/><circle cx="36" cy="20" r="4.5" fill="#c08a5a" ${line}/>
            <ellipse cx="21" cy="28" rx="3" ry="2" fill="#e8b88a"/>`),
        // Цветок
        flower: S(`<path d="M24 30 L24 44" ${line} fill="none"/>
            <path d="M24 38 q-8 -2 -10 -8 q7 0 10 8z" fill="#6fcf4f" ${line}/>
            <g ${line}><circle cx="24" cy="11" r="6" fill="#ff8fc8"/><circle cx="33" cy="18" r="6" fill="#ff8fc8"/>
            <circle cx="29" cy="28" r="6" fill="#ff8fc8"/><circle cx="19" cy="28" r="6" fill="#ff8fc8"/><circle cx="15" cy="18" r="6" fill="#ff8fc8"/></g>
            <circle cx="24" cy="20" r="5.5" fill="#ffd23f" ${line}/>`),
        // Новый сад — росток в круговой стрелке
        garden: S(`<path d="M10 22 a14 14 0 0 1 25 -8" fill="none" ${line}/><path d="M36 6 l-1 9 -8 -2" fill="none" ${line}/>
            <path d="M38 26 a14 14 0 0 1 -25 8" fill="none" ${line}/><path d="M12 42 l1 -9 8 2" fill="none" ${line}/>
            <path d="M24 31 v-9" ${line}/><path d="M24 24 q-7 -1 -8 -7 q7 0 8 7z" fill="#7ed957" ${line}/>
            <path d="M24 22 q6 -1 8 -6 q-7 -1 -8 6z" fill="#a8ec7a" ${line}/>`),
        // Подарок
        gift: S(`<rect x="8" y="20" width="32" height="22" rx="4" fill="#ff7ba8" ${line}/>
            <rect x="6" y="14" width="36" height="9" rx="3" fill="#ff9fc2" ${line}/>
            <path d="M24 14 v28" stroke="#ffd23f" stroke-width="5"/><path d="M24 14 v28" ${line} stroke-width="1.2"/>
            <path d="M24 14 c-4 -9 -14 -8 -11 -2 c2 3 8 2 11 2z M24 14 c4 -9 14 -8 11 -2 c-2 3 -8 2 -11 2z" fill="#ffd23f" ${line}/>`),
        // Кубок (цели)
        trophy: S(`<path d="M14 8 h20 v10 a10 10 0 0 1 -20 0z" fill="#ffd23f" ${line}/>
            <path d="M14 11 h-6 a6 6 0 0 0 8 10 M34 11 h6 a6 6 0 0 1 -8 10" fill="none" ${line}/>
            <path d="M24 28 v6" ${line}/><rect x="15" y="34" width="18" height="7" rx="2" fill="#c98a4b" ${line}/>
            <path d="M19 13 v5" stroke="#fff6b0" stroke-width="3" stroke-linecap="round"/>`),
        // Шестерёнка
        gear: S(`<path d="M24 6 l3.5 4.5 5.5 -1.5 1.5 5.5 4.5 3.5 -2.5 5 2.5 5 -4.5 3.5 -1.5 5.5 -5.5 -1.5 -3.5 4.5 -3.5 -4.5 -5.5 1.5 -1.5 -5.5 -4.5 -3.5 2.5 -5 -2.5 -5 4.5 -3.5 1.5 -5.5 5.5 1.5z" fill="#9fd6ff" ${line}/>
            <circle cx="24" cy="24" r="6.5" fill="#fffaf0" ${line}/>`),
        close: S(`<path d="M14 14 L34 34 M34 14 L14 34" ${line} stroke-width="5"/>`),
        lock: S(`<rect x="11" y="21" width="26" height="20" rx="4" fill="#c9b8a0" ${line}/>
            <path d="M16 21 v-5 a8 8 0 0 1 16 0 v5" fill="none" ${line}/><circle cx="24" cy="30" r="3" fill="#5a3a1f"/>`),
        check: S(`<circle cx="24" cy="24" r="17" fill="#5cc94f" ${line}/><path d="M15 24 l6 6 12 -13" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`),
        // Видео (за рекламу)
        video: S(`<rect x="5" y="11" width="38" height="26" rx="6" fill="#4fc3ff" ${line}/><path d="M20 18 l10 6 -10 6z" fill="#ffffff" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>`),
        timer: S(`<circle cx="24" cy="26" r="15" fill="#fffaf0" ${line}/><path d="M24 26 v-8 M24 26 l6 3" ${line}/><path d="M19 6 h10 M24 6 v5" ${line}/>`),
        sound: S(`<path d="M8 19 h8 l10 -9 v28 l-10 -9 h-8z" fill="#ffd23f" ${line}/><path d="M32 17 q5 7 0 14 M36 12 q9 12 0 24" fill="none" ${line}/>`),
        soundOff: S(`<path d="M8 19 h8 l10 -9 v28 l-10 -9 h-8z" fill="#d8cfc0" ${line}/><path d="M32 18 l10 12 M42 18 l-10 12" ${line}/>`),
        music: S(`<path d="M18 34 v-22 l20 -5 v22" fill="none" ${line}/><ellipse cx="14" cy="35" rx="6" ry="5" fill="#ff8fc8" ${line}/><ellipse cx="34" cy="30" rx="6" ry="5" fill="#ff8fc8" ${line}/>`),
        musicOff: S(`<path d="M18 34 v-22 l20 -5 v22" fill="none" ${line} opacity=".5"/><ellipse cx="14" cy="35" rx="6" ry="5" fill="#d8cfc0" ${line}/><ellipse cx="34" cy="30" rx="6" ry="5" fill="#d8cfc0" ${line}/><path d="M8 8 L40 40" ${line}/>`),
        globe: S(`<circle cx="24" cy="24" r="17" fill="#7fd0ff" ${line}/><path d="M7 24 h34 M24 7 c-9 9 -9 25 0 34 c9 -9 9 -25 0 -34" fill="none" ${line}/>`),
        chart: S(`<rect x="8" y="26" width="8" height="14" rx="2" fill="#ff9f43" ${line}/><rect x="20" y="16" width="8" height="24" rx="2" fill="#5cc94f" ${line}/><rect x="32" y="8" width="8" height="32" rx="2" fill="#4fc3ff" ${line}/>`),
        crown: S(`<path d="M7 34 l3 -20 9 9 5 -13 5 13 9 -9 3 20z" fill="#ffd23f" ${line}/><rect x="7" y="34" width="34" height="6" rx="2" fill="#f0a81c" ${line}/>`),
        user: S(`<circle cx="24" cy="17" r="8" fill="#ffd9a8" ${line}/><path d="M9 41 a15 13 0 0 1 30 0z" fill="#7fd0ff" ${line}/>`),
        up: S(`<path d="M24 8 l14 15 h-8 v16 h-12 v-16 h-8z" fill="#7ed957" ${line}/>`),
        tap: S(`<path d="M20 26 v-14 a3.5 3.5 0 0 1 7 0 v10 l8 2 a5 5 0 0 1 4 6 l-2 9 h-16 l-7 -9 a3 3 0 0 1 4 -4z" fill="#ffd9a8" ${line}/>`),
        rainbow: S(`<path d="M6 36 a18 18 0 0 1 36 0" fill="none" stroke="#ff5a5a" stroke-width="4"/><path d="M10 36 a14 14 0 0 1 28 0" fill="none" stroke="#ffd93d" stroke-width="4"/><path d="M14 36 a10 10 0 0 1 20 0" fill="none" stroke="#6bdc5a" stroke-width="4"/><path d="M18 36 a6 6 0 0 1 12 0" fill="none" stroke="#4fc3ff" stroke-width="4"/>`),
        bolt: S(`<path d="M27 5 l-14 22 h10 l-3 16 15 -23 h-10z" fill="#ffd23f" ${line}/>`),
        bag: S(`<path d="M16 14 l-3 -6 h22 l-3 6" fill="#d9a066" ${line}/><path d="M16 14 h16 c8 6 10 14 8 20 c-2 6 -8 8 -16 8 s-14 -2 -16 -8 c-2 -6 0 -14 8 -20z" fill="#e8b878" ${line}/><circle cx="24" cy="29" r="6" fill="#ffd23f" ${line}/>`),
        basket: S(`<path d="M10 22 a14 12 0 0 1 28 0" fill="none" ${line}/><path d="M6 22 h36 l-4 18 h-28z" fill="#d9a066" ${line}/><path d="M14 22 l2 18 M24 22 v18 M34 22 l-2 18" stroke="#8a5a2a" stroke-width="2"/><circle cx="18" cy="19" r="4" fill="#ff5a5a" ${line}/><circle cx="29" cy="18" r="4" fill="#ffd23f" ${line}/>`),
        x2: S(`<circle cx="24" cy="24" r="18" fill="#ffd23f" ${line}/><text x="24" y="31" text-anchor="middle" font-family="Trebuchet MS,Arial" font-weight="900" font-size="19" fill="#5a3a1f">x2</text>`),
        star: S(`<path d="M24 5 l5.5 12 13 1.5 -9.7 8.7 2.8 12.8 -11.6 -6.7 -11.6 6.7 2.8 -12.8 -9.7 -8.7 13 -1.5z" fill="#ffd23f" ${line}/>`),
        // Бонусы нового сада
        can: S(`<path d="M10 20 h20 l-2 20 h-16z" fill="#4fc3ff" ${line}/><path d="M30 24 l12 -8" ${line}/><circle cx="43" cy="15" r="3" fill="#9fd6ff" ${line}/><path d="M14 20 a6 6 0 0 1 12 0" fill="none" ${line}/><path d="M38 24 v4 M42 22 v5" stroke="#4fc3ff" stroke-width="2.5" stroke-linecap="round"/>`),
        fertilizer: S(`<path d="M12 14 h24 l3 26 h-30z" fill="#a8703f" ${line}/><path d="M12 14 l4 -6 h16 l4 6" fill="#c98a4b" ${line}/><path d="M24 34 v-8 M24 28 q-5 0 -6 -5 q5 0 6 5z M24 27 q5 -1 6 -5 q-5 0 -6 5z" fill="#7ed957" ${line} stroke-width="2"/>`),
        bed: S(`<rect x="6" y="28" width="36" height="12" rx="3" fill="#a8703f" ${line}/><path d="M14 28 v-7 M24 28 v-9 M34 28 v-7" ${line}/><circle cx="14" cy="18" r="4" fill="#7ed957" ${line} stroke-width="2"/><circle cx="24" cy="16" r="4.5" fill="#7ed957" ${line} stroke-width="2"/><circle cx="34" cy="18" r="4" fill="#7ed957" ${line} stroke-width="2"/>`),
        net: S(`<circle cx="18" cy="18" r="12" fill="rgba(255,255,255,.7)" ${line}/><path d="M10 12 l16 12 M8 20 l18 -8 M18 6 v24" stroke="#bfae98" stroke-width="1.6"/><path d="M27 27 l14 14" ${line} stroke-width="4"/>`),
        diary: S(`<rect x="10" y="6" width="28" height="36" rx="4" fill="#5cc94f" ${line}/><path d="M16 6 v36" ${line}/><path d="M22 16 h10 M22 22 h10" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><circle cx="27" cy="32" r="4" fill="#ffd23f" ${line} stroke-width="2"/>`),
        piggy: S(`<ellipse cx="24" cy="27" rx="15" ry="12" fill="#ff9fc2" ${line}/><circle cx="38" cy="25" r="5" fill="#ffb3cf" ${line}/><path d="M15 17 l2 -6 5 4" fill="#ff9fc2" ${line}/><path d="M17 37 v4 M31 37 v4" ${line}/><path d="M20 15 h8" stroke="#5a3a1f" stroke-width="3" stroke-linecap="round"/><circle cx="30" cy="22" r="1.8" fill="#5a3a1f"/>`),
        question: S(`<circle cx="24" cy="24" r="17" fill="#d8cfc0" ${line}/><path d="M18 19 a6 6 0 1 1 9 5 c-2 1 -3 2 -3 5" fill="none" ${line}/><circle cx="24" cy="35" r="2" fill="#5a3a1f"/>`)
    };

    R.icon = (name) => ICONS[name] || '';
})(typeof window !== 'undefined' ? window : globalThis);
