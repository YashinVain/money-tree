// save.js — сохранение прогресса. Пишем в localStorage почти сразу после
// каждого действия (требование Яндекса 1.9) и раз в ~20 сек в облако Яндекса,
// если SDK доступен. При загрузке из двух сохранений (на устройстве и в облаке)
// берём то, где больше прогресса, — а не то, что записано позже.

(function (root) {
    const R = root.R = root.R || {};
    const G = R.game;
    const SV = R.save = {};

    const KEY = 'moneytree_v1';
    const BACKUP = 'moneytree_v1_backup';   // сюда кладём сохранение, которое не смогли или не стали брать
    const CLOUD_GAP = 20000;

    let dirty = false;
    let lastLocal = 0;
    let lastCloud = 0;

    SV.storage = {
        get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
        set(key, value) { try { localStorage.setItem(key, value); return true; } catch (e) { return false; } },
        remove(key) { try { localStorage.removeItem(key); } catch (e) { /* нет доступа */ } }
    };

    SV.serialize = () => {
        G.S.savedAt = G.now();
        return JSON.stringify(G.S);
    };

    // Аккуратно накладываем сохранение на чистое состояние: так новые поля,
    // появившиеся в обновлениях игры, получают значения по умолчанию
    SV.apply = (data) => {
        const fresh = G.newState();
        // На верхнем уровне берём только известные поля, а внутри объектов
        // (достижения, бонусы, подсказки, статистика) — все ключи
        const merge = (target, src, top) => {
            Object.keys(src).forEach(k => {
                if (k === '__proto__' || k === 'constructor' || k === 'prototype') return;
                const v = src[k];
                if (top && !(k in target)) return;
                if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
                    merge(target[k], v, false);
                } else if (v !== undefined) {
                    target[k] = v;
                }
            });
        };
        merge(fresh, data && typeof data === 'object' ? data : {}, true);
        // Вложенные объекты обязаны остаться объектами нужной формы: null, число
        // или массив на их месте (битое или очень старое сохранение) — значение по умолчанию
        const plain = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
        const def = G.newState();
        ['stats', 'ach', 'boosts', 'adReady', 'perks', 'hints', 'settings', 'gift'].forEach(k => { if (!plain(fresh[k])) fresh[k] = def[k]; });
        Object.keys(def.stats).forEach(k => { if (!(k in fresh.stats)) fresh.stats[k] = 0; });
        Object.keys(def.boosts).forEach(k => { if (!(k in fresh.boosts)) fresh.boosts[k] = 0; });
        Object.keys(def.adReady).forEach(k => { if (!(k in fresh.adReady)) fresh.adReady[k] = 0; });
        fresh.gift = { lastDay: typeof fresh.gift.lastDay === 'string' ? fresh.gift.lastDay : '', streak: Math.max(0, Math.floor(+fresh.gift.streak || 0)) };
        ['sound', 'music', 'vibro'].forEach(k => { fresh.settings[k] = fresh.settings[k] !== false; });
        if (fresh.settings.lang !== null && typeof fresh.settings.lang !== 'string') fresh.settings.lang = null;
        const d = fresh.daily;
        const questOk = (q) => plain(q) && typeof q.type === 'string' && R.meta && R.meta.questTypes && R.meta.questTypes[q.type] && isFinite(+q.target) && +q.target > 0;
        if (!plain(d) || typeof d.day !== 'string' || !Array.isArray(d.quests) || !d.quests.every(questOk)) {
            fresh.daily = null;           // задания дня просто выдадутся заново
        } else {
            d.quests.forEach(q => { q.progress = Math.max(0, +q.progress || 0); q.target = +q.target; q.claimed = !!q.claimed; });
            d.bonusClaimed = !!d.bonusClaimed;
        }
        // Дата из будущего (часы устройства были переведены вперёд) — иначе подарок
        // и задания «замёрзли» бы до этой даты
        const today = R.util.dayKey(G.now());
        if (fresh.gift.lastDay > today) fresh.gift.lastDay = '';
        if (fresh.daily && fresh.daily.day > today) fresh.daily = null;
        if (typeof fresh.playerId !== 'string') fresh.playerId = '';
        fresh.playerAuthed = fresh.playerAuthed === true;
        // Любое число из сохранения проверяем: не число или меньше нуля — ставим 0
        const num = (v) => { v = +v; return isFinite(v) && v > 0 ? v : 0; };
        const helpers = Array.isArray(fresh.helpers) ? fresh.helpers : [];
        fresh.helpers = R.CFG.helpers.map((h, i) => Math.floor(num(helpers[i])));
        ['coins', 'runEarned', 'lifeEarned', 'seeds', 'seedsLife', 'charge', 'buffEnd', 'cooldownEnd', 'frenzyEnd',
            'prestiges', 'bestLevel', 'freeChestAt', 'savedAt', 'pendingOffline', 'pendingAway', 'pendingGift', 'maxStageEver'].forEach(k => { fresh[k] = num(fresh[k]); });
        Object.keys(fresh.stats).forEach(k => { fresh.stats[k] = num(fresh.stats[k]); });
        Object.keys(fresh.boosts).forEach(k => { fresh.boosts[k] = num(fresh.boosts[k]); });
        Object.keys(fresh.adReady).forEach(k => { fresh.adReady[k] = num(fresh.adReady[k]); });
        Object.keys(fresh.perks).forEach(k => { fresh.perks[k] = Math.floor(num(fresh.perks[k])); });
        fresh.level = Math.min(G.maxLevel, Math.floor(num(fresh.level)));
        fresh.bestLevel = Math.max(fresh.bestLevel, fresh.level);
        fresh.charge = Math.min(R.CFG.chargeMax, fresh.charge);
        G.S = fresh;
        SV.clampTimes();
    };

    // Защита от перевода часов: никакой таймер не может быть дальше своей
    // наибольшей длительности от "сейчас"
    SV.clampTimes = () => {
        const S = G.S, CFG = R.CFG, now = G.now();
        const cap = (v, maxMs) => Math.min(v, now + maxMs);
        const longBuff = CFG.ads.shower.seconds * 1000 + CFG.buffDuration * 3;
        S.buffEnd = cap(S.buffEnd, longBuff);
        S.cooldownEnd = cap(S.cooldownEnd, longBuff + CFG.buffCooldown);
        S.frenzyEnd = cap(S.frenzyEnd, CFG.frenzyDuration * 3);
        S.boosts.incomeX2End = cap(S.boosts.incomeX2End, CFG.ads.incomeX2.maxMinutes * 60000);
        Object.keys(S.adReady).forEach(k => { S.adReady[k] = cap(S.adReady[k], 15 * 60000); });
        S.freeChestAt = cap(S.freeChestAt, CFG.freeChest.cooldown);
        if (S.savedAt > now) S.savedAt = now;
    };

    // "Сколько прогресса" в сохранении — чтобы выбрать лучшее из двух
    SV.progress = (d) => {
        if (!d) return -1;
        return (+d.seedsLife || 0) * 1e6 + (+d.prestiges || 0) * 1e5 + Math.log10(1 + (+d.lifeEarned || 0)) * 1e3 + (+d.bestLevel || 0);
    };

    SV.readLocal = () => {
        const raw = SV.storage.get(KEY);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (e) { console.warn('Сохранение повреждено', e); SV.backup(raw); return null; }
    };

    SV.backup = (data) => {
        try { if (data) SV.storage.set(BACKUP, typeof data === 'string' ? data : JSON.stringify(data)); } catch (e) { /* нет места */ }
    };

    // Новый игрок: бесплатная корзинка — не сразу, а когда он уже освоился
    SV.fresh = () => {
        G.S = G.newState();
        G.S.freeChestAt = G.now() + R.CFG.freeChest.firstDelay;
    };

    SV.choose = (local, cloud) => {
        const valid = (d) => d && typeof d === 'object' && !Array.isArray(d);
        if (!valid(local)) local = null;
        if (!valid(cloud) || !cloud.v) cloud = null;
        let first = local, second = cloud;
        if (cloud) {
            const pl = SV.progress(local), pc = SV.progress(cloud);
            if (!local || pc > pl || (pc === pl && (cloud.savedAt || 0) > (local.savedAt || 0))) { first = cloud; second = local; }
        }
        // Если лучшее сохранение не читается — пробуем второе, иначе начинаем заново,
        // а битое откладываем в резервный ключ (игра не должна сломаться навсегда)
        for (const d of [first, second]) {
            if (!d) continue;
            try { SV.apply(d); return; } catch (e) { console.warn('Сохранение не подошло', e); SV.backup(d); }
        }
        SV.fresh();
    };

    // Загрузка при старте: локальное + облачное, побеждает то, где больше прогресса
    SV.load = async () => {
        let local = SV.readLocal();
        const pid = R.sdk.playerId();
        const authed = R.sdk.isAuthorized();
        // Локальный сад ДРУГОГО вошедшего аккаунта Яндекса на этом компьютере — не берём.
        // Гостевой сад (игрок ещё не входил) не теряем: при входе он сливается с облаком
        if (local && local.playerId && pid && local.playerId !== pid && local.playerAuthed === true) {
            SV.backup(local);
            local = null;
        }
        const cloud = await R.sdk.loadCloud();
        SV.choose(local, cloud.ok ? cloud.data : null);
        if (pid) G.S.playerId = pid;
        G.S.playerAuthed = authed;
        if (!cloud.ok && R.sdk.player) SV.retryCloud();
        return G.S.savedAt;
    };

    // Облако не прочиталось при запуске — пробуем ещё, с растущей паузой.
    // Пока не прочитали, в облако не пишем (иначе можно затереть сад с другого устройства)
    let cloudTries = 0;
    SV.retryCloud = () => {
        if (cloudTries >= 6) return;
        const wait = [5, 15, 40, 90, 180, 300][cloudTries++] * 1000;
        setTimeout(async () => {
            const cloud = await R.sdk.loadCloud();
            if (!cloud.ok) { SV.retryCloud(); return; }
            const current = JSON.parse(JSON.stringify(G.S));
            SV.choose(current, cloud.data);
            G.S.playerId = R.sdk.playerId() || G.S.playerId;
            G.S.playerAuthed = R.sdk.isAuthorized();
            SV.flush();
            R.emit('saveReloaded');
        }, wait);
    };

    // После входа в аккаунт: читаем облако аккаунта и берём лучший сад
    SV.reloadAfterAuth = async () => {
        const current = JSON.parse(JSON.stringify(G.S));
        const cloud = await R.sdk.loadCloud();
        if (!cloud.ok) { SV.retryCloud(); return false; }
        SV.choose(current, cloud.data);
        G.S.playerId = R.sdk.playerId();
        G.S.playerAuthed = R.sdk.isAuthorized();
        SV.flush();
        return true;
    };

    SV.disabled = false;      // true — больше ничего не пишем (сброс прогресса из отладки)

    // Пометить "есть несохранённые изменения" — цикл игры сохранит в ближайший кадр
    SV.mark = () => { dirty = true; };

    // Вызывается из игрового цикла. Локально — не чаще раза в 0.5 сек
    SV.update = (force) => {
        const now = Date.now();
        if (SV.disabled) return;
        if ((dirty && now - lastLocal > 500) || force) {
            SV.storage.set(KEY, SV.serialize());
            lastLocal = now;
            dirty = false;
            if (force === 'final' || force === 'urgent' || now - lastCloud > CLOUD_GAP) {
                lastCloud = now;
                R.sdk.saveCloud(G.S, force === 'final' ? 'final' : force === 'urgent');
            } else if (force) {
                R.sdk.saveCloud(G.S, false);   // важное событие: уйдёт с ближайшей разрешённой отправкой
            }
        }
    };

    // Срочное сохранение (уход со страницы, важное событие)
    SV.flush = () => {
        dirty = true;
        SV.update(true);
    };

    // Уход со страницы или сворачивание — отправить в облако сразу
    SV.flushUrgent = () => {
        dirty = true;
        SV.update('urgent');
    };

    // Страница закрывается: отложенная отправка уже не успеет — шлём в облако немедленно
    SV.flushFinal = () => {
        dirty = true;
        SV.update('final');
    };
})(typeof window !== 'undefined' ? window : globalThis);
