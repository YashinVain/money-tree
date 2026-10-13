// sdk.js — обёртка над SDK Яндекс Игр. Остальной код игры вызывает только
// R.sdk.*, поэтому если SDK нет (запуск с компьютера, двойной клик по
// index.html), игра всё равно работает: включается "тестовый режим", где
// реклама имитируется коротким окном с надписью "тестовая реклама".

(function (root) {
    const R = root.R = root.R || {};
    const SDK = R.sdk = {
        ysdk: null,
        player: null,
        mock: true,
        lang: null,
        adOpen: false
    };

    let lastInterstitial = 0;
    let gameplayRunning = false;
    let lastCloudCall = 0;
    let pendingCloud = null;
    let cloudTimer = null;

    // Подключаем /sdk.js динамически: на Яндексе он есть, локально — нет,
    // и тогда просто ждём ошибку загрузки (или 3 секунды) и идём дальше
    function loadScript() {
        return new Promise(resolve => {
            if (root.YaGames) return resolve(true);
            if (location.protocol === 'file:') return resolve(false);
            const s = document.createElement('script');
            s.src = '/sdk.js';
            s.async = true;
            const timer = setTimeout(() => resolve(!!root.YaGames), 3000);
            s.onload = () => { clearTimeout(timer); resolve(!!root.YaGames); };
            s.onerror = () => { clearTimeout(timer); resolve(false); };
            document.head.appendChild(s);
        });
    }

    SDK.init = async () => {
        const ok = await loadScript();
        if (!ok) {
            console.info('SDK Яндекс Игр не найден — тестовый режим (это нормально при локальном запуске)');
            return false;
        }
        try {
            SDK.ysdk = await root.YaGames.init();
            SDK.mock = false;
            const lang = SDK.ysdk.environment && SDK.ysdk.environment.i18n && SDK.ysdk.environment.i18n.lang;
            SDK.lang = lang;

            // Платформа сама ставит игру на паузу (реклама, сворачивание вкладки)
            if (typeof SDK.ysdk.on === 'function') {
                SDK.ysdk.on('game_api_pause', () => R.emit('platformPause'));
                SDK.ysdk.on('game_api_resume', () => R.emit('platformResume'));
            }
            try {
                SDK.player = await SDK.ysdk.getPlayer();
            } catch (e) {
                SDK.player = null;
            }
            return true;
        } catch (e) {
            console.warn('Не удалось инициализировать SDK Яндекс Игр:', e);
            SDK.mock = true;
            return false;
        }
    };

    SDK.ready = () => {
        try {
            if (SDK.ysdk && SDK.ysdk.features.LoadingAPI) SDK.ysdk.features.LoadingAPI.ready();
        } catch (e) { /* не критично */ }
    };

    // Разметка геймплея: start — игрок играет, stop — пауза/меню/реклама.
    // Вызываем только при смене состояния, без повторов
    SDK.setGameplay = (running) => {
        if (running === gameplayRunning) return;
        gameplayRunning = running;
        try {
            const api = SDK.ysdk && SDK.ysdk.features.GameplayAPI;
            if (api) running ? api.start() : api.stop();
        } catch (e) { /* не критично */ }
    };

    // ---------- Реклама ----------

    // Видео за награду. onReward вызывается ТОЛЬКО если игрок досмотрел
    SDK.showRewarded = (onReward) => new Promise(resolve => {
        if (SDK.adOpen) return resolve(false);
        let rewarded = false;
        const finish = () => {
            SDK.adOpen = false;
            R.emit('adClose');
            if (rewarded) onReward();
            resolve(rewarded);
        };
        SDK.adOpen = true;
        R.emit('adOpen');

        if (SDK.mock) {
            mockAd(true, () => { rewarded = true; finish(); });
            return;
        }
        try {
            SDK.ysdk.adv.showRewardedVideo({
                callbacks: {
                    onOpen: () => { },
                    onRewarded: () => { rewarded = true; },
                    onClose: () => finish(),
                    onError: () => finish()
                }
            });
        } catch (e) {
            finish();
        }
    });

    // Полноэкранная реклама — только в логических паузах и не чаще раза в 3 мин
    SDK.showInterstitial = () => new Promise(resolve => {
        const now = Date.now();
        // Первые 5 минут игры — без полноэкранной рекламы: пусть игрок сначала влюбится в сад
        const played = R.game && R.game.S ? R.game.S.stats.playMs : 0;
        if (SDK.adOpen || now - lastInterstitial < R.CFG.interstitialGap || played < 300000) return resolve(false);
        lastInterstitial = now;
        if (SDK.mock) return resolve(false);   // локально не мешаем тестированию
        SDK.adOpen = true;
        R.emit('adOpen');
        const done = (shown) => { SDK.adOpen = false; R.emit('adClose'); resolve(shown); };
        try {
            SDK.ysdk.adv.showFullscreenAdv({
                callbacks: {
                    onClose: (wasShown) => done(!!wasShown),
                    onError: () => done(false)
                }
            });
        } catch (e) {
            done(false);
        }
    });

    // Имитация рекламы для локального теста — понятно подписана, на Яндексе не появляется
    function mockAd(rewardedType, onDone) {
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
    SDK.loadCloud = async () => {
        if (!SDK.player || typeof SDK.player.getData !== 'function') return null;
        try {
            const data = await SDK.player.getData(['save']);
            return data && data.save ? data.save : null;
        } catch (e) {
            return null;
        }
    };

    // Лимит Яндекса — 100 запросов за 5 минут. Отправляем не чаще раза в 4 сек,
    // лишние вызовы склеиваются в один (уходит последнее состояние)
    SDK.saveCloud = (state, flush) => {
        if (!SDK.player || typeof SDK.player.setData !== 'function') return;
        pendingCloud = JSON.parse(JSON.stringify(state));
        const send = () => {
            cloudTimer = null;
            if (!pendingCloud) return;
            lastCloudCall = Date.now();
            const data = pendingCloud;
            pendingCloud = null;
            SDK.player.setData({ save: data }, !!flush).catch(() => { /* сеть могла пропасть — сохраним в следующий раз */ });
        };
        const wait = Math.max(0, 4000 - (Date.now() - lastCloudCall));
        if (wait === 0) send();
        else if (!cloudTimer) cloudTimer = setTimeout(send, wait);
    };

    // ---------- Таблица лидеров ----------
    SDK.LEADERBOARD = 'resonance';

    SDK.leaderboardAvailable = () => !!(SDK.ysdk && SDK.ysdk.leaderboards);

    SDK.setScore = (score) => {
        if (!SDK.leaderboardAvailable() || !SDK.player) return;
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

    SDK.isAuthorized = () => !!(SDK.player && typeof SDK.player.isAuthorized === 'function' && SDK.player.isAuthorized());

    SDK.openAuth = async () => {
        if (!SDK.ysdk || !SDK.ysdk.auth) return false;
        try {
            await SDK.ysdk.auth.openAuthDialog();
            SDK.player = await SDK.ysdk.getPlayer();
            return true;
        } catch (e) {
            return false;
        }
    };
})(typeof window !== 'undefined' ? window : globalThis);
