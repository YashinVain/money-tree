// game.js — правила игры: состояние, формулы дохода и все действия игрока.
// Здесь нет ни отрисовки, ни звука — только логика. Поэтому этот файл можно
// запускать и в node (симулятор баланса tools/sim.js, тесты tools/test.js).
// Об изменениях логика сообщает событиями R.emit(...), а интерфейс их слушает.

(function (root) {
    const R = root.R = root.R || {};
    const CFG = R.CFG;
    const G = R.game = {};

    // Часы игры. В браузере — реальное время, в симуляторе подменяются
    G.now = () => Date.now();

    // ---------- Состояние ----------
    G.newState = () => ({
        v: 3,
        coins: 0,
        runEarned: 0,         // заработано в текущем саду (от него считаются семена)
        lifeEarned: 0,        // заработано за всё время
        level: 0,             // уровень дерева, 0..120
        helpers: CFG.helpers.map(() => 0),
        charge: 0,            // заполненность радуги
        buffEnd: 0,
        cooldownEnd: 0,
        frenzyEnd: 0,
        seeds: 0,             // золотые семена (валюта престижа)
        seedsLife: 0,
        perks: {},
        prestiges: 0,
        bestLevel: 0,
        stats: { taps: 0, crits: 0, releases: 0, comets: 0, buys: 0, helpersBought: 0, playMs: 0, ads: 0 },
        ach: {},
        boosts: { incomeX2End: 0, chargeX2End: 0 },
        adReady: { shower: 0, chest: 0 },
        maxStageEver: 0,      // самая высокая стадия, до которой дерево дорастало в прошлых садах
        freeChestAt: 0,
        daily: null,
        gift: { lastDay: '', streak: 0 },
        hints: {},
        settings: { lang: null, sound: true, music: true, vibro: true },
        pendingOffline: 0,    // копилка, которую игрок ещё не забрал (не теряется при перезагрузке)
        pendingAway: 0,       // сколько секунд игрока не было (для окна копилки)
        pendingGift: 0,       // подарок за новую стадию, который ещё не забрали
        playerId: '',         // id игрока Яндекса, чей это сад
        playerAuthed: false,  // сад вошедшего аккаунта (а не гостя)
        savedAt: 0
    });

    G.S = G.newState();

    // ---------- Дерево ----------
    const LPS = CFG.levelsPerStage;
    G.maxLevel = CFG.stages.length * LPS;

    G.stageIndex = (level = G.S.level) => Math.min(Math.floor(level / LPS), CFG.stages.length - 1);
    G.stage = (level = G.S.level) => CFG.stages[G.stageIndex(level)];
    G.subLevel = (level = G.S.level) => (level >= G.maxLevel ? LPS : level % LPS);
    G.isMaxed = () => G.S.level >= G.maxLevel;

    // Цена покупки уровня level+1
    G.treePrice = (level = G.S.level) => {
        if (level >= G.maxLevel) return Infinity;
        const st = CFG.stages[Math.floor(level / LPS)];
        return Math.ceil(st.basePrice * Math.pow(st.priceGrowth, level % LPS));
    };

    const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));

    // Сила тапа от уровней дерева (без множителей)
    G.tapBaseAt = (level) => {
        let v = 1;
        for (let i = 0; i < CFG.stages.length; i++) {
            v += clamp(level - i * LPS, 0, LPS) * CFG.stages[i].tapPerLevel;
        }
        return v;
    };
    G.tapBase = () => G.tapBaseAt(G.S.level);

    // Способность стадии действует, как только дерево до неё доросло
    G.stageReached = (index) => G.S.level >= index * LPS;

    // Сумма способностей всех достигнутых стадий данного типа
    G.stagePerk = (type) => {
        let sum = 0;
        CFG.stages.forEach((st, i) => {
            if (st.perk && st.perk[type] !== undefined && G.stageReached(i)) sum += st.perk[type];
        });
        return sum;
    };

    // ---------- Волшебные цветы ----------
    G.flowerUnlocked = (i) => G.S.level >= CFG.flowers[i].unlockLevel;
    G.flowerCount = () => CFG.flowers.filter((f, i) => G.flowerUnlocked(i)).length;

    // Сумма эффектов распустившихся цветов данного типа
    G.flowerEffect = (type) => {
        let sum = 0;
        CFG.flowers.forEach((f, i) => {
            if (f.effect[type] !== undefined && G.flowerUnlocked(i)) sum += f.effect[type];
        });
        return sum;
    };

    // ---------- Бонусы сада (престиж) ----------
    G.perkLevel = (id) => G.S.perks[id] || 0;
    G.perkCfg = (id) => CFG.perks.find(p => p.id === id);
    G.perkValue = (id) => G.perkLevel(id) * G.perkCfg(id).effect;

    G.achCount = () => Object.keys(G.S.ach).length;

    // ---------- Множители ----------
    // Общий множитель ко всем монеткам (тап + зверята)
    G.globalMult = () => {
        let m = 1 + G.perkValue('can');
        m *= 1 + G.achCount() * CFG.achievementBonus;
        m *= 1 + G.stagePerk('globalMult');
        m *= 1 + G.flowerEffect('globalMult');
        if (G.S.boosts.incomeX2End > G.now()) m *= 2;
        return m;
    };

    // То же, но без рекламного x2 — награды и цели не должны удваиваться от бонуса
    G.baseMult = () => G.globalMult() / (G.S.boosts.incomeX2End > G.now() ? 2 : 1);

    G.buffActive = () => G.S.buffEnd > G.now();
    G.buffMultValue = () => G.flowerEffect('buffMult') || CFG.buffMult;
    G.buffMult = () => (G.buffActive() ? G.buffMultValue() : 1);
    G.frenzyActive = () => G.S.frenzyEnd > G.now();

    G.critChance = () => CFG.critChance + G.flowerEffect('critChance');
    G.critMult = () => CFG.critMult + G.flowerEffect('critMult') + G.stagePerk('critMult');

    G.tapValue = (crit) => {
        let v = G.tapBase() * G.globalMult() * G.buffMult();
        if (G.frenzyActive()) v *= CFG.frenzyMult;
        if (crit) v *= G.critMult();
        return v;
    };

    // Вехи зверька: x2 на 10, 25, 50... уровнях
    G.helperMilestoneMult = (level) => {
        let m = 1;
        CFG.helperMilestones.forEach(ms => { if (level >= ms) m *= 2; });
        return m;
    };
    G.nextMilestone = (level) => CFG.helperMilestones.find(ms => ms > level) || null;

    // Доход зверька в секунду (без общего множителя и баффа)
    G.helperRateAt = (i, level) => {
        if (level <= 0) return 0;
        return level * CFG.helpers[i].rate * G.helperMilestoneMult(level) * (1 + G.flowerEffect('helperMult'));
    };
    G.helperRate = (i) => G.helperRateAt(i, G.S.helpers[i]);

    G.passiveBase = () => CFG.helpers.reduce((sum, h, i) => sum + G.helperRate(i), 0);
    G.passivePerSec = () => G.passiveBase() * G.globalMult() * G.buffMult();

    G.autoTapRate = () => G.stagePerk('autoTap');
    G.instantChance = () => G.stagePerk('instantCharge');

    // Доход в секунду для подписи "+N/сек": зверята + авто-тап (без активных тапов)
    G.incomePerSecShown = () => (G.passiveBase() + G.autoTapRate() * G.tapBase() * (1 + G.critChance() * (G.critMult() - 1))) * G.globalMult();

    G.chargePerTap = () => {
        let c = 1;
        c *= 1 + G.stagePerk('chargeSpeed');
        c *= 1 + G.flowerEffect('chargeSpeed');
        c *= 1 + G.perkValue('fertilizer');
        if (G.S.boosts.chargeX2End > G.now()) c *= 2;
        return c;
    };

    G.buffDurationMs = () => {
        let d = CFG.buffDuration;
        d *= 1 + G.stagePerk('buffDuration');
        d *= 1 + G.flowerEffect('buffDuration');
        d *= 1 + G.perkValue('fertilizer') * 0.5;
        return d;
    };

    // ---------- Монетки ----------
    // Доход, заработанный прямо в игре (тапы и зверята, без копилки и подарков) — для заданий
    G.liveEarned = 0;

    G.addCoins = (amount) => {
        if (!(amount > 0)) return;
        G.S.coins += amount;
        G.S.runEarned += amount;
        G.S.lifeEarned += amount;
    };

    G.spend = (price) => {
        if (G.S.coins + 1e-9 < price) return false;
        G.S.coins = Math.max(0, G.S.coins - price);
        return true;
    };

    // ---------- Тап ----------
    // source: 'player' (палец/мышь) или 'auto' (ветерок сам трясёт дерево)
    G.tap = (source = 'player') => {
        const crit = Math.random() < G.critChance();
        const value = G.tapValue(crit);
        G.addCoins(value);
        G.liveEarned += value;

        const before = G.S.charge;
        G.S.charge = Math.min(CFG.chargeMax, G.S.charge + G.chargePerTap());
        let instant = false;
        if (G.S.charge < CFG.chargeMax && Math.random() < G.instantChance()) {
            G.S.charge = CFG.chargeMax;
            instant = true;
        }
        if (source === 'player') {
            G.S.stats.taps++;
            if (crit) G.S.stats.crits++;
        }
        const result = { value, crit, instant, source, filled: before < CFG.chargeMax && G.S.charge >= CFG.chargeMax };
        R.emit('tap', result);
        return result;
    };

    // ---------- Радуга ----------
    G.canRelease = () => G.S.charge >= CFG.chargeMax && G.now() >= G.S.cooldownEnd;
    G.cooldownLeft = () => Math.max(0, G.S.cooldownEnd - G.now());
    G.buffLeft = () => Math.max(0, G.S.buffEnd - G.now());

    G.release = () => {
        if (!G.canRelease()) return false;
        G.S.charge = 0;
        const dur = G.buffDurationMs();
        G.S.buffEnd = Math.max(G.S.buffEnd, G.now()) + dur;
        G.S.cooldownEnd = G.S.buffEnd + CFG.buffCooldown;
        G.S.stats.releases++;
        R.emit('release', { duration: dur, mult: G.buffMultValue() });
        return true;
    };

    // ---------- Рост дерева ----------
    function levelUpTree() {
        const beforeStage = G.stageIndex();
        const before = CFG.flowers.map((f, i) => G.flowerUnlocked(i));
        G.S.level++;
        G.S.bestLevel = Math.max(G.S.bestLevel, G.S.level);
        G.S.stats.buys++;
        const newFlowers = CFG.flowers.map((f, i) => i).filter(i => !before[i] && G.flowerUnlocked(i));
        return { stageChanged: G.stageIndex() !== beforeStage, stage: G.stageIndex(), newFlowers };
    }

    function announceGrowth(result) {
        R.emit('buyTree', result);
        if (result.stageChanged) R.emit('stage', result);
        result.newFlowers.forEach(i => R.emit('flower', { index: i }));
    }

    G.buyTree = () => {
        if (G.isMaxed()) return null;
        if (!G.spend(G.treePrice())) return null;
        const info = levelUpTree();
        info.count = 1;
        announceGrowth(info);
        return info;
    };

    // "Макс" покупает уровни только до конца ТЕКУЩЕЙ стадии: переход на новую
    // стадию — отдельное радостное нажатие (просьба игрока из первой версии)
    G.treeMaxPlan = () => {
        if (G.isMaxed()) return { count: 0, price: 0 };
        const stageEnd = (Math.floor(G.S.level / LPS) + 1) * LPS;
        let lvl = G.S.level, money = G.S.coins, total = 0, count = 0;
        while (lvl < stageEnd) {
            const p = G.treePrice(lvl);
            if (money < p) break;
            money -= p; total += p; lvl++; count++;
        }
        return { count, price: total };
    };

    G.buyTreeMax = () => {
        const plan = G.treeMaxPlan();
        if (plan.count === 0) return null;
        const result = { count: 0, stage: 0, stageChanged: false, newFlowers: [] };
        for (let k = 0; k < plan.count; k++) {
            if (!G.spend(G.treePrice())) break;
            const info = levelUpTree();
            result.count++;
            result.stageChanged = result.stageChanged || info.stageChanged;
            result.newFlowers.push(...info.newFlowers);
        }
        result.stage = G.stageIndex();
        announceGrowth(result);
        return result;
    };

    // ---------- Зверята ----------
    G.helperPrice = (i, level = G.S.helpers[i]) => {
        const h = CFG.helpers[i];
        return Math.ceil(h.basePrice * Math.pow(h.priceGrowth, level));
    };

    G.helperBulkPrice = (i, count) => {
        let total = 0;
        for (let k = 0; k < count; k++) total += G.helperPrice(i, G.S.helpers[i] + k);
        return total;
    };

    G.helperMaxAffordable = (i) => {
        let lvl = G.S.helpers[i], money = G.S.coins, count = 0;
        while (count < 1000) {
            const p = G.helperPrice(i, lvl);
            if (money < p) break;
            money -= p; lvl++; count++;
        }
        return count;
    };

    // Зверёк "показан" в списке, если уже живёт в саду, если предыдущий нанят
    // или если на него почти хватает — остальные спрятаны под знаком вопроса
    G.helperRevealed = (i) => {
        if (i === 0 || G.S.helpers[i] > 0 || G.S.helpers[i - 1] > 0) return true;
        return G.S.runEarned >= CFG.helpers[i].basePrice * 0.5;
    };

    G.buyHelper = (i, count = 1) => {
        if (count === 'max') count = G.helperMaxAffordable(i);
        if (count <= 0) return 0;
        const before = G.S.helpers[i];
        let bought = 0;
        for (let k = 0; k < count; k++) {
            if (!G.spend(G.helperPrice(i))) break;
            G.S.helpers[i]++;
            bought++;
        }
        if (bought > 0) {
            G.S.stats.buys += bought;
            G.S.stats.helpersBought += bought;
            const after = G.S.helpers[i];
            const milestone = CFG.helperMilestones.filter(ms => before < ms && after >= ms).pop() || null;
            R.emit('buyHelper', { index: i, count: bought, first: before === 0, milestone });
        }
        return bought;
    };

    // ---------- Ход времени ----------
    // dt — секунды. Начисляет доход зверят и делает авто-тапы ветерка
    let autoTapAcc = 0;
    let passiveAcc = 0;
    G.tick = (dt) => {
        dt = Math.min(dt, 1);
        G.S.stats.playMs += dt * 1000;
        const passive = G.passivePerSec() * dt;
        G.addCoins(passive);
        G.liveEarned += passive;
        passiveAcc += passive;

        const taps = [];
        const rate = G.autoTapRate();
        if (rate > 0) {
            autoTapAcc += rate * dt;
            while (autoTapAcc >= 1) {
                autoTapAcc -= 1;
                taps.push(G.tap('auto'));
            }
        }
        return { passive, taps };
    };

    // Пока открыто окно (подарок, цели), зверята продолжают работать —
    // без бонуса радуги (её таймер на это время заморожен)
    G.tickIdle = (dt) => {
        dt = Math.min(dt, 120);
        const passive = G.passiveBase() * G.globalMult() * dt;
        G.addCoins(passive);
        G.liveEarned += passive;
        return passive;
    };

    // Сколько принесли зверята с прошлого вызова — для летящих "+N"
    G.takePassiveAccum = () => { const v = passiveAcc; passiveAcc = 0; return v; };

    // ---------- Копилка (оффлайн) ----------
    G.offlineCapSec = () => CFG.offlineMaxSec + G.perkValue('basket') * 3600;
    G.offlineRate = () => CFG.offlineRate * (1 + G.flowerEffect('offlineMult'));

    // Пока игрока нет, зверята продолжают работать (30% скорости, до 4 часов, Корзинка — больше)
    G.offlineCapAmount = () => G.passiveBase() * G.globalMult() * G.offlineCapSec() * G.offlineRate();

    G.offlineGain = (seconds) => {
        if (seconds < CFG.offlineMinSec) return 0;
        const sec = Math.min(seconds, G.offlineCapSec());
        return G.passiveBase() * G.globalMult() * sec * G.offlineRate();
    };

    // ---------- Новый сад (престиж) ----------
    G.canPrestige = () => G.S.level >= CFG.prestigeLevel;
    G.seedsOnPrestige = () => Math.floor(Math.sqrt(G.S.runEarned / CFG.seedDivisor));
    G.nextSeedAt = () => {
        const n = G.seedsOnPrestige() + 1;
        return n * n * CFG.seedDivisor;
    };

    G.prestige = () => {
        if (!G.canPrestige()) return 0;
        const gained = G.seedsOnPrestige();
        if (gained <= 0) return 0;

        // Самый доходный зверёк всегда переезжает в новый сад: с половиной уровней,
        // а с Дневником садовника — со всеми (детям не так грустно расставаться)
        let keep = -1, best = 0;
        G.S.helpers.forEach((lvl, i) => {
            const r = G.helperRateAt(i, lvl);
            if (r > best) { best = r; keep = i; }
        });
        const keepLevels = keep >= 0 ? Math.floor(G.S.helpers[keep] * (G.perkLevel('diary') > 0 ? 1 : CFG.keepBestHelper)) : 0;

        G.S.maxStageEver = Math.max(G.S.maxStageEver, G.stageIndex());
        G.S.seeds += gained;
        G.S.seedsLife += gained;
        G.S.prestiges++;
        G.S.coins = 0;
        G.S.runEarned = 0;
        G.S.level = Math.min(G.perkValue('bed'), G.maxLevel);
        G.S.helpers = G.S.helpers.map((lvl, i) => (i === keep ? keepLevels : 0));
        G.S.charge = 0;
        G.S.buffEnd = 0;
        G.S.cooldownEnd = 0;
        G.S.frenzyEnd = 0;

        // Стартовый подарок нового сада — чтобы начало не ощущалось потерей
        let gift = 0;
        for (let k = 0; k < CFG.gardenGiftLevels; k++) gift += G.treePrice(G.S.level + k);
        gift *= 1 + G.perkValue('can');
        G.S.coins = gift;
        R.emit('prestige', { gained, gift });
        return gained;
    };

    G.perkPrice = (id) => {
        const p = G.perkCfg(id);
        return p.basePrice + p.priceStep * G.perkLevel(id);
    };
    G.perkMaxed = (id) => {
        const p = G.perkCfg(id);
        return p.max > 0 && G.perkLevel(id) >= p.max;
    };
    G.buyPerk = (id) => {
        if (G.perkMaxed(id)) return false;
        const price = G.perkPrice(id);
        if (G.S.seeds < price) return false;
        G.S.seeds -= price;
        G.S.perks[id] = G.perkLevel(id) + 1;
        R.emit('buyPerk', { id });
        return true;
    };

    // Подарок за новую стадию дерева
    G.stageGift = () => G.secondsOfIncome(CFG.stageGiftSeconds);

    // ---------- Золотая бабочка ----------
    G.cometLuckMult = () => 1 + G.perkValue('net');
    G.cometRateMult = () => G.cometLuckMult() * (1 + G.flowerEffect('cometRate'));

    // "N секунд дохода" — мерило для наград (бабочка, корзинки, задания, подарок).
    // Считаем и активную игру (3 тапа в секунду), чтобы награда ощущалась
    G.secondsOfIncome = (sec) => {
        const perSec = (G.passiveBase() + (3 + G.autoTapRate()) * G.tapBase()) * G.baseMult();
        return Math.max(perSec * sec, 2 * sec);
    };

    G.catchComet = () => {
        const list = CFG.cometRewards;
        const total = list.reduce((s, r) => s + r.weight, 0);
        let roll = Math.random() * total, reward = list[0];
        for (const r of list) { roll -= r.weight; if (roll <= 0) { reward = r; break; } }
        if (reward.id === 'overcharge' && G.canRelease()) reward = list.find(r => r.id === 'stardust') || reward;

        const result = { id: reward.id, amount: 0 };
        if (reward.id === 'stardust') {
            result.amount = G.secondsOfIncome(CFG.stardustSeconds) * G.cometLuckMult();
            G.addCoins(result.amount);
        } else if (reward.id === 'frenzy') {
            result.duration = CFG.frenzyDuration * G.cometLuckMult();
            G.S.frenzyEnd = G.now() + result.duration;
        } else if (reward.id === 'overcharge') {
            G.S.charge = CFG.chargeMax;
            G.S.cooldownEnd = G.now();
        }
        G.S.stats.comets++;
        R.emit('comet', result);
        return result;
    };

    // ---------- Бесплатная корзинка ----------
    G.freeChestReady = () => G.S.freeChestAt <= G.now();
    G.freeChestAmount = () => G.secondsOfIncome(CFG.freeChest.seconds);
    G.claimFreeChest = () => {
        if (!G.freeChestReady()) return 0;
        const amount = G.freeChestAmount();
        G.addCoins(amount);
        G.S.freeChestAt = G.now() + CFG.freeChest.cooldown;
        R.emit('freeChest', { amount });
        return amount;
    };

    // ---------- Награды за рекламу ----------
    G.adAvailable = (type) => {
        const now = G.now();
        if (type === 'incomeX2') {
            const left = G.S.boosts.incomeX2End - now;
            return left < (CFG.ads.incomeX2.maxMinutes - CFG.ads.incomeX2.minutes) * 60000;
        }
        return (G.S.adReady[type] || 0) <= now;
    };

    G.applyAdReward = (type) => {
        const now = G.now();
        const result = { type, amount: 0 };
        if (type === 'incomeX2') {
            G.S.boosts.incomeX2End = Math.max(G.S.boosts.incomeX2End, now) + CFG.ads.incomeX2.minutes * 60000;
        } else if (type === 'shower') {
            // Радужный дождь на целую минуту, после него радуга сразу готова к новому кругу
            G.S.buffEnd = Math.max(G.S.buffEnd, now) + CFG.ads.shower.seconds * 1000;
            G.S.cooldownEnd = G.S.buffEnd;
            G.S.adReady.shower = now + CFG.ads.shower.cooldown;
            R.emit('release', { duration: CFG.ads.shower.seconds * 1000, mult: G.buffMultValue(), ad: true });
        } else if (type === 'chest') {
            result.amount = G.secondsOfIncome(CFG.ads.chest.seconds);
            G.addCoins(result.amount);
            G.S.adReady.chest = now + CFG.ads.chest.cooldown;
        }
        G.S.stats.ads++;
        R.emit('adReward', result);
        return result;
    };
})(typeof window !== 'undefined' ? window : globalThis);
