// hints.js — обучение без скучных слайдов: подсказки появляются ровно тогда,
// когда что-то становится доступно (хватает монет, набралась радуга,
// прилетела бабочка), и показывают пальчиком, куда нажать. Каждая — один раз.

(function (root) {
    const R = root.R = root.R || {};
    const G = R.game;
    const UI = R.ui;
    const H = R.hints = { current: null };

    let bubble, hand;
    let shownAt = 0;

    const seen = (id) => !!G.S.hints[id];
    const mark = (id) => { G.S.hints[id] = 1; R.save.mark(); };

    // Куда показывать: элемент интерфейса или точка в саду
    const el = (sel) => () => {
        const e = document.querySelector(sel);
        if (!e || !e.offsetParent) return null;
        const r = e.getBoundingClientRect();
        if (r.width === 0) return null;
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top, bottom: r.bottom };
    };
    const tabEl = (id) => el(`.tab[data-tab="${id}"]`);
    const inPanel = (tab, sel) => () => (UI.sheetOpen && UI.tab === tab ? el(sel)() : tabEl(tab)());

    // Порядок важен: показываем первую подходящую подсказку
    const LIST = [
        {
            id: 'tap',
            when: () => G.S.stats.taps < 6,
            text: () => R.t('hint_tap'),
            target: () => R.scene.treePoint(),
            done: () => G.S.stats.taps >= 6
        },
        {
            id: 'release',
            when: () => G.canRelease(),
            text: () => R.t('hint_release'),
            target: el('#btn-rainbow'),
            hideWhenSheet: true
        },
        {
            id: 'upgrade',
            when: () => G.S.stats.buys === 0 && G.S.coins >= G.treePrice(),
            text: () => (UI.sheetOpen && UI.tab === 'tree' ? R.t('hint_upgrade_buy') : R.t('hint_upgrade')),
            target: inPanel('tree', '[data-a="grow"]'),
            done: () => G.S.level > 0
        },
        {
            id: 'helper',
            when: () => G.S.helpers[0] === 0 && G.S.level >= 3 && G.S.coins >= G.helperPrice(0),
            text: () => R.t('hint_helper'),
            target: inPanel('helpers', '[data-a="hire:0"]'),
            done: () => G.S.helpers[0] > 0
        },
        {
            id: 'comet',
            when: () => R.scene.cometVisible(),
            text: () => R.t('hint_comet'),
            target: () => R.scene.cometPoint(),
            done: () => G.S.stats.comets > 0 || !R.scene.cometVisible()
        },
        {
            id: 'prestige',
            when: () => G.canPrestige() && G.seedsOnPrestige() >= 1 && G.S.prestiges === 0,
            text: () => R.t('hint_prestige'),
            target: tabEl('garden'),
            done: () => UI.sheetOpen && UI.tab === 'garden'
        },
        {
            id: 'gift',
            when: () => G.S.stats.playMs > 50000 && R.meta.giftAvailable(),
            text: () => R.t('hint_gift'),
            target: tabEl('bonus'),
            done: () => UI.sheetOpen && UI.tab === 'bonus'
        },
        {
            id: 'goals',
            when: () => G.S.stats.playMs > 110000,
            text: () => R.t('hint_goals'),
            target: el('#btn-goals'),
            done: () => H.goalsOpened
        }
    ];

    H.goalsOpened = false;

    H.init = () => {
        bubble = document.getElementById('hint');
        hand = document.getElementById('hand');
        hand.innerHTML = R.icon('tap');
        R.on('release', () => { if (H.current && H.current.id === 'release') H.finish(); });
    };

    H.hide = () => {
        bubble.classList.add('hidden');
        hand.classList.add('hidden');
    };

    H.finish = () => {
        if (H.current) mark(H.current.id);
        H.current = null;
        H.hide();
    };

    H.update = () => {
        if (!R.main || !R.main.playing || UI.hasModal()) { H.hide(); return; }
        let cur = H.current;
        if (cur && cur.done && cur.done()) { H.finish(); cur = null; }
        if (cur && !cur.done && !cur.when()) { H.current = null; H.hide(); cur = null; }
        if (!cur) {
            cur = LIST.find(h => !seen(h.id) && h.when());
            if (!cur) { H.hide(); return; }
            H.current = cur;
            shownAt = performance.now();
        }
        if (cur.hideWhenSheet && UI.mode === 'portrait' && UI.sheetOpen) { H.hide(); return; }
        const tg = cur.target();
        if (!tg) { H.hide(); return; }
        place(cur.text(), tg);
    };

    function place(text, tg) {
        if (bubble.textContent !== text) bubble.textContent = text;
        bubble.classList.remove('hidden');
        hand.classList.remove('hidden');
        const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
        const W = root.innerWidth, Hh = root.innerHeight;
        const top = tg.top !== undefined ? tg.top : tg.y - 30;
        const bottom = tg.bottom !== undefined ? tg.bottom : tg.y + 30;
        // Над целью, если хватает места, иначе под ней
        let y = top - bh - 46;
        if (y < 70) y = bottom + 52;
        if (y + bh > Hh - 10) y = Math.max(10, Hh - bh - 10);
        // Не закрываем кнопку радуги: если пересекаемся с ней — поднимаемся выше
        const rb = document.getElementById('btn-rainbow').getBoundingClientRect();
        if (rb.width && y < rb.bottom && y + bh > rb.top && !(tg.y > rb.top && tg.y < rb.bottom)) y = rb.top - bh - 12;
        const x = Math.max(10, Math.min(W - bw - 10, tg.x - bw / 2));
        bubble.style.left = x + 'px';
        bubble.style.top = y + 'px';
        hand.style.left = tg.x + 'px';
        hand.style.top = tg.y + 'px';
    }
})(typeof window !== 'undefined' ? window : globalThis);
