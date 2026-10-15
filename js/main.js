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
    // Окна показываются по одному: копилка → подарок дня → новая стадия и т.д.
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
        let called = false;
        const done = () => {
            if (called) return;           // защита от двойного вызова
            called = true;
            setTimeout(nextCelebration, 150);
        };
        // Ошибка в одном окне не должна навсегда остановить игру
        try { fn(done); } catch (e) { console.error('Ошибка окна:', e); done(); }
    }

    // ---------- Разметка геймплея для Яндекса ----------
    // Играет = в саду, вкладка видна, нет рекламы, паузы платформы и окна поверх
    const isActive = () => main.playing && !main.paused && !document.hidden && !R.sdk.adOpen && !UI.hasModal() && !celebrating;
    function updateGameplay() {
        R.sdk.setGameplay(isActive());
    }
    main.updateGameplay = updateGameplay;

    // ---------- Запуск ----------
    // Шаг запуска: ошибка в одном шаге не должна оставить игру без кнопок
    async function step(name, fn) {
        try { await fn(); } catch (e) { console.error('Ошибка при запуске (' + name + '):', e); }
    }

    async function boot() {
        await step('сцена', () => { R.scene.init($('#scene')); UI.layout(); });
        await step('SDK', async () => {
            await R.sdk.init();
            if (R.sdk.ready) G.now = () => R.sdk.now();   // время сервера — защита от перевода часов
        });
        await step('сохранение', () => R.save.load());
        // Что бы ни случилось с сохранением — играть можно
        if (!G.S || !G.S.stats) R.save.fresh();
        await step('настройки', () => {

            const nav = (navigator.language || 'ru').slice(0, 2);
            const lang = G.S.settings.lang || R.i18n.fromPlatform(R.sdk.lang || nav);
            R.i18n.setLang(lang);
            document.documentElement.lang = R.i18n.lang;
            R.audio.setSound(G.S.settings.sound);
            R.audio.setMusic(G.S.settings.music);
            R.audio.setEra(G.stageIndex());
        });
        await step('копилка', () => {
            // Копилка считается сразу при загрузке и хранится в сохранении, пока
            // игрок её не заберёт, — перезагрузка или переключение вкладки её не съедят
            collectAway(G.S.savedAt ? (G.now() - G.S.savedAt) / 1000 : 0);
        });
        await step('задания', () => { M.attach(); M.ensureDaily(); });
        await step('события', wireEvents);
        await step('интерфейс', buildStaticUI);
        await step('подсказки', () => R.hints.init());
        await step('раскладка', () => UI.layout());
        // Шрифт Nunito догрузился — размеры плашек изменились, раскладку пересчитываем
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { try { UI.layout(); } catch (e) { /* не критично */ } });
        await step('запись', () => R.save.flush());
        // Портреты для панелей рисуются, пока игрок смотрит на заставку
        await step('портреты', () => UI.prewarm());
        $('#loading-text').classList.add('hidden');
        $('#btn-play').classList.remove('hidden');
        R.sdk.gameReady();
        requestAnimationFrame(loop);
    }

    function collectAway(seconds) {
        const gain = Math.min(G.offlineGain(seconds), Math.max(0, G.offlineCapAmount() - G.S.pendingOffline));
        if (gain > 0) {
            G.S.pendingOffline += gain;
            G.S.pendingAway = Math.max(G.S.pendingAway || 0, seconds);
        }
        return gain;
    }

    function buildStaticUI() {
        document.title = t('title');
        $('#title h1').textContent = t('title');
        $('#title p').textContent = t('subtitle');
        $('#btn-play').textContent = t('play');
        $('#loading-text').textContent = t('loading');
        UI.buildHud();
        UI.buildTabs();
        UI.setShownCoins(G.S.coins);
        UI.renderPanel(true);
    }

    function startPlaying() {
        if (main.playing || main.otherTab) return;
        R.audio.unlock();
        R.audio.click();
        $('#title').classList.add('gone');
        document.body.classList.remove('on-title');
        setTimeout(() => $('#title').classList.add('hidden'), 600);
        main.playing = true;
        R.scene.scheduleComet(true);
        if (G.S.pendingOffline > 0) showOffline();
        if (G.S.pendingGift > 0) showPendingGift();
        maybeAutoGift();
        updateGameplay();
        R.save.mark();
    }

    // ---------- Окно копилки ----------
    let offlineOpen = false, offlineModal = null;
    function updateOfflineModal() {
        const big = offlineModal && offlineModal.el.querySelector('.big');
        if (big) big.innerHTML = UI.coinImg() + U.fmt(G.S.pendingOffline);
    }
    function showOffline() {
        if (offlineOpen) { updateOfflineModal(); return; }
        offlineOpen = true;
        enqueue((done) => {
            const gain = G.S.pendingOffline;
            if (!(gain > 0)) { offlineOpen = false; done(); return; }
            const away = G.S.pendingAway || 0;
            const h = Math.floor(away / 3600), m = Math.floor((away % 3600) / 60);
            const timeStr = h > 0 ? (m > 0 ? t('time_h_m', { h, m }) : t('time_h', { h })) : t('time_m', { m: Math.max(1, m) });
            const full = away > G.offlineCapSec() ? `<p class="small">${t('offline_full', { t: t('time_h', { h: Math.round(G.offlineCapSec() / 3600) }) })}</p>` : '';
            const buttons = [{ label: t('offline_take'), cls: '', action: 'offlineTake' }];
            if (R.sdk.adsAvailable()) buttons.push({ label: `<i class="ico">${R.icon('video')}</i>${t('offline_double')}`, cls: 'ad-alt', action: 'offlineDouble' });
            UI.celebrate({
                art: R.icon('piggy'),
                title: t('offline_title'),
                text: t('offline_text', { t: timeStr }),
                big: UI.coinImg() + U.fmt(gain),
                extra: full,
                buttons,
                noClose: true,
                onClose: () => { offlineOpen = false; offlineModal = null; done(); }
            });
            offlineModal = UI.topModal();
        });
    }

    function takeOffline(mult) {
        const gain = G.S.pendingOffline;
        G.S.pendingOffline = 0;
        G.S.pendingAway = 0;
        if (gain > 0) {
            G.addCoins(gain * mult);
            R.audio.reward();
            R.scene.rewardFx();
        }
        R.save.flush();
    }

    // Подарок за стадию, который не успели забрать (игру перезагрузили)
    function showPendingGift() {
        enqueue((done) => {
            const gift = G.S.pendingGift;
            if (!(gift > 0)) { done(); return; }
            const m = UI.celebrate({
                art: UI.img('stage', G.stageIndex()),
                title: t('stage_gift'),
                big: UI.coinImg() + U.fmt(gift),
                buttons: [{ label: t('take'), cls: '', action: 'stageTake' }],
                noClose: true,
                onClose: done
            });
            m.gift = gift;
        });
    }

    // ---------- Подарок дня открывается сам при первом заходе за день ----------
    let autoGiftShown = '';
    function maybeAutoGift() {
        const today = U.dayKey(G.now());
        if (!M.giftAvailable() || autoGiftShown === today) return;
        if (!G.S.gift.lastDay && G.S.stats.playMs < 180000) return;
        autoGiftShown = today;
        enqueue((done) => {
            if (!M.giftAvailable()) { done(); return; }
            const day = M.giftStreakDay();
            const seeds = M.giftSeeds(day);
            UI.celebrate({
                art: R.icon('gift'),
                title: t('gift_auto_title'),
                text: t(day === 7 ? 'gift_auto_text7' : 'gift_auto_text', { d: day }),
                big: UI.coinImg() + U.fmt(M.giftAmount(day)) + (seeds ? '&nbsp;+&nbsp;' + UI.seedImg() + seeds : ''),
                extra: R.panels.giftCalendar() + `<p class="small">${R.panels.giftTomorrow()}</p>`,
                buttons: [{ label: t('gift_take'), cls: 'gold', action: 'giftAuto' }],
                noClose: true,
                onClose: done
            });
        });
    }

    // ---------- Главный цикл ----------
    let goalsClock = 0;
    function loop(now) {
        requestAnimationFrame(loop);
        const raw = lastFrame ? (now - lastFrame) / 1000 : 0;
        lastFrame = now;
        const econDt = Math.min(raw, 1);       // доход не теряется даже при низком FPS
        const dt = Math.min(raw, 0.1);         // анимации — без рывков

        const active = isActive();
        if (!active && main.playing && !document.hidden) freezeTimers(raw * 1000);
        // Окно поверх сада: зверята всё равно приносят монетки (кроме рекламы и паузы платформы)
        if (!active && main.playing && !document.hidden && !main.paused && !R.sdk.adOpen) G.tickIdle(econDt);
        if (active) {
            const res = G.tick(econDt);
            res.taps.forEach((tap, i) => {
                R.scene.tapFx(tap);
                if (i === 0 && Math.random() < 0.5) R.audio.autoTap();
            });
            R.scene.passiveTick();
            M.trackEarn();

            const buff = G.buffActive();
            if (wasBuff && !buff) R.audio.buffEnd();
            wasBuff = buff;

            achTimer += econDt;
            if (achTimer > 1) {
                achTimer = 0;
                R.sdk.setScore(G.S.seedsLife);    // таблица лидеров: золотые семена за всё время
                M.checkAchievements();
                if (M.ensureDaily()) R.panels.refreshGoals();
            }
            saveTimer += econDt;
            if (saveTimer > 2) { saveTimer = 0; R.save.mark(); }
        }
        R.scene.paused = !active;
        // Часы окна «Цели» идут и тогда, когда сад на паузе под окном
        goalsClock += Math.min(raw, 1);
        if (goalsClock >= 1) { goalsClock = 0; R.panels.tickGoals(); }
        R.scene.frame(dt);
        UI.frame(dt);
        R.save.update();
    }

    // Пока игра на паузе (окно, реклама), радужный дождь, отдых радуги и волшебные
    // тапы стоят на месте — игрок не теряет бонус, пока читает окно
    function freezeTimers(ms) {
        const now = G.now();
        if (G.S.buffEnd > now) G.S.buffEnd += ms;
        if (G.S.cooldownEnd > now) G.S.cooldownEnd += ms;
        if (G.S.frenzyEnd > now) G.S.frenzyEnd += ms;
    }

    // ---------- Тапы по саду ----------
    function vibrate() {
        if (G.S.settings.vibro === false || !navigator.vibrate) return;
        try { navigator.vibrate(8); } catch (e) { /* не поддерживается */ }
    }

    function doTap(x, y) {
        UI.lastTreeTap = performance.now();
        const res = G.tap('player');
        R.scene.tapFx(res, x, y);
        R.audio.tap(res.crit);
        if (res.filled) R.audio.ready();
        vibrate();
        R.save.mark();
    }

    function onPointer(e) {
        if (!isActive()) return;
        R.audio.unlock();
        const x = e.clientX, y = e.clientY;
        const hit = R.scene.hit(x, y);
        if (hit === 'comet') {
            const pos = R.scene.catchComet();
            const res = G.catchComet();
            R.audio.cometCatch();
            vibrate();
            showCometReward(res, pos);
            R.save.mark();
            return;
        }
        if (hit === 'basket') { UI.actions.freeChest(); return; }
        if (hit === 'critter' || hit === 'tree') {
            // На телефоне при открытой панели тапы по самой панели не идут в дерево
            const panel = UI.mode === 'portrait' && UI.sheetOpen ? $('#panel').getBoundingClientRect() : null;
            if (panel && y > panel.top) return;
            if (hit === 'critter') R.scene.pokeActor(R.scene.lastActor);
            doTap(x, y);
        }
    }

    function showCometReward(res, pos) {
        const pic = UI.img('butterfly', 0);
        if (res.id === 'stardust') {
            UI.toast(t('comet_stardust'), t('comet_stardust_text', { n: U.fmt(res.amount) }), pic);
            R.scene.rewardFx(pos.x, pos.y);
            // Предложение: утроить мешочек за видео
            const extra = res.amount * 2;
            UI.offer(t('offer_x3') + ' · +' + U.fmt(extra), () => {
                R.sdk.showRewarded(() => { G.addCoins(extra); R.audio.reward(); R.scene.rewardFx(); R.save.flush(); })
                    .then(r => { if (r === 'error') UI.toast(t('ad_fail'), '', R.icon('video')); });
            });
        } else if (res.id === 'frenzy') {
            UI.toast(t('comet_frenzy'), t('comet_frenzy_text', { s: Math.round(res.duration / 1000) }), pic);
        } else {
            UI.toast(t('comet_overcharge'), t('comet_overcharge_text'), pic);
            R.audio.ready();
        }
    }

    function release() {
        if (!isActive()) return;
        if (!G.release()) { R.audio.deny(); return; }
        R.save.mark();
    }

    function growOnce() {
        if (G.buyTree()) { UI.renderPanel(true); return true; }
        R.audio.deny();
        return false;
    }

    // ---------- Достижения: если открылось сразу несколько — одна всплывашка ----------
    let achBatch = [];
    let achTimerId = 0;
    function queueAchievement(a) {
        achBatch.push(a);
        clearTimeout(achTimerId);
        achTimerId = setTimeout(() => {
            const list = achBatch;
            achBatch = [];
            R.audio.achievement();
            if (list.length === 1) UI.toastLow(t('ach_unlocked'), t('ach_' + list[0].group.id) + ' ' + '★'.repeat(list[0].step + 1), R.icon('trophy'));
            else UI.toastLow(t('ach_many', { n: list.length }), list.map(x => t('ach_' + x.group.id)).filter((v, i, arr) => arr.indexOf(v) === i).join(', '), R.icon('trophy'));
        }, 1500);
    }

    // ---------- События игры → звук, эффекты, окна ----------
    let stageFlowers = [];
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
            stageFlowers = r.newFlowers.slice();
            // Стадия уже была в прошлых садах — без окна, только всплывашка
            if (G.S.prestiges > 0 && r.stage <= G.S.maxStageEver) {
                UI.toast(t('stage_again', { name: t('stage_' + st.id) }), st.perk ? t('perk_stage_' + st.id) : '', UI.img('stage', r.stage));
                R.save.flush();
                return;
            }
            const gift = G.stageGift();
            G.S.pendingGift += gift;
            const flowerHtml = r.newFlowers.map(i => {
                const f = CFG.flowers[i];
                return `<div class="mini-card"><div class="pic">${UI.img('flower', f.id)}</div><div><b>${t('flower_up_title')}</b><br>${t('flower_' + f.id)} — ${t('flower_desc_' + f.id)}</div></div>`;
            }).join('');
            enqueue((done) => {
                const buttons = [{ label: t('take'), cls: '', action: 'stageTake' }];
                if (R.sdk.adsAvailable()) buttons.push({ label: `<i class="ico">${R.icon('video')}</i>${t('take_x2')}`, cls: 'ad-alt', action: 'stageDouble' });
                const m = UI.celebrate({
                    art: UI.img('stage', r.stage),
                    title: t(r.stage === 1 ? 'stage_up_title_sprout' : 'stage_up_title'),
                    text: t('stage_up_text', { name: t('stage_' + st.id) }) + (st.perk ? `<br><b class="good">${t('perk_stage_' + st.id)}</b>` : ''),
                    extra: `<p class="small">${t('stage_gift')}</p>` + flowerHtml,
                    big: UI.coinImg() + U.fmt(gift),
                    buttons,
                    noClose: true,
                    onClose: done
                });
                m.gift = gift;
                m.stageGift = true;
            });
            R.save.flush();
        });
        R.on('flower', (r) => {
            R.scene.flowerFx(r.index);
            if (stageFlowers.includes(r.index)) return;      // уже показан в окне стадии
            const f = CFG.flowers[r.index];
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
            R.scene.helperFx(r.index, r.first);
            if (r.milestone) {
                UI.toastLow(t('helper_' + CFG.helpers[r.index].id), t('helper_milestone', { n: r.milestone }), UI.img('helper', CFG.helpers[r.index].id));
                R.audio.achievement();
            }
            R.save.mark();
        });
        R.on('release', () => {
            R.audio.release();
            R.scene.releaseFx();
        });
        R.on('cometAppear', () => R.audio.cometAppear());
        R.on('achievement', (a) => { queueAchievement(a); R.save.mark(); });
        R.on('questDone', () => {
            if (G.S.hints.goals) {
                UI.toast(t('quest_done_title'), t('quest_done_text'), R.icon('star'));
                R.audio.ready();
            }
            R.panels.refreshGoals();
        });
        R.on('decor', (list) => {
            UI.toastLow(t('decor_new'), list.map(d => t('decor_' + d.id)).join(', '), UI.img('decor', list[list.length - 1].id));
        });
        R.on('prestige', (r) => {
            R.audio.prestige();
            R.audio.setEra(G.stageIndex());
            R.scene.prestigeFx();
            UI.setShownCoins(G.S.coins);
            UI.renderPanel(true);
            R.sdk.setScore(G.S.seedsLife);
            enqueue((done) => UI.celebrate({
                art: UI.seedImg(),
                title: t('garden_done'),
                text: t('garden_done_text', { n: r.gained }),
                onClose: done
            }));
            R.save.flush();
        });
        R.on('coinArrived', () => UI.bumpCoins());
        // Полноэкранная реклама — только в естественной паузе: игрок закрыл окно
        // «Дерево выросло» (см. takeStageGift). Не после «Целей», «Настроек» и нового сада
        R.on('saveReloaded', () => {
            UI.setShownCoins(G.S.coins);
            R.audio.setEra(G.stageIndex());
            UI.renderPanel(true);
        });

        // Реклама и пауза платформы: глушим звук и останавливаем игру
        R.on('adOpen', () => { R.audio.pause(); updateGameplay(); });
        R.on('adClose', () => { if (!document.hidden && !main.paused) R.audio.resume(); updateGameplay(); });
        R.on('platformPause', () => { main.paused = true; R.audio.pause(); updateGameplay(); });
        R.on('platformResume', () => { main.paused = false; if (!document.hidden && !R.sdk.adOpen) R.audio.resume(); updateGameplay(); });
        R.on('modalOpen', updateGameplay);
        R.on('modalClose', updateGameplay);

        // ---------- Кнопки ----------
        $('#btn-play').addEventListener('click', startPlaying);
        $('#scene').addEventListener('pointerdown', onPointer);
        $('#btn-rainbow').addEventListener('click', () => { R.audio.unlock(); release(); });
        $('#btn-grow').addEventListener('click', () => { R.audio.unlock(); if (isActive()) growOnce(); });
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
            if (!isActive()) return;
            if (e.code === 'Space' || e.code === 'Enter') e.preventDefault();
            if (e.repeat) return;
            if (e.code === 'Space') {
                const p = R.scene.treePoint();
                doTap(p.x + U.rand(-30, 30), p.y + U.rand(-20, 20));
            } else if (e.code === 'KeyR' || e.code === 'Enter') {
                release();
            }
        });

        document.addEventListener('contextmenu', (e) => e.preventDefault());
        ['gesturestart', 'gesturechange'].forEach(ev => document.addEventListener(ev, (e) => e.preventDefault(), { passive: false }));
        document.addEventListener('visibilitychange', onVisibility);
        root.addEventListener('pagehide', () => R.save.flushFinal());
        root.addEventListener('blur', () => R.audio.pause());
        root.addEventListener('focus', () => { if (!document.hidden && !R.sdk.adOpen && !main.paused) R.audio.resume(); });
        root.addEventListener('resize', () => { R.scene.resize(); UI.layout(); });

        installActions();
        watchOtherTabs();
    }

    function watchOtherTabs() {
        if (!root.BroadcastChannel) return;
        let ch;
        try { ch = new BroadcastChannel('moneytree'); } catch (e) { return; }
        ch.onmessage = (e) => {
            if (!e.data || e.data.type !== 'hello' || R.save.disabled) return;
            R.save.flush();
            R.save.disabled = true;
            main.otherTab = true;
            main.playing = false;
            // заставка не должна закрывать это окно, а «Играть» здесь больше не запускает игру
            $('#title').classList.add('hidden');
            document.body.classList.remove('on-title');
            R.audio.pause();
            updateGameplay();
            UI.celebrate({
                art: R.icon('tree'),
                rays: false,
                title: t('other_tab_title'),
                text: t('other_tab_text'),
                buttons: [{ label: t('other_tab_here'), cls: '', action: 'reloadHere' }],
                noClose: true
            });
        };
        ch.postMessage({ type: 'hello' });
    }

    function onVisibility() {
        if (document.hidden) {
            hiddenAt = G.now();
            R.save.flushUrgent();
            R.audio.pause();
        } else {
            if (!R.sdk.adOpen && !main.paused) R.audio.resume();
            // Вернулись после отсутствия — копилка
            if (hiddenAt) {
                const away = (G.now() - hiddenAt) / 1000;
                // Короткая отлучка (меньше минуты) — без копилки, но зверята работали в полную силу
                if (main.playing && away > 0 && away < CFG.offlineMinSec) G.tickIdle(away);
                const gain = collectAway(away);
                if (gain > 0 && main.playing) {
                    if (offlineOpen) updateOfflineModal();
                    else if (away > 600) showOffline();
                    else {
                        takeOffline(1);
                        UI.toast(t('offline_title'), t('welcome_back', { n: U.fmt(gain) }), UI.coinImg());
                    }
                }
                if (main.playing) maybeAutoGift();
                R.save.flush();
            }
            hiddenAt = 0;
        }
        updateGameplay();
    }

    // ---------- Действия кнопок в панелях и окнах ----------
    function installActions() {
        const A = UI.actions;
        const afterBuy = () => { UI.renderPanel(true); };

        // Реклама из окна: кнопки окна блокируются, пока идёт ролик (никаких двойных наград)
        const adFromModal = (modal, onReward, after) => {
            UI.busyModal(modal, true);
            R.sdk.showRewarded(onReward).then((r) => {
                if (r === 'error') UI.toast(t('ad_fail'), '', R.icon('video'));
                after(r === 'rewarded');
            });
        };

        A.grow = () => growOnce();
        A.growMax = () => { if (G.buyTreeMax()) afterBuy(); else R.audio.deny(); };
        A.hire = (i) => {
            i = +i;
            const mode = R.panels.buyMode;
            if (mode !== 'max' && G.S.coins < G.helperBulkPrice(i, mode)) { R.audio.deny(); return; }
            if (G.buyHelper(i, mode === 'max' ? 'max' : mode) > 0) afterBuy(); else R.audio.deny();
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
                text: t('garden_confirm_text', { n: U.fmt(gain), c: gain }),
                // Что останется и что начнётся заново — двумя колонками, без мелкого шрифта
                extra: `<div class="keep-reset">
                    <div class="kr reset"><b>${R.icon('garden')}${t('garden_reset_title')}</b><ul>${t('garden_reset_list').split('|').map(x => `<li>${x}</li>`).join('')}</ul></div>
                    <div class="kr keep"><b>${R.icon('check')}${t('garden_keep_title')}</b><ul>${t('garden_keep_list').split('|').map(x => `<li>${x}</li>`).join('')}</ul></div>
                </div>`,
                buttons: [
                    { label: t('garden_yes'), cls: 'gold', action: 'prestigeYes' },
                    { label: t('garden_no'), cls: 'white', action: 'close' }
                ]
            });
        };
        A.reloadHere = () => location.reload();
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
        A.giftAuto = (arg, el, modal) => {
            const amount = M.claimGift();
            if (amount > 0) { R.audio.reward(); R.scene.rewardFx(); R.save.flush(); }
            UI.closeModal(modal);
            UI.renderPanel(true);
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
        A.ad = (type, el) => {
            if (!G.adAvailable(type) || R.sdk.adOpen) { R.audio.deny(); return; }
            R.audio.click();
            if (el) el.classList.add('off');
            R.sdk.showRewarded(() => {
                const res = G.applyAdReward(type);
                R.audio.reward();
                if (res.amount) { R.scene.rewardFx(); UI.toast(t('bonus_chest'), '+' + U.fmt(res.amount), R.icon('bag')); }
                else UI.toast(t(type === 'incomeX2' ? 'bonus_income_x2' : 'bonus_shower'), '', R.icon(type === 'incomeX2' ? 'x2' : 'rainbow'));
                R.save.flush();
            }).then(r => {
                if (r === 'error') UI.toast(t('ad_fail'), '', R.icon('video'));
                afterBuy();
            });
        };
        A.offlineTake = (arg, el, modal) => {
            UI.busyModal(modal, true);
            takeOffline(1);
            UI.closeModal(modal);
        };
        A.offlineDouble = (arg, el, modal) => {
            if (!(G.S.pendingOffline > 0)) { UI.closeModal(modal); return; }
            adFromModal(modal, () => { }, (ok) => {
                const gain = G.S.pendingOffline;
                takeOffline(ok ? 2 : 1);
                if (ok) UI.toast(t('offline_title'), '+' + U.fmt(gain * 2), UI.coinImg());
                UI.closeModal(modal);
            });
        };
        const takeStageGift = (modal, mult) => {
            const g = Math.min(modal.gift || 0, G.S.pendingGift);
            G.S.pendingGift = Math.max(0, G.S.pendingGift - g);
            G.addCoins(g * mult);
        };
        A.stageTake = (arg, el, modal) => {
            UI.busyModal(modal, true);
            takeStageGift(modal, 1);
            R.audio.reward();
            R.scene.rewardFx();
            UI.closeModal(modal);
            R.save.flush();
            // Естественная пауза: дерево выросло, игрок забрал подарок. Не чаще раза
            // в 3 минуты, не в первые 5 минут игры и не сразу после рекламы за награду
            setTimeout(() => { if (!UI.hasModal() && !celebrating) R.sdk.showInterstitial(); }, 450);
        };
        A.stageDouble = (arg, el, modal) => {
            adFromModal(modal, () => { }, (ok) => {
                takeStageGift(modal, ok ? 2 : 1);
                R.audio.reward();
                R.scene.rewardFx();
                UI.closeModal(modal);
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
            buildStaticUI();
            R.panels.refreshSettings();
            R.save.flush();
        };
        A.sound = (v) => { G.S.settings.sound = v === '1'; R.audio.setSound(G.S.settings.sound); R.audio.click(); R.panels.refreshSettings(); R.save.flush(); };
        A.music = (v) => { G.S.settings.music = v === '1'; R.audio.setMusic(G.S.settings.music); R.audio.click(); R.panels.refreshSettings(); R.save.flush(); };
        A.vibro = (v) => { G.S.settings.vibro = v === '1'; R.audio.click(); vibrate(); R.panels.refreshSettings(); R.save.flush(); };
        A.auth = async () => {
            if (await R.sdk.openAuth()) {
                await R.save.reloadAfterAuth();
                if (G.S.settings.lang) R.i18n.setLang(G.S.settings.lang);
                R.audio.setSound(G.S.settings.sound);
                R.audio.setMusic(G.S.settings.music);
                R.audio.setEra(G.stageIndex());
                buildStaticUI();
                if (G.S.pendingOffline > 0) showOffline();
            }
            R.panels.refreshSettings();
        };
        A.leaderboard = () => R.panels.openLeaderboard();
    }

    // Отладка из консоли браузера — только на компьютере разработчика
    if (R.sdk.isLocal) {
        main.debug = {
            coins: (n) => { G.addCoins(n); },
            level: (n) => { G.S.level = Math.min(G.maxLevel, n); G.S.bestLevel = Math.max(G.S.bestLevel, G.S.level); UI.renderPanel(true); },
            comet: () => R.scene.cometSoon(),
            reset: () => { R.save.disabled = true; R.save.storage.remove('moneytree_v1'); location.reload(); }
        };
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})(typeof window !== 'undefined' ? window : globalThis);
