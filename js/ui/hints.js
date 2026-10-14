// hints.js — обучение без скучных слайдов: подсказки появляются ровно тогда,
// когда что-то становится доступно (хватает монет, набралась радуга,
// прилетела бабочка), и показывают пальчиком, куда нажать. Каждая — один раз.
// Пузырь подсказки никогда не закрывает то, на что указывает, и важные кнопки.

(function (root) {
    const R = root.R = root.R || {};
    const G = R.game;
    const UI = R.ui;
    const H = R.hints = { current: null, goalsOpened: false };

    let bubble, hand;

    const seen = (id) => !!G.S.hints[id];
    const mark = (id) => { G.S.hints[id] = 1; R.save.mark(); };

    // Прямоугольник элемента на экране (или null, если его не видно)
    const rectOf = (e) => {
        if (!e || !e.offsetParent) return null;
        const r = e.getBoundingClientRect();
        return r.width ? r : null;
    };
    const el = (sel) => () => {
        const r = rectOf(document.querySelector(sel));
        return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2, rect: r } : null;
    };
    const tabEl = (id) => el(`.tab[data-tab="${id}"]`);
    // Цель внутри панели: если панель этой вкладки открыта — кнопка в ней, иначе — сама вкладка
    const inPanel = (tab, sel) => () => (UI.sheetOpen && UI.tab === tab ? el(sel)() : tabEl(tab)());

    // Порядок важен: показываем первую подходящую подсказку
    const LIST = [
        {
            id: 'tap',
            when: () => G.S.stats.taps < 6,
            text: () => R.t(G.stageIndex() === 0 ? 'hint_tap_seed' : 'hint_tap'),
            target: () => { const p = R.scene.treePoint(); return { x: p.x, y: p.y, rect: { left: p.x - 50, right: p.x + 50, top: p.top, bottom: p.bottom } }; },
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
            tab: 'tree',
            when: () => G.S.stats.buys === 0 && G.S.coins >= G.treePrice(),
            text: () => (UI.sheetOpen && UI.tab === 'tree' ? R.t('hint_upgrade_buy') : R.t('hint_upgrade')),
            target: inPanel('tree', '[data-a="grow"]'),
            done: () => G.S.level > 0
        },
        {
            id: 'helper',
            tab: 'helpers',
            when: () => G.S.helpers[0] === 0 && G.S.level >= 3 && G.S.coins >= G.helperPrice(0),
            text: () => R.t('hint_helper'),
            target: inPanel('helpers', '[data-a="hire:0"]'),
            done: () => G.S.helpers[0] > 0
        },
        {
            id: 'comet',
            when: () => R.scene.cometVisible(),
            text: () => R.t('hint_comet'),
            target: () => { const p = R.scene.cometPoint(); return p ? { x: p.x, y: p.y, rect: { left: p.x - 40, right: p.x + 40, top: p.top, bottom: p.bottom } } : null; },
            done: () => G.S.stats.comets > 0 || !R.scene.cometVisible()
        },
        {
            id: 'prestige',
            tab: 'garden',
            when: () => G.canPrestige() && G.seedsOnPrestige() >= 5 && G.S.prestiges === 0,
            text: () => R.t('hint_prestige'),
            target: tabEl('garden'),
            hideWhenSheet: true,
            done: () => UI.sheetOpen && UI.tab === 'garden'
        },
        {
            id: 'gift',
            tab: 'bonus',
            when: () => G.S.stats.playMs > 50000 && R.meta.giftAvailable(),
            text: () => R.t('hint_gift'),
            target: tabEl('bonus'),
            hideWhenSheet: true,
            done: () => UI.sheetOpen && UI.tab === 'bonus'
        },
        {
            id: 'goals',
            when: () => G.S.stats.playMs > 110000,
            text: () => R.t('hint_goals'),
            target: el('#btn-goals'),
            hideWhenSheet: true,
            done: () => H.goalsOpened
        }
    ];

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
        }
        const portraitSheet = UI.mode === 'portrait' && UI.sheetOpen;
        // Не показываем поверх чужой вкладки и не мешаем, пока открыта панель
        if (portraitSheet && (cur.hideWhenSheet || (cur.tab && UI.tab !== cur.tab))) { H.hide(); return; }
        const tg = cur.target();
        if (!tg) { H.hide(); return; }
        place(cur.text(), tg);
    };

    const overlap = (a, b) => a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

    function place(text, tg) {
        if (bubble.textContent !== text) bubble.textContent = text;
        bubble.classList.remove('hidden');
        hand.classList.remove('hidden');
        const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
        const W = root.innerWidth, Hh = root.innerHeight;
        const x = Math.max(10, Math.min(W - bw - 10, tg.x - bw / 2));
        // То, что нельзя закрывать: сама цель, кнопки под пальцем, открытая панель
        const avoid = [tg.rect, rectOf(document.getElementById('btn-rainbow')), rectOf(document.getElementById('btn-grow'))];
        const panel = rectOf(document.getElementById('panel'));
        const targetInPanel = panel && tg.y > panel.top && tg.y < panel.bottom && tg.x > panel.left && tg.x < panel.right;
        if (targetInPanel && UI.mode === 'portrait') avoid.push(panel);
        const box = (y) => ({ left: x, right: x + bw, top: y, bottom: y + bh });
        const tr = tg.rect;
        // Кандидаты: над целью, под целью, над панелью, у верхнего края сада
        const candidates = [tr.top - bh - 40, tr.bottom + 44];
        if (panel) candidates.push(panel.top - bh - 12);
        candidates.push(90);
        let y = candidates.find(c => c >= 8 && c + bh <= Hh - 8 && !avoid.some(r => overlap(box(c), r)));
        if (y === undefined) y = Math.max(8, Math.min(Hh - bh - 8, tr.top - bh - 40));
        bubble.style.left = x + 'px';
        bubble.style.top = y + 'px';
        hand.style.left = tg.x + 'px';
        hand.style.top = tg.y + 'px';
    }
})(typeof window !== 'undefined' ? window : globalThis);
