// meta.js — "надстройка" над основной игрой: достижения, ежедневные задания
// и подарок за вход. Всё это даёт игроку понятные цели на каждый день.

(function (root) {
    const R = root.R = root.R || {};
    const G = R.game;
    const U = R.util;
    const CFG = R.CFG;
    const M = R.meta = {};

    // ---------- Достижения ----------
    // Каждая группа — одна статистика и несколько порогов. Название берётся
    // из переводов: ach_<группа> + римская цифра ступени
    M.achGroups = [
        { id: 'taps', icon: 'tap', stat: S => S.stats.taps, steps: [100, 1000, 10000, 50000, 200000] },
        { id: 'earn', icon: 'coin', stat: S => S.lifeEarned, steps: [1e4, 1e6, 1e9, 1e12, 1e15] },
        { id: 'tree', icon: 'tree', stat: S => S.bestLevel, steps: [15, 45, 75, 105, 120] },
        { id: 'helpers', icon: 'helpers', stat: S => S.stats.helpersBought, steps: [1, 50, 200, 500, 1000] },
        { id: 'release', icon: 'rainbow', stat: S => S.stats.releases, steps: [1, 25, 100, 500] },
        { id: 'crit', icon: 'goldapple', stat: S => S.stats.crits, steps: [1, 100, 1000] },
        { id: 'comet', icon: 'butterfly', stat: S => S.stats.comets, steps: [1, 10, 50, 150] },
        { id: 'prestige', icon: 'seed', stat: S => S.prestiges, steps: [1, 5, 15, 40] },
        { id: 'time', icon: 'timer', stat: S => S.stats.playMs / 60000, steps: [30, 180, 600] }
    ];

    M.allAchievements = () => {
        const list = [];
        M.achGroups.forEach(g => g.steps.forEach((target, k) => list.push({ id: g.id + '_' + k, group: g, step: k, target })));
        return list;
    };

    // Проверка: возвращает только что открытые достижения
    M.checkAchievements = () => {
        const fresh = [];
        M.allAchievements().forEach(a => {
            if (G.S.ach[a.id]) return;
            if (a.group.stat(G.S) >= a.target) {
                G.S.ach[a.id] = 1;
                fresh.push(a);
            }
        });
        fresh.forEach(a => R.emit('achievement', a));
        return fresh;
    };

    // ---------- Ежедневные задания ----------
    // Шаблоны: цель масштабируется от прогресса игрока
    M.questTypes = {
        taps: { icon: 'tap', make: () => U.pick([250, 400, 600]) },
        releases: { icon: 'rainbow', make: () => U.pick([3, 4, 6]) },
        buys: { icon: 'up', make: () => U.pick([10, 20, 30]) },
        comets: { icon: 'butterfly', make: () => U.pick([1, 2]) },
        helpers: { icon: 'helpers', make: () => U.pick([10, 15, 25]) },
        earn: { icon: 'coin', make: () => Math.max(2000, Math.round(G.secondsOfIncome(900) / 100) * 100) }
    };

    M.ensureDaily = () => {
        const today = U.dayKey(G.now());
        if (G.S.daily && G.S.daily.day >= today) return false;
        const types = Object.keys(M.questTypes);
        // Перемешиваем и берём 3 разных
        for (let i = types.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [types[i], types[j]] = [types[j], types[i]];
        }
        G.S.daily = {
            day: today,
            quests: types.slice(0, CFG.questsPerDay).map(type => ({ type, target: M.questTypes[type].make(), progress: 0, claimed: false })),
            bonusClaimed: false
        };
        return true;
    };

    M.questProgress = (type, amount) => {
        if (!G.S.daily) return;
        G.S.daily.quests.forEach(q => {
            if (q.type !== type || q.claimed || q.progress >= q.target) return;
            const wasDone = q.progress >= q.target;
            q.progress = Math.min(q.target, q.progress + amount);
            if (!wasDone && q.progress >= q.target) R.emit('questDone', q);
        });
    };

    M.questReward = () => G.secondsOfIncome(CFG.questRewardSeconds);

    M.claimQuest = (index) => {
        const q = G.S.daily && G.S.daily.quests[index];
        if (!q || q.claimed || q.progress < q.target) return 0;
        q.claimed = true;
        const amount = M.questReward();
        G.addCoins(amount);
        R.emit('questClaim', { quest: q, amount });
        return amount;
    };

    M.allQuestsClaimed = () => !!G.S.daily && G.S.daily.quests.every(q => q.claimed);

    // Бонус за все 3 задания: золотое семечко (если уже был новый сад) или много монет
    M.dailyBonusInfo = () => (G.S.prestiges > 0
        ? { kind: 'seed', amount: 1 }
        : { kind: 'coins', amount: G.secondsOfIncome(600) });

    M.claimDailyBonus = () => {
        if (!M.allQuestsClaimed() || G.S.daily.bonusClaimed) return null;
        G.S.daily.bonusClaimed = true;
        const info = M.dailyBonusInfo();
        if (info.kind === 'seed') { G.S.seeds += 1; G.S.seedsLife += 1; } else G.addCoins(info.amount);
        R.emit('dailyBonus', info);
        return info;
    };

    // Сколько заданий можно забрать прямо сейчас — для значка на кнопке
    M.claimableCount = () => {
        if (!G.S.daily) return 0;
        let n = G.S.daily.quests.filter(q => !q.claimed && q.progress >= q.target).length;
        if (M.allQuestsClaimed() && !G.S.daily.bonusClaimed) n++;
        return n;
    };

    // ---------- Подарок за вход ----------
    // Подарок доступен только в новый день (если часы перевели назад — нет)
    M.giftAvailable = () => !G.S.gift.lastDay || G.S.gift.lastDay < U.dayKey(G.now());

    // Номер дня серии, который получит игрок, если заберёт подарок сейчас (1..7)
    M.giftStreakDay = () => {
        const today = U.dayKey(G.now());
        const g = G.S.gift;
        if (!g.lastDay) return 1;
        if (g.lastDay === today) return ((g.streak - 1) % 7) + 1;
        const gap = U.daysBetween(g.lastDay, today);
        return gap === 1 ? (g.streak % 7) + 1 : 1;
    };

    M.giftAmount = (day = M.giftStreakDay()) => G.secondsOfIncome(CFG.dailyGiftSeconds[day - 1]);
    M.giftSeeds = (day = M.giftStreakDay()) => (day === 7 ? CFG.giftDay7Seeds : 0);

    M.claimGift = () => {
        if (!M.giftAvailable()) return 0;
        const day = M.giftStreakDay();
        const amount = M.giftAmount(day);
        const today = U.dayKey(G.now());
        const gap = G.S.gift.lastDay ? U.daysBetween(G.S.gift.lastDay, today) : 0;
        G.S.gift.streak = gap === 1 ? G.S.gift.streak + 1 : 1;
        G.S.gift.lastDay = today;
        G.addCoins(amount);
        const seeds = M.giftSeeds(day);
        if (seeds) { G.S.seeds += seeds; G.S.seedsLife += seeds; }
        R.emit('gift', { day, amount, seeds });
        return amount;
    };

    // ---------- Связь с событиями игры ----------
    M.attach = () => {
        R.on('tap', r => { if (r.source === 'player') M.questProgress('taps', 1); });
        R.on('release', () => M.questProgress('releases', 1));
        R.on('buyTree', r => M.questProgress('buys', r.count));
        R.on('buyHelper', r => { M.questProgress('buys', r.count); M.questProgress('helpers', r.count); });
        R.on('comet', () => M.questProgress('comets', 1));
    };

    // "Заработать X" — только то, что заработано прямо в игре (тапы и зверята),
    // копилка и подарки не считаются. Вызывается из игрового цикла
    M.trackEarn = () => {
        if (G.liveEarned > 0) M.questProgress('earn', G.liveEarned);
        G.liveEarned = 0;
    };
})(typeof window !== 'undefined' ? window : globalThis);
