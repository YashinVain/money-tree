// save.js — сохранение прогресса. Пишем в localStorage почти сразу после
// каждого действия (требование Яндекса 1.9) и раз в ~20 сек в облако Яндекса,
// если SDK доступен. При загрузке из двух сохранений (на устройстве и в облаке)
// берём то, где больше прогресса, — а не то, что записано позже.

(function (root) {
    const R = root.R = root.R || {};
    const G = R.game;
    const SV = R.save = {};

    const KEY = 'moneytree_v1';
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
                const v = src[k];
                if (top && !(k in target)) return;
                if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
                    merge(target[k], v, false);
                } else if (v !== undefined) {
                    target[k] = v;
                }
            });
        };
        merge(fresh, data || {}, true);
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
        try { return JSON.parse(raw); } catch (e) { console.warn('Сохранение повреждено', e); return null; }
    };

    SV.choose = (local, cloud) => {
        let chosen = local;
        if (cloud && cloud.v) {
            const pl = SV.progress(local), pc = SV.progress(cloud);
            if (!local || pc > pl || (pc === pl && (cloud.savedAt || 0) > (local.savedAt || 0))) chosen = cloud;
        }
        if (chosen) SV.apply(chosen);
        else G.S = G.newState();
    };

    // Загрузка при старте: локальное + облачное, побеждает то, где больше прогресса
    SV.load = async () => {
        let local = SV.readLocal();
        const pid = R.sdk.playerId();
        // Локальный сад другого аккаунта Яндекса на этом компьютере — не берём
        if (local && local.playerId && pid && local.playerId !== pid) local = null;
        const cloud = await R.sdk.loadCloud();
        SV.choose(local, cloud.ok ? cloud.data : null);
        if (pid) G.S.playerId = pid;
        return G.S.savedAt;
    };

    // После входа в аккаунт: читаем облако аккаунта и берём лучший сад
    SV.reloadAfterAuth = async () => {
        const current = JSON.parse(JSON.stringify(G.S));
        const cloud = await R.sdk.loadCloud();
        if (!cloud.ok) return false;
        SV.choose(current, cloud.data);
        G.S.playerId = R.sdk.playerId();
        SV.flush();
        return true;
    };

    // Пометить "есть несохранённые изменения" — цикл игры сохранит в ближайший кадр
    SV.mark = () => { dirty = true; };

    // Вызывается из игрового цикла. Локально — не чаще раза в 0.5 сек
    SV.update = (force) => {
        const now = Date.now();
        if ((dirty && now - lastLocal > 500) || force) {
            SV.storage.set(KEY, SV.serialize());
            lastLocal = now;
            dirty = false;
            if (force === 'urgent' || now - lastCloud > CLOUD_GAP) {
                lastCloud = now;
                R.sdk.saveCloud(G.S, force === 'urgent');
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
})(typeof window !== 'undefined' ? window : globalThis);
