// main.js — запуск игры и главный цикл. Связывает логику (game), сад (scene),
// интерфейс (ui), звук (audio), сохранения (save) и SDK Яндекса (sdk).

(function (root) {
    const R = root.R;
    const G = R.game;
    const M = R.meta;
    const U = R.util;
    const UI = R.ui;
    const CFG = R.CFG;
    const t = (k, v) => R.t(k, v);

    R.VERSION = '1.0.0';

    const main = R.main = { playing: false, paused: false };
    const $ = (s) => document.querySelector(s);

    let lastFrame = 0;
    let achTimer = 0;
    let saveTimer = 0;
    let wasBuff = false;
    let hiddenAt = 0;

    // ---------- Очередь праздничных окон ----------
    // Если за одну покупку выросла стадия и расцвёл цветок — покажем по очереди
    const queue = [];
    let celebrating = false;

    function enqueue(fn) {
        queue.push(fn);
        if (!celebrating) nextCelebration();
    }
    function nextCelebration() {
        const fn = queue.shift();
        if (!fn) { celebrating = false; updateGameplay(); return; }
        celebrating = true;
        fn(() => setTimeout(nextCelebration, 150));
    }

    // ---------- Разметка геймплея для Яндекса ----------
    // Играет = в саду, вкладка видна, нет рекламы и большого окна
    function updateGameplay() {
        const running = main.playing && !main.paused && !document.hidden && !R.sdk.adOpen && !UI.hasModal();
        R.sdk.setGameplay(running);
    }
    main.updateGameplay = updateGameplay;

    // ---------- Запуск ----------
    async function boot() {
        R.scene.init($('#scene'));
        UI.layout();

        await R.sdk.init();
        await R.save.load();

        const lang = G.S.settings.lang || (R.sdk.lang ? R.i18n.fromPlatform(R.sdk.lang) : (navigator.language || 'ru').slice(0, 2) === 'ru' ? 'ru' : R.i18n.fromPlatform((navigator.language || 'en').slice(0, 2)));
        R.i18n.setLang(lang);
        document.documentElement.lang = R.i18n.lang;
        R.audio.setSound(G.S.settings.sound);
        R.audio.setMusic(G.S.settings.music);
        R.audio.setEra(G.stageIndex());

        M.attach();
        M.ensureDaily();
        wireEvents();
        buildStaticUI();
        R.hints.init();
        UI.layout();

        $('#loading-text').classList.add('hidden');
        $('#btn-play').classList.remove('hidden');
        R.sdk.ready();

        requestAnimationFrame(loop);
    }

    function buildStaticUI() {
        document.title = t('title');
        $('#title h1').textContent = t('title');
        $('#title p').textContent = t('subtitle');
        $('#btn-play').textContent = t('play');
        $('#btn-rainbow .label').textContent = t('release');
        UI.buildHud();
        UI.buildTabs();
        UI.setShownCoins(G.S.coins);
        UI.renderPanel(true);
    }

    function startPlaying() {
        R.audio.unlock();
        R.audio.click();
        $('#title').classList.add('gone');
        document.body.classList.remove('on-title');
        setTimeout(() => $('#title').classList.add('hidden'), 600);
        main.playing = true;
        R.scene.scheduleComet(true);

        // Копилка: сколько зверята собрали, пока игрока не было
        const away = G.S.savedAt ? (Date.now() - G.S.savedAt) / 1000 : 0;
        const gain = G.offlineGain(away);
        if (gain > 0) showOffline(gain, away);
        updateGameplay();
        R.save.mark();
    }

    // ---------- Окно копилки ----------
    function showOffline(gain, awaySec) {
        const h = Math.floor(awaySec / 3600), m = Math.floor((awaySec % 3600) / 60);
        const timeStr = h > 0 ? t('time_h_m', { h, m }) : t('time_m', { m: Math.max(1, m) });
        enqueue((done) => {
            const capH = Math.round(G.offlineCapSec() / 3600);
            UI.celebrate({
                art: R.icon('piggy'),
                title: t('offline_title'),
                text: t('offline_text', { t: timeStr }),
                big: UI.coinImg() + U.fmt(gain),
                buttons: [
                    { label: `<i class="ico" style="width:28px;height:28px">${R.icon('video')}</i>${t('offline_double')}`, cls: 'blue', action: 'offlineDouble' },
                    { label: t('offline_take'), cls: '', action: 'offlineTake' }
                ],
                onClose: done
            });
            const m2 = UI.topModal();
            m2.gain = gain;
            if (awaySec > G.offlineCapSec()) {
                const p = document.createElement('p');
                p.className = 'desc';
                p.style.cssText = 'text-align:center;padding:0 18px';
                p.textContent = t('offline_full', { t: t('time_h_m', { h: capH, m: 0 }).replace(' 0 мин', '').replace(' 0 min', '') });
                m2.el.querySelector('.modal-hero').appendChild(p);
            }
        });
    }

    // ---------- Главный цикл ----------
    function loop(now) {
        requestAnimationFrame(loop);
        let dt = lastFrame ? (now - lastFrame) / 1000 : 0;
        lastFrame = now;
        dt = Math.min(dt, 0.1);

        const active = main.playing && !main.paused && !R.sdk.adOpen;
        if (active) {
            const res = G.tick(dt);
            res.taps.forEach((tap, i) => {
                R.scene.tapFx(tap);
                if (i === 0 && Math.random() < 0.5) R.audio.autoTap();
            });
            R.scene.passiveTick();
            M.trackEarn();

            const buff = G.buffActive();
            if (wasBuff && !buff) R.audio.buffEnd();
            wasBuff = buff;

            achTimer += dt;
            if (achTimer > 1) {
                achTimer = 0;
                M.checkAchievements();
                if (M.ensureDaily()) R.panels.refreshGoals();
            }
            saveTimer += dt;
            if (saveTimer > 2) { saveTimer = 0; R.save.mark(); }
        }
        R.scene.paused = !active;
        R.scene.frame(dt);
        UI.frame(dt);
        R.save.update();
    }

    // ---------- Тапы по саду ----------
    function onPointer(e) {
        if (!main.playing || main.paused) return;
        R.audio.unlock();
        const x = e.clientX, y = e.clientY;
        const hit = R.scene.hit(x, y);
        if (hit === 'comet') {
            const pos = R.scene.catchComet();
            const res = G.catchComet();
            R.audio.cometCatch();
            showCometReward(res, pos);
            R.save.mark();
            return;
        }
        if (hit === 'tree') {
            if (UI.mode === 'portrait' && UI.sheetOpen && y > root.innerHeight * 0.45) return;
            const res = G.tap('player');
            R.scene.tapFx(res, x, y);
            R.audio.tap(res.crit);
            if (res.filled) R.audio.ready();
            R.save.mark();
        }
    }

    function showCometReward(res, pos) {
        const pic = UI.img('butterfly', 0);
        if (res.id === 'stardust') {
            UI.toast(t('comet_stardust'), t('comet_stardust_text', { n: U.fmt(res.amount) }), pic);
            R.scene.rewardFx(pos.x, pos.y);
        } else if (res.id === 'frenzy') {
            UI.toast(t('comet_frenzy'), t('comet_frenzy_text', { s: Math.round(res.duration / 1000) }), pic);
        } else {
            UI.toast(t('comet_overcharge'), t('comet_overcharge_text'), pic);
            R.audio.ready();
        }
    }

    function release() {
        if (!G.release()) { R.audio.deny(); return; }
        R.save.mark();
    }

    // ---------- События игры → звук, эффекты, окна ----------
    function wireEvents() {
        R.on('buyTree', (r) => {
            R.audio[r.count > 1 ? 'buyBig' : 'buy']();
            R.scene.growFx(r.count);
            R.save.mark();
        });
        R.on('stage', (r) => {
            R.audio.era();
            R.audio.setEra(r.stage);
            R.scene.stageFx();
            const st = CFG.stages[r.stage];
            enqueue((done) => UI.celebrate({
                art: UI.img('stage', r.stage),
                title: t('stage_up_title'),
                text: t('stage_up_text', { name: t('stage_' + st.id) }) + (st.perk ? '<br><b class="good">⭐ ' + t('perk_stage_' + st.id) + '</b>' : ''),
                onClose: () => { done(); R.sdk.showInterstitial(); }
            }));
            R.save.flush();
        });
        R.on('flower', (r) => {
            const f = CFG.flowers[r.index];
            R.scene.flowerFx(r.index);
            enqueue((done) => {
                R.audio.freq();
                UI.celebrate({
                    art: UI.img('flower', f.id),
                    title: t('flower_up_title'),
                    text: '<b>' + t('flower_' + f.id) + '</b> — ' + t('flower_desc_' + f.id) + '<br>' + t('flower_up_hint'),
                    onClose: done
                });
            });
        });
        R.on('buyHelper', (r) => {
            R.audio[r.count > 1 ? 'buyBig' : 'buy']();
            if (r.first) R.scene.helperFx(r.index);
            if (r.milestone) {
                UI.toast(t('helper_' + CFG.helpers[r.index].id), t('helper_milestone', { n: r.milestone }), UI.img('helper', CFG.helpers[r.index].id));
                R.audio.achievement();
            }
            R.save.mark();
        });
        R.on('release', () => {
            R.audio.release();
            R.scene.releaseFx();
        });
        R.on('cometAppear', () => R.audio.cometAppear());
        R.on('achievement', (a) => {
            R.audio.achievement();
            UI.toast(t('ach_unlocked'), t('ach_' + a.group.id) + ' ' + '★'.repeat(a.step + 1), R.icon('trophy'), 3200);
            R.save.mark();
        });
        R.on('questDone', (q) => {
            UI.toast(t('quest_done') + '!', t('quest_' + q.type, { n: q.type === 'earn' ? U.fmt(q.target) : q.target }), R.icon('star'));
            R.audio.ready();
            R.panels.refreshGoals();
        });
        R.on('prestige', (r) => {
            R.audio.prestige();
            R.audio.setEra(0);
            R.scene.prestigeFx();
            UI.setShownCoins(0);
            UI.renderPanel(true);
            R.sdk.setScore(G.S.seedsLife);
            enqueue((done) => UI.celebrate({
                art: UI.seedImg(),
                title: t('garden_done'),
                text: t('garden_done_text', { n: U.fmt(r.gained) }),
                onClose: () => { done(); R.sdk.showInterstitial(); }
            }));
            R.save.flush();
        });
        R.on('coinArrived', () => UI.bumpCoins());

        // Реклама и пауза платформы: глушим звук и останавливаем игру
        R.on('adOpen', () => { R.audio.pause(); updateGameplay(); });
        R.on('adClose', () => { if (!document.hidden) R.audio.resume(); updateGameplay(); });
        R.on('platformPause', () => { main.paused = true; R.audio.pause(); updateGameplay(); });
        R.on('platformResume', () => { main.paused = false; if (!document.hidden && !R.sdk.adOpen) R.audio.resume(); updateGameplay(); });
        R.on('modalOpen', updateGameplay);
        R.on('modalClose', updateGameplay);
        R.on('tabOpen', () => { if (R.hints.current) R.hints.update(); });

        // ---------- Кнопки ----------
        $('#btn-play').addEventListener('click', startPlaying);
        $('#scene').addEventListener('pointerdown', onPointer);
        $('#btn-rainbow').addEventListener('click', () => { R.audio.unlock(); release(); });
        $('#tabs').addEventListener('click', (e) => {
            const b = e.target.closest('.tab');
            if (b) UI.openTab(b.dataset.tab);
        });
        $('#panel .close-btn').addEventListener('click', () => { R.audio.click(); UI.closeSheet(); });
        $('#panel').addEventListener('click', (e) => {
            const a = e.target.closest('[data-a]');
            if (a) UI.action(a.dataset.a, a);
        });
        $('#btn-goals').addEventListener('click', () => { R.hints.goalsOpened = true; R.panels.openGoals(); });
        $('#btn-settings').addEventListener('click', () => R.panels.openSettings());

        // Клавиатура на компьютере: пробел — тап по дереву, R/Enter — радуга
        document.addEventListener('keydown', (e) => {
            if (!main.playing || e.repeat || UI.hasModal()) return;
            if (e.code === 'Space') {
                e.preventDefault();
                const p = R.scene.treePoint();
                const res = G.tap('player');
                R.scene.tapFx(res, p.x + U.rand(-30, 30), p.y + U.rand(-20, 20));
                R.audio.tap(res.crit);
                if (res.filled) R.audio.ready();
            } else if (e.code === 'KeyR' || e.code === 'Enter') {
                release();
            }
        });

        document.addEventListener('contextmenu', (e) => e.preventDefault());
        document.addEventListener('visibilitychange', onVisibility);
        root.addEventListener('pagehide', () => R.save.flush());
        root.addEventListener('blur', () => R.audio.pause());
        root.addEventListener('focus', () => { if (!document.hidden && !R.sdk.adOpen && !main.paused) R.audio.resume(); });
        root.addEventListener('resize', () => { R.scene.resize(); UI.layout(); });

        installActions();
    }

    function onVisibility() {
        if (document.hidden) {
            hiddenAt = Date.now();
            R.save.flush();
            R.audio.pause();
        } else {
            if (!R.sdk.adOpen && !main.paused) R.audio.resume();
            // Вернулись после долгого отсутствия — копилка
            if (main.playing && hiddenAt) {
                const away = (Date.now() - hiddenAt) / 1000;
                const gain = G.offlineGain(away);
                if (gain > 0) {
                    if (away > 600) showOffline(gain, away);
                    else {
                        G.addCoins(gain);
                        UI.toast(t('offline_title'), t('welcome_back', { n: U.fmt(gain) }), UI.coinImg());
                    }
                }
            }
            hiddenAt = 0;
        }
        updateGameplay();
    }

    // ---------- Действия кнопок в панелях и окнах ----------
    function installActions() {
        const A = UI.actions;
        const afterBuy = () => { UI.renderPanel(true); };

        A.grow = () => { if (G.buyTree()) afterBuy(); else R.audio.deny(); };
        A.growMax = () => { if (G.buyTreeMax()) afterBuy(); else R.audio.deny(); };
        A.hire = (i) => {
            i = +i;
            const mode = R.panels.buyMode;
            const count = mode === 'max' ? 'max' : mode;
            if (mode !== 'max' && G.S.coins < G.helperBulkPrice(i, mode)) { R.audio.deny(); return; }
            if (G.buyHelper(i, count) > 0) afterBuy(); else R.audio.deny();
        };
        A.mode = (m) => { R.audio.click(); R.panels.buyMode = m === 'max' ? 'max' : +m; UI.renderPanel(true); };
        A.perk = (id) => {
            if (G.buyPerk(id)) { R.audio.buyBig(); afterBuy(); R.save.flush(); } else R.audio.deny();
        };
        A.prestige = () => {
            const gain = G.seedsOnPrestige();
            if (!G.canPrestige() || gain <= 0) { R.audio.deny(); return; }
            R.audio.open();
            UI.celebrate({
                art: UI.seedImg(),
                rays: false,
                title: t('garden_confirm_title'),
                text: t('garden_confirm_text', { n: U.fmt(gain) }),
                buttons: [
                    { label: t('garden_yes'), cls: 'gold', action: 'prestigeYes' },
                    { label: t('garden_no'), cls: 'white', action: 'close' }
                ]
            });
        };
        A.prestigeYes = (arg, el, modal) => {
            UI.closeModal(modal);
            G.prestige();
        };
        A.gift = () => {
            const amount = M.claimGift();
            if (amount > 0) {
                R.audio.reward();
                R.scene.rewardFx();
                UI.toast(t('gift_title'), '+' + U.fmt(amount), R.icon('gift'));
                afterBuy();
                R.save.flush();
            }
        };
        A.freeChest = () => {
            const amount = G.claimFreeChest();
            if (amount > 0) {
                R.audio.reward();
                R.scene.rewardFx();
                UI.toast(t('free_chest'), '+' + U.fmt(amount), R.icon('basket'));
                afterBuy();
                R.save.flush();
            } else R.audio.deny();
        };
        A.ad = (type) => {
            if (!G.adAvailable(type)) { R.audio.deny(); return; }
            R.audio.click();
            R.sdk.showRewarded(() => {
                const res = G.applyAdReward(type);
                R.audio.reward();
                if (res.amount) { R.scene.rewardFx(); UI.toast(t('bonus_chest'), '+' + U.fmt(res.amount), R.icon('bag')); }
                else UI.toast(t({ incomeX2: 'bonus_income_x2', chargeX2: 'bonus_charge_x2', instantCharge: 'bonus_instant' }[type]), '✓', R.icon('star'));
                afterBuy();
                R.save.flush();
            }).then(ok => { if (!ok && !R.sdk.mock) UI.toast(t('ad_fail'), '', R.icon('video')); });
        };
        A.offlineTake = (arg, el, modal) => {
            G.addCoins(modal.gain);
            R.audio.reward();
            R.scene.rewardFx();
            UI.closeModal(modal);
            R.save.flush();
        };
        A.offlineDouble = (arg, el, modal) => {
            const gain = modal.gain;
            R.sdk.showRewarded(() => { G.addCoins(gain); }).then((ok) => {
                G.addCoins(gain);
                R.audio.reward();
                R.scene.rewardFx();
                UI.closeModal(modal);
                if (ok) UI.toast(t('offline_title'), '+' + U.fmt(gain * 2), UI.coinImg());
                R.save.flush();
            });
        };
        A.claimQuest = (i) => {
            const amount = M.claimQuest(+i);
            if (amount > 0) { R.audio.reward(); R.scene.rewardFx(); R.panels.refreshGoals(); R.save.flush(); } else R.audio.deny();
        };
        A.claimBonus = () => {
            const info = M.claimDailyBonus();
            if (info) { R.audio.reward(); R.scene.rewardFx(); R.panels.refreshGoals(); R.save.flush(); } else R.audio.deny();
        };
        A.goalsTab = (id) => { R.audio.click(); R.panels.goalsTab(id); };
        A.lang = (lang) => {
            R.audio.click();
            G.S.settings.lang = lang;
            R.i18n.setLang(lang);
            document.documentElement.lang = lang;
            UI.pics = {};
            buildStaticUI();
            R.panels.refreshSettings();
            R.save.flush();
        };
        A.sound = (v) => { G.S.settings.sound = v === '1'; R.audio.setSound(G.S.settings.sound); R.audio.click(); R.panels.refreshSettings(); R.save.flush(); };
        A.music = (v) => { G.S.settings.music = v === '1'; R.audio.setMusic(G.S.settings.music); R.audio.click(); R.panels.refreshSettings(); R.save.flush(); };
        A.auth = async () => { await R.sdk.openAuth(); R.panels.refreshSettings(); };
        A.leaderboard = () => R.panels.openLeaderboard();
    }

    // Отладка из консоли браузера: R.main.debug.coins(1e6)
    main.debug = {
        coins: (n) => { G.addCoins(n); },
        level: (n) => { G.S.level = Math.min(G.maxLevel, n); G.S.bestLevel = Math.max(G.S.bestLevel, G.S.level); UI.renderPanel(true); },
        comet: () => R.scene.scheduleComet(true) || (R.scene._forceComet = true),
        reset: () => { localStorage.removeItem('moneytree_v1'); location.reload(); }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})(typeof window !== 'undefined' ? window : globalThis);
