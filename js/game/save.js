// save.js — сохранение прогресса. Пишем в localStorage почти сразу после
// каждого действия (требование Яндекса 1.9) и раз в ~20 сек в облако Яндекса,
// если SDK доступен. При загрузке берём самое свежее из двух сохранений.

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
        G.S.savedAt = Date.now();
        return JSON.stringify(G.S);
    };

    // Аккуратно накладываем сохранение на чистое состояние: так новые поля,
    // появившиеся в обновлениях игры, получают значения по умолчанию
    SV.apply = (data) => {
        const fresh = G.newState();
        const merge = (target, src) => {
            Object.keys(src).forEach(k => {
                const v = src[k];
                if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
                    merge(target[k], v);
                } else if (v !== undefined) {
                    target[k] = v;
                }
            });
        };
        merge(fresh, data);
        // Любое число из сохранения проверяем: не число или меньше нуля — ставим 0
        const num = (v) => { v = +v; return isFinite(v) && v > 0 ? v : 0; };
        const helpers = Array.isArray(fresh.helpers) ? fresh.helpers : [];
        fresh.helpers = R.CFG.helpers.map((h, i) => Math.floor(num(helpers[i])));
        ['coins', 'runEarned', 'lifeEarned', 'seeds', 'seedsLife', 'charge', 'buffEnd', 'cooldownEnd', 'frenzyEnd',
            'prestiges', 'bestLevel', 'freeChestAt', 'savedAt'].forEach(k => { fresh[k] = num(fresh[k]); });
        Object.keys(fresh.stats).forEach(k => { fresh.stats[k] = num(fresh.stats[k]); });
        Object.keys(fresh.boosts).forEach(k => { fresh.boosts[k] = num(fresh.boosts[k]); });
        Object.keys(fresh.adReady).forEach(k => { fresh.adReady[k] = num(fresh.adReady[k]); });
        Object.keys(fresh.perks).forEach(k => { fresh.perks[k] = Math.floor(num(fresh.perks[k])); });
        fresh.level = Math.min(G.maxLevel, Math.floor(num(fresh.level)));
        fresh.charge = Math.min(R.CFG.chargeMax, fresh.charge);
        G.S = fresh;
    };

    SV.readLocal = () => {
        const raw = SV.storage.get(KEY);
        if (raw) {
            try { return JSON.parse(raw); } catch (e) { console.warn('Сохранение повреждено', e); }
        }
        return null;
    };

    // Загрузка при старте: локальное + облачное, побеждает более свежее
    SV.load = async () => {
        const local = SV.readLocal();
        let cloud = null;
        try { cloud = await R.sdk.loadCloud(); } catch (e) { cloud = null; }

        let chosen = local;
        if (cloud && cloud.v && (!local || (cloud.savedAt || 0) > (local.savedAt || 0))) chosen = cloud;
        if (chosen) SV.apply(chosen);
        return chosen ? (chosen.savedAt || 0) : 0;
    };

    // Пометить "есть несохранённые изменения" — сам цикл игры сохранит в ближайший кадр
    SV.mark = () => { dirty = true; };

    // Вызывается из игрового цикла. Локально — не чаще раза в 0.5 сек
    SV.update = (force) => {
        const now = Date.now();
        if ((dirty && now - lastLocal > 500) || force) {
            SV.storage.set(KEY, SV.serialize());
            lastLocal = now;
            dirty = false;
            if (force || now - lastCloud > CLOUD_GAP) {
                lastCloud = now;
                R.sdk.saveCloud(G.S, !!force);
            }
        }
    };

    // Срочное сохранение (уход со страницы, важное событие)
    SV.flush = () => {
        dirty = true;
        SV.update(true);
    };
})(typeof window !== 'undefined' ? window : globalThis);
