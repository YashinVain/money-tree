// ui.js — каркас интерфейса поверх сада: раскладка (телефон/компьютер),
// верхняя панель с монетками, вкладки, выезжающая панель, окна и всплывашки.
// Содержимое вкладок — в panels.js, подсказки обучения — в hints.js.

(function (root) {
    const R = root.R = root.R || {};
    const U = R.util;
    const G = R.game;
    const UI = R.ui = {};

    const $ = (sel, el = document) => el.querySelector(sel);
    UI.$ = $;

    UI.tab = 'tree';             // открытая вкладка
    UI.sheetOpen = false;        // открыта ли панель (на телефоне)
    UI.mode = 'portrait';
    UI.pics = {};                // картинки из рисунков сада: UI.pics['helper:bee']

    let shownCoins = 0;
    let lastPanelSig = '';
    let lastPanelTab = '';

    // ---------- Картинки ----------
    UI.pic = (kind, id) => {
        const key = kind + ':' + id;
        if (!UI.pics[key]) UI.pics[key] = R.scene.portrait(kind, id, 64);
        return UI.pics[key];
    };
    UI.img = (kind, id, cls = '') => `<img class="${cls}" src="${UI.pic(kind, id)}" alt="">`;
    UI.coinImg = () => UI.img('coin', 0);
    UI.seedImg = () => UI.img('seed', 0);
    UI.price = (n, seeds) => `<span class="price">${seeds ? UI.seedImg() : UI.coinImg()}${U.fmt(n)}</span>`;

    // ---------- Раскладка ----------
    UI.layout = () => {
        const w = root.innerWidth, h = root.innerHeight;
        const landscape = w / h > 1.12 && w >= 640;
        UI.mode = landscape ? 'landscape' : 'portrait';
        document.body.classList.toggle('landscape', landscape);
        document.body.classList.toggle('portrait', !landscape);

        // Масштаб интерфейса: на маленьких телефонах чуть мельче, на больших экранах крупнее
        const s = landscape ? U.clamp(Math.min(w / 1280, h / 760), 0.82, 1.25) : U.clamp(Math.min(w / 420, h / 820), 0.82, 1.2);
        document.documentElement.style.setProperty('--s', s.toFixed(3));
        const panelW = Math.round(U.clamp(w * 0.36, 340, 480));
        document.documentElement.style.setProperty('--panel-w', panelW + 'px');
        const tabbar = h < 520 ? 60 : Math.round(74 * Math.min(1.1, s));
        document.documentElement.style.setProperty('--tabbar', tabbar + 'px');
        document.documentElement.style.setProperty('--sheet-h', Math.round(h * (h < 700 ? 0.52 : 0.55)) + 'px');

        if (landscape) UI.sheetOpen = true;
        document.body.classList.toggle('sheet-open', UI.sheetOpen);
        UI.positionChip();
        UI.updateView();
    };

    // Сообщаем саду, где оставить место под дерево
    UI.updateView = () => {
        const w = root.innerWidth, h = root.innerHeight;
        const hud = $('#hud').getBoundingClientRect();
        const top = hud.bottom + 34;
        let rect;
        if (UI.mode === 'landscape') {
            const pw = $('#panel').offsetWidth + 20;
            const controlsH = 110;
            rect = { x: 0, y: top, w: w - pw, h: h - top - controlsH };
        } else {
            const tabbar = $('#tabs').getBoundingClientRect();
            let bottom;
            if (UI.sheetOpen) {
                const sheetH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sheet-h')) || h * 0.55;
                bottom = tabbar.top - sheetH - 14;
            } else {
                bottom = tabbar.top - 96;
            }
            rect = { x: 0, y: top, w, h: Math.max(120, bottom - top) };
        }
        const coin = $('#coin-ico').getBoundingClientRect();
        R.scene.setView(rect, { x: coin.left + coin.width / 2, y: coin.top + coin.height / 2 });
    };

    UI.positionChip = () => {
        const chip = $('#stage-chip');
        const hud = $('#hud');
        if (!chip || !hud) return;
        chip.style.top = (hud.getBoundingClientRect().bottom + 2) + 'px';
        if (UI.mode === 'landscape') {
            const pw = $('#panel').offsetWidth + 20;
            chip.style.left = ((root.innerWidth - pw) / 2) + 'px';
        } else {
            chip.style.left = '50%';
        }
    };

    // ---------- Вкладки и панель ----------
    UI.tabs = [
        { id: 'tree', icon: 'tree', label: 'tab_tree' },
        { id: 'helpers', icon: 'paw', label: 'tab_helpers' },
        { id: 'flowers', icon: 'flower', label: 'tab_flowers' },
        { id: 'garden', icon: 'garden', label: 'tab_garden' },
        { id: 'bonus', icon: 'gift', label: 'tab_bonus' }
    ];

    UI.buildTabs = () => {
        $('#tabs').innerHTML = UI.tabs.map(t => `
            <button class="tab" data-tab="${t.id}">
                <i class="ti">${R.icon(t.icon)}</i><span>${R.t(t.label)}</span>
                <b class="badge dot hidden"></b>
            </button>`).join('');
        UI.markTab();
    };

    UI.markTab = () => {
        document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === UI.tab && UI.sheetOpen));
    };

    UI.openTab = (id) => {
        if (UI.mode === 'portrait' && UI.sheetOpen && UI.tab === id) {
            UI.closeSheet();
            return;
        }
        UI.tab = id;
        UI.sheetOpen = true;
        document.body.classList.add('sheet-open');
        lastPanelSig = '';
        UI.renderPanel(true);
        UI.markTab();
        UI.updateView();
        R.audio.open();
        R.emit('tabOpen', id);
    };

    UI.closeSheet = () => {
        if (UI.mode === 'landscape') return;
        UI.sheetOpen = false;
        document.body.classList.remove('sheet-open');
        UI.markTab();
        UI.updateView();
    };

    // Перерисовать содержимое панели, если изменилось что-то важное
    UI.renderPanel = (force) => {
        const panel = R.panels[UI.tab];
        if (!panel) return;
        const sig = UI.tab + '|' + R.i18n.lang + '|' + panel.sig();
        const body = $('#panel .panel-body');
        if (force || sig !== lastPanelSig) {
            const scroll = lastPanelTab === UI.tab ? body.scrollTop : 0;
            $('#panel .panel-title').textContent = panel.title();
            body.innerHTML = panel.html();
            body.scrollTop = scroll;
            lastPanelSig = sig;
            lastPanelTab = UI.tab;
        }
        if (panel.patch) panel.patch(body);
    };

    // ---------- Окна ----------
    let modalStack = [];

    // opts: { html, onClose, cls, noClose }
    UI.modal = (opts) => {
        const back = document.createElement('div');
        back.className = 'modal-back';
        back.innerHTML = `<div class="modal ${opts.cls || ''}">${opts.html}</div>`;
        $('#modals').appendChild(back);
        const m = { el: back, opts };
        modalStack.push(m);
        back.addEventListener('click', (e) => {
            if (e.target === back && !opts.noClose) UI.closeModal(m);
            const a = e.target.closest('[data-a]');
            if (a && back.contains(a)) UI.action(a.dataset.a, a, m);
        });
        R.emit('modalOpen');
        return m;
    };

    UI.closeModal = (m) => {
        m = m || modalStack[modalStack.length - 1];
        if (!m) return;
        modalStack = modalStack.filter(x => x !== m);
        m.el.remove();
        if (m.opts.onClose) m.opts.onClose();
        R.emit('modalClose');
    };

    UI.hasModal = () => modalStack.length > 0;
    UI.topModal = () => modalStack[modalStack.length - 1];

    // Красивое окно-праздник: картинка, заголовок, текст, кнопки
    UI.celebrate = ({ art, title, text, big, buttons, rays = true, onClose }) => {
        const btns = (buttons || [{ label: R.t('great'), cls: '', action: 'close' }])
            .map(b => `<button class="btn big wide ${b.cls || ''}" data-a="${b.action}">${b.label}</button>`).join('');
        return UI.modal({
            onClose,
            html: `<div class="modal-hero">${rays ? '<div class="rays"></div>' : ''}
                ${art ? `<div class="art">${art}</div>` : ''}
                <h2>${title}</h2>${text ? `<p>${text}</p>` : ''}${big ? `<div class="big">${big}</div>` : ''}</div>
                <div class="modal-actions">${btns}</div>`
        });
    };

    // ---------- Всплывашки ----------
    // Всплывашки идут по очереди (не больше двух на экране), чтобы не закрывать сад
    const toastQueue = [];
    let toastBusy = false;
    UI.toast = (title, text, picHtml, ms = 2800) => {
        toastQueue.push([title, text, picHtml, ms]);
        if (toastQueue.length > 6) toastQueue.splice(0, toastQueue.length - 6);
        if (!toastBusy) nextToast();
    };
    function nextToast() {
        const item = toastQueue.shift();
        if (!item) { toastBusy = false; return; }
        toastBusy = true;
        showToast(...item);
        setTimeout(nextToast, 650);
    }
    function showToast(title, text, picHtml, ms) {
        const el = document.createElement('div');
        el.className = 'toast';
        el.innerHTML = `${picHtml ? `<div class="pic">${picHtml}</div>` : ''}<div><b>${title}</b>${text ? `<span>${text}</span>` : ''}</div>`;
        const box = $('#toasts');
        box.appendChild(el);
        while (box.children.length > 2) box.firstChild.remove();
        setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, ms);
    }

    // ---------- Действия по кнопкам ----------
    // Кнопки в разметке помечены data-a="действие:аргумент"
    UI.actions = {};
    UI.action = (str, el, modal) => {
        const [name, arg] = str.split(':');
        if (name === 'close') { R.audio.click(); UI.closeModal(modal); return; }
        const fn = UI.actions[name];
        if (fn) fn(arg, el, modal);
    };

    // ---------- Верхняя панель ----------
    UI.buildHud = () => {
        $('#coin-ico').innerHTML = UI.coinImg();
        $('#seed-ico').innerHTML = UI.seedImg();
        $('#btn-goals').innerHTML = R.icon('trophy') + '<b class="badge hidden"></b>';
        $('#btn-settings').innerHTML = R.icon('gear');
        $('#panel .close-btn').innerHTML = R.icon('close');
    };

    let bumpTimer = 0;
    UI.bumpCoins = () => {
        const el = $('#hud .coins');
        el.classList.remove('bump');
        void el.offsetWidth;
        el.classList.add('bump');
        clearTimeout(bumpTimer);
        bumpTimer = setTimeout(() => el.classList.remove('bump'), 260);
    };

    // Значок-счётчик на кнопке
    function setBadge(el, count, dot) {
        if (!el) return;
        el.classList.toggle('hidden', !count);
        if (!dot && count) el.textContent = count > 9 ? '9+' : count;
    }

    UI.updateBadges = () => {
        const b = R.panels.badges();
        document.querySelectorAll('.tab').forEach(t => setBadge(t.querySelector('.badge'), b[t.dataset.tab], true));
        setBadge($('#btn-goals .badge'), b.goals, false);
    };

    // ---------- Каждый кадр ----------
    let slowTimer = 0;
    UI.frame = (dt) => {
        // Плавный счётчик монет: догоняет настоящее значение
        const real = G.S.coins;
        if (Math.abs(real - shownCoins) < 1 || real < shownCoins) shownCoins = real;
        else shownCoins += (real - shownCoins) * Math.min(1, dt * 12);
        $('#coins').textContent = U.fmt(shownCoins);

        slowTimer += dt;
        if (slowTimer < 0.12) return;
        slowTimer = 0;

        $('#cps').textContent = R.t('per_sec', { n: U.fmt(G.incomePerSecShown()) });
        const seedsPill = $('#hud .seeds');
        const showSeeds = G.S.seeds > 0 || G.S.prestiges > 0;
        seedsPill.classList.toggle('hidden', !showSeeds);
        if (showSeeds) $('#seeds').textContent = U.fmt(G.S.seeds);

        // Подпись стадии: картинка, название, полоска уровней
        const st = G.stageIndex();
        const chip = $('#stage-chip');
        const chipKey = st + ':' + R.i18n.lang;
        if (chip.dataset.k !== chipKey) {
            chip.dataset.k = chipKey;
            chip.querySelector('.ci').innerHTML = UI.img('stage', st);
            chip.querySelector('.cn').textContent = R.t('stage_' + R.CFG.stages[st].id);
        }
        chip.querySelector('.mini i').style.width = (G.isMaxed() ? 100 : G.subLevel() / R.CFG.levelsPerStage * 100) + '%';

        UI.updateRainbow();
        UI.updateStatus();
        UI.updateBadges();
        UI.renderPanel(false);
        if (R.hints) R.hints.update();
    };

    // Кнопка радуги: заполнение, готовность, отдых
    UI.updateRainbow = () => {
        const btn = $('#btn-rainbow');
        const fill = G.S.charge / R.CFG.chargeMax;
        const ready = G.canRelease();
        const buff = G.buffActive();
        const cool = !ready && G.cooldownLeft() > 0;
        btn.classList.toggle('ready', ready);
        btn.classList.toggle('cool', cool && !buff);
        btn.querySelector('.fill').style.width = (buff ? 100 : fill * 100) + '%';
        let label;
        if (buff) label = R.t('buff_active', { m: G.buffMultValue(), t: Math.ceil(G.buffLeft() / 1000) });
        else if (ready) label = R.t('release');
        else if (fill >= 1) label = R.t('release_cooldown', { t: Math.ceil(G.cooldownLeft() / 1000) });
        else label = R.t('release_charging', { p: Math.floor(fill * 100) });
        const lab = btn.querySelector('.label');
        if (lab.textContent !== label) lab.textContent = label;
    };

    // Значки активных бонусов над кнопкой радуги
    UI.updateStatus = () => {
        const now = G.now();
        const items = [];
        if (G.frenzyActive()) items.push(`<span class="chip buff"><i>${R.icon('tap')}</i>${R.t('frenzy_active', { m: R.CFG.frenzyMult, t: Math.ceil((G.S.frenzyEnd - now) / 1000) })}</span>`);
        if (G.S.boosts.incomeX2End > now) items.push(`<span class="chip"><i>${R.icon('x2')}</i>${U.fmtTime(G.S.boosts.incomeX2End - now)}</span>`);
        if (G.S.boosts.chargeX2End > now) items.push(`<span class="chip"><i>${R.icon('rainbow')}</i>${U.fmtTime(G.S.boosts.chargeX2End - now)}</span>`);
        const html = items.join('');
        if (html !== lastStatus) { $('#status').innerHTML = html; lastStatus = html; }
    };
    let lastStatus = '';

    UI.setShownCoins = (v) => { shownCoins = v; };
})(typeof window !== 'undefined' ? window : globalThis);
