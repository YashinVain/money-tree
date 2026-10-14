// sdk.js — обёртка над SDK Яндекс Игр. Остальной код игры вызывает только
// R.sdk.*. Если игра открыта на компьютере разработчика (файл или localhost)
// и SDK нет — включается "тестовый режим": реклама имитируется окном с надписью
// "тестовая реклама". На любом другом адресе без SDK реклама просто недоступна
// (никаких бесплатных наград и поддельной рекламы — правило 1.16).

(function (root) {
    const R = root.R = root.R || {};
    const SDK = R.sdk = {
        ysdk: null,
        player: null,
        mock: false,          // тестовый режим (только локально)
        ready: false,         // SDK Яндекса успешно инициализирован
        lang: null,
        adOpen: false,
        cloudOk: false        // облако прочитано успешно — только после этого в него пишем
    };

    const host = (root.location && root.location.hostname) || '';
    // R_TEST_BUILD — сборка для проверки на телефоне (node tools/build-web.js): без SDK, с тестовой рекламой
    SDK.isLocal = !!root.R_TEST_BUILD || !root.location || root.location.protocol === 'file:' ||
        ['localhost', '127.0.0.1', '::1', ''].includes(host) || host.endsWith('.localhost');

    // Яндекс сам показывает рекламу при запуске игры, поэтому отсчёт идёт с загрузки
    let lastInterstitial = Date.now();
    let gameplayRunning = false;
    let lastCloudCall = 0;
    let pendingCloud = null;
    let pendingFlush = false;
    let cloudTimer = null;

    // /sdk.js: на Яндексе он есть. Если файла нет, браузер сразу сообщит об ошибке;
    // ожидание с запасом — на случай медленного интернета или локального прокси
    function loadScript() {
        return new Promise(resolve => {
            if (root.YaGames) return resolve(true);
            if (root.location.protocol === 'file:' || root.R_TEST_BUILD) return resolve(false);
            const s = document.createElement('script');
            s.src = '/sdk.js';
            s.async = true;
            const timer = setTimeout(() => resolve(!!root.YaGames), SDK.isLocal ? 10000 : 20000);
            s.onload = () => { clearTimeout(timer); resolve(!!root.YaGames); };
            s.onerror = () => { clearTimeout(timer); resolve(false); };
            document.head.appendChild(s);
        });
    }

    SDK.init = async () => {
        const ok = await loadScript();
        if (ok) {
            try {
                SDK.ysdk = await root.YaGames.init();
                SDK.ready = true;
                const env = SDK.ysdk.environment;
                SDK.lang = env && env.i18n && env.i18n.lang;
                // Платформа сама ставит игру на паузу (реклама, сворачивание вкладки)
                if (typeof SDK.ysdk.on === 'function') {
                    SDK.ysdk.on('game_api_pause', () => R.emit('platformPause'));
                    SDK.ysdk.on('game_api_resume', () => R.emit('platformResume'));
                }
                await SDK.loadPlayer();
                SDK.checkLeaderboard();
                return true;
            } catch (e) {
                console.warn('Не удалось инициализировать SDK Яндекс Игр:', e);
                SDK.ysdk = null;
                SDK.ready = false;
            }
        }
        SDK.mock = SDK.isLocal;
        if (SDK.mock) console.info('SDK Яндекс Игр не найден — тестовый режим (это нормально при локальном запуске)');
        return false;
    };

    SDK.loadPlayer = async () => {
        try {
            SDK.player = await SDK.ysdk.getPlayer();
        } catch (e) {
            SDK.player = null;
        }
    };

    // Уникальный id игрока Яндекса — чтобы на одном компьютере у разных
    // аккаунтов не смешивались сады
    SDK.playerId = () => {
        try { return SDK.player && SDK.player.getUniqueID ? SDK.player.getUniqueID() : ''; } catch (e) { return ''; }
    };

    // Время сервера Яндекса (защита от перевода часов), иначе — время устройства
    SDK.now = () => {
        try { if (SDK.ysdk && SDK.ysdk.serverTime) return SDK.ysdk.serverTime(); } catch (e) { /* нет — берём локальное */ }
        return Date.now();
    };

    SDK.ready_ = false;
    SDK.gameReady = () => {
        if (SDK.ready_) return;
        SDK.ready_ = true;
        try {
            if (SDK.ysdk && SDK.ysdk.features && SDK.ysdk.features.LoadingAPI) SDK.ysdk.features.LoadingAPI.ready();
        } catch (e) { /* не критично */ }
    };

    // Разметка геймплея: start — игрок играет, stop — пауза/окно/реклама.
    // Вызываем только при смене состояния, без повторов
    SDK.setGameplay = (running) => {
        if (running === gameplayRunning) return;
        gameplayRunning = running;
        try {
            const api = SDK.ysdk && SDK.ysdk.features && SDK.ysdk.features.GameplayAPI;
            if (api) running ? api.start() : api.stop();
        } catch (e) { /* не критично */ }
    };

    // ---------- Реклама ----------
    // Реклама вообще возможна? (на Яндексе или в локальном тесте)
    SDK.adsAvailable = () => SDK.ready || SDK.mock;

    // Видео за награду. onReward вызывается ТОЛЬКО если игрок досмотрел.
    // Результат: 'rewarded' | 'closed' (закрыл раньше) | 'error' | 'busy'
    SDK.showRewarded = (onReward) => new Promise(resolve => {
        if (SDK.adOpen) return resolve('busy');
        if (!SDK.adsAvailable()) return resolve('error');
        let rewarded = false, done = false, errored = false;
        const finish = () => {
            if (done) return;                 // onError + onClose не должны выдать награду дважды
            done = true;
            clearTimeout(watchdog);
            SDK.adOpen = false;
            R.emit('adClose');
            lastInterstitial = Date.now();
            if (rewarded) onReward();
            resolve(rewarded ? 'rewarded' : (errored ? 'error' : 'closed'));
        };
        // Сторож: если SDK так и не ответил, через 90 секунд игра снова оживёт
        const watchdog = setTimeout(() => { errored = !rewarded; finish(); }, 300000);
        SDK.adOpen = true;
        R.emit('adOpen');

        if (SDK.mock) {
            mockAd(() => { rewarded = true; finish(); });
            return;
        }
        try {
            SDK.ysdk.adv.showRewardedVideo({
                callbacks: {
                    onOpen: () => { },
                    onRewarded: () => { rewarded = true; },
                    onClose: () => finish(),
                    onError: () => { errored = true; finish(); }
                }
            });
        } catch (e) {
            errored = true;
            finish();
        }
    });

    // Полноэкранная реклама — только в логических паузах, не чаще раза в 3 мин
    // и не в первые 5 минут игры: пусть игрок сначала влюбится в сад
    SDK.showInterstitial = () => new Promise(resolve => {
        const now = Date.now();
        const played = R.game && R.game.S ? R.game.S.stats.playMs : 0;
        if (SDK.adOpen || !SDK.ready || now - lastInterstitial < R.CFG.interstitialGap || played < 300000) return resolve(false);
        lastInterstitial = now;
        let done = false;
        const finish = (shown) => {
            if (done) return;
            done = true;
            clearTimeout(watchdog);
            SDK.adOpen = false;
            R.emit('adClose');
            resolve(shown);
        };
        const watchdog = setTimeout(() => finish(false), 300000);
        SDK.adOpen = true;
        R.emit('adOpen');
        try {
            SDK.ysdk.adv.showFullscreenAdv({
                callbacks: {
                    onClose: (wasShown) => finish(!!wasShown),
                    onError: () => finish(false)
                }
            });
        } catch (e) {
            finish(false);
        }
    });

    // Имитация рекламы для локального теста — понятно подписана, на Яндексе не появляется
    function mockAd(onDone) {
        const el = document.createElement('div');
        el.className = 'mock-ad';
        el.innerHTML = '<div class="mock-ad-box"><div class="mock-ad-title">' + R.t('mock_ad_title') +
            '</div><div class="mock-ad-text">' + R.t('mock_ad_text') + '</div><div class="mock-ad-bar"><i></i></div></div>';
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(() => {
            el.classList.remove('show');
            setTimeout(() => el.remove(), 250);
            onDone();
        }, 1600);
    }

    // ---------- Облачные сохранения ----------
    // Возвращает { ok, data }: ok=false — облако прочитать не удалось
    SDK.loadCloud = async () => {
        if (!SDK.player || typeof SDK.player.getData !== 'function') return { ok: false, data: null };
        try {
            const d = await SDK.player.getData(['save']);
            SDK.cloudOk = true;
            return { ok: true, data: d && d.save ? d.save : null };
        } catch (e) {
            return { ok: false, data: null };
        }
    };

    // Лимит Яндекса — 100 запросов за 5 минут. Отправляем не чаще раза в 4 сек,
    // лишние вызовы склеиваются в один (уходит последнее состояние).
    // Пока облако ни разу не прочиталось — не пишем, чтобы не затереть более новый сад
    SDK.saveCloud = (state, flush) => {
        if (!SDK.cloudOk || !SDK.player || typeof SDK.player.setData !== 'function') return;
        pendingCloud = JSON.parse(JSON.stringify(state));
        pendingFlush = pendingFlush || !!flush;
        const send = () => {
            cloudTimer = null;
            if (!pendingCloud) return;
            lastCloudCall = Date.now();
            const data = pendingCloud, fl = pendingFlush;
            pendingCloud = null;
            pendingFlush = false;
            SDK.player.setData({ save: data }, fl).catch(() => { /* сеть могла пропасть — сохраним в следующий раз */ });
        };
        const wait = Math.max(0, 3500 - (Date.now() - lastCloudCall));
        if (wait === 0 || (flush && Date.now() - lastCloudCall > 1000)) {
            if (cloudTimer) { clearTimeout(cloudTimer); cloudTimer = null; }
            send();
        } else if (!cloudTimer) cloudTimer = setTimeout(send, wait);
    };

    // ---------- Таблица лидеров ----------
    SDK.LEADERBOARD = 'moneytree';

    SDK.lbReady = false;
    SDK.leaderboardAvailable = () => SDK.lbReady;
    SDK.checkLeaderboard = async () => {
        try {
            if (SDK.ysdk && SDK.ysdk.leaderboards && SDK.ysdk.leaderboards.getDescription) {
                await SDK.ysdk.leaderboards.getDescription(SDK.LEADERBOARD);
                SDK.lbReady = true;
            }
        } catch (e) { SDK.lbReady = false; }
    };

    SDK.setScore = (score) => {
        if (!SDK.ysdk || !SDK.ysdk.leaderboards || !SDK.isAuthorized()) return;
        try {
            const p = SDK.ysdk.leaderboards.setScore(SDK.LEADERBOARD, Math.floor(score));
            if (p && p.catch) p.catch(() => { });
        } catch (e) { /* таблица может быть не создана в консоли */ }
    };

    SDK.getLeaderboard = async () => {
        if (!SDK.leaderboardAvailable()) return null;
        try {
            return await SDK.ysdk.leaderboards.getEntries(SDK.LEADERBOARD, { quantityTop: 10, includeUser: true, quantityAround: 2 });
        } catch (e) {
            return null;
        }
    };

    SDK.isAuthorized = () => {
        try { return !!(SDK.player && typeof SDK.player.isAuthorized === 'function' && SDK.player.isAuthorized()); } catch (e) { return false; }
    };

    // Вход по кнопке в настройках. После входа заново читаем облако аккаунта
    SDK.openAuth = async () => {
        if (!SDK.ysdk || !SDK.ysdk.auth) return false;
        try {
            await SDK.ysdk.auth.openAuthDialog();
            await SDK.loadPlayer();
            SDK.cloudOk = false;
            return true;
        } catch (e) {
            return false;
        }
    };
})(typeof window !== 'undefined' ? window : globalThis);
