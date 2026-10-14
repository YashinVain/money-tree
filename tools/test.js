// test.js — автотесты правил игры. Запуск: node tools/test.js
// Проверяют логику без браузера: покупки, радугу, новый сад, копилку,
// сохранения, задания, форматирование чисел. Если что-то сломается при
// изменении баланса или кода — тест покажет, что именно.

const path = require('path');
global.window = global;
global.localStorage = (() => {
    let store = {};
    return {
        getItem: (k) => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
        clear: () => { store = {}; }
    };
})();
['js/core/util.js', 'js/core/i18n.js', 'js/game/config.js', 'js/game/game.js', 'js/game/meta.js'].forEach(f => require(path.join(__dirname, '..', f)));
// SDK в тестах — заглушка без облака
global.R.sdk = { loadCloud: async () => ({ ok: false, data: null }), saveCloud: () => { }, playerId: () => '' };
require(path.join(__dirname, '..', 'js/game/save.js'));

const R = global.R, G = R.game, M = R.meta, CFG = R.CFG, U = R.util;
let clock = 1700000000000;
G.now = () => clock;

let passed = 0, failed = 0;
function test(name, fn) {
    G.S = G.newState();
    G.liveEarned = 0;
    try {
        fn();
        passed++;
        console.log('  ✓ ' + name);
    } catch (e) {
        failed++;
        console.log('  ✗ ' + name + '\n      ' + e.message);
    }
}
function eq(a, b, msg) { if (a !== b) throw new Error((msg || '') + ` ожидалось ${JSON.stringify(b)}, получено ${JSON.stringify(a)}`); }
function ok(v, msg) { if (!v) throw new Error(msg || 'условие не выполнено'); }

console.log('Логика игры:');

test('тап даёт монетку и наполняет радугу', () => {
    const rnd = Math.random;
    Math.random = () => 0.5;          // без золотого тапа
    const r = G.tap('player');
    Math.random = rnd;
    eq(r.value, 1);
    eq(G.S.coins, 1);
    eq(G.S.charge, 1);
    eq(G.S.stats.taps, 1);
});

test('нельзя купить без денег, покупка тратит монетки', () => {
    eq(G.buyTree(), null);
    G.addCoins(100);
    const price = G.treePrice();
    ok(G.buyTree());
    eq(G.S.level, 1);
    eq(G.S.coins, 100 - price);
});

test('«Макс» останавливается на конце стадии', () => {
    G.addCoins(1e9);
    G.buyTreeMax();
    eq(G.S.level, CFG.levelsPerStage, 'после первого Макс');
    G.buyTreeMax();
    eq(G.S.level, CFG.levelsPerStage * 2, 'после второго Макс');
});

test('новая стадия и цветок сообщаются событиями', () => {
    let stage = 0, flower = 0;
    R.on('stage', () => stage++);
    R.on('flower', () => flower++);
    G.S.level = CFG.levelsPerStage - 1;
    G.addCoins(1e9);
    G.buyTree();
    ok(stage >= 1, 'событие stage');
    ok(flower >= 1, 'событие flower');
    ok(G.flowerUnlocked(0), 'подсолнух расцвёл');
});

test('радуга: нужна полная шкала, потом x2 и отдых', () => {
    eq(G.release(), false);
    G.S.charge = CFG.chargeMax;
    ok(G.release());
    eq(G.S.charge, 0);
    ok(G.buffActive());
    eq(G.buffMult(), 2);
    G.S.charge = CFG.chargeMax;
    eq(G.canRelease(), false, 'во время отдыха нельзя');
    clock += 120000;
    ok(G.canRelease(), 'после отдыха можно');
});

test('подсолнух делает радугу x3', () => {
    G.S.level = 20;
    G.S.buffEnd = clock + 1000;
    eq(G.buffMult(), 3);
});

test('зверята приносят доход, вехи удваивают', () => {
    eq(G.passivePerSec(), 0);
    G.S.helpers[0] = 9;
    const before = G.helperRate(0);
    G.S.helpers[0] = 10;
    const after = G.helperRate(0);
    ok(after > before * 2, 'на 10 уровне доход больше чем вдвое');
    G.tick(1);
    ok(G.S.coins > 0);
});

test('покупка зверят пачкой и максимумом', () => {
    G.addCoins(1e6);
    const n = G.buyHelper(0, 10);
    eq(n, 10);
    const m = G.buyHelper(1, 'max');
    ok(m > 0);
    ok(G.S.coins < G.helperPrice(1), 'на ещё один уровень не хватает');
});

test('ветерок трясёт дерево сам со стадии Деревце', () => {
    G.S.level = 45;
    const r = G.tick(1);
    eq(r.taps.length, 2);
});

test('копилка: 30% дохода, не больше лимита, не за минуту', () => {
    G.S.helpers[0] = 10;
    const perSec = G.passiveBase() * G.globalMult();
    eq(G.offlineGain(30), 0, 'меньше минуты — ничего');
    const g = G.offlineGain(3600);
    ok(Math.abs(g - perSec * 3600 * CFG.offlineRate) < 1e-6);
    eq(G.offlineGain(1e9), G.offlineGain(G.offlineCapSec()), 'лимит');
});

test('новый сад: семена, сброс, бонусы остаются', () => {
    G.S.level = 80;
    G.S.runEarned = 25e6;
    G.S.helpers = [10, 5, 0, 0, 0, 0];
    G.S.perks.can = 2;
    const gain = G.seedsOnPrestige();
    eq(gain, 5);
    eq(G.prestige(), 5);
    eq(G.S.level, 0);
    ok(G.S.coins > 0, 'стартовый подарок нового сада');
    ok(G.S.coins >= G.treePrice(0) * CFG.gardenGiftLevels, 'хватает на несколько уровней');
    eq(G.S.helpers.join(','), '0,2,0,0,0,0', 'лучший зверёк переехал с половиной уровней');
    eq(G.S.seeds, 5);
    eq(G.S.perks.can, 2);
});

test('новый сад без семян не стирает прогресс', () => {
    G.S.level = 80;
    G.S.runEarned = 10;
    G.S.coins = 500;
    eq(G.prestige(), 0);
    eq(G.S.level, 80);
    eq(G.S.coins, 500);
});

test('дневник садовника сохраняет лучшего зверька', () => {
    G.S.level = 80;
    G.S.runEarned = 4e6;
    G.S.perks.diary = 1;
    G.S.helpers = [30, 20, 5, 0, 0, 0];
    G.prestige();
    eq(G.S.helpers.filter(x => x > 0).length, 1, 'остаётся один зверёк');
    ok(G.S.helpers[1] === 20 || G.S.helpers[2] === 5 || G.S.helpers[0] === 30, 'со всеми уровнями');
});

test('грядка стартует новый сад с уровнями', () => {
    G.S.level = 80;
    G.S.runEarned = 4e6;
    G.S.perks.bed = 2;
    G.prestige();
    eq(G.S.level, 10);
});

test('вечные бонусы: цена растёт, есть максимум', () => {
    G.S.seeds = 100;
    const p1 = G.perkPrice('fertilizer');
    ok(G.buyPerk('fertilizer'));
    ok(G.perkPrice('fertilizer') > p1);
    G.S.perks.diary = 1;
    eq(G.buyPerk('diary'), false, 'дневник покупается один раз');
});

test('бабочка всегда даёт награду', () => {
    for (let i = 0; i < 50; i++) {
        const r = G.catchComet();
        ok(['stardust', 'frenzy', 'overcharge'].includes(r.id));
    }
    eq(G.S.stats.comets, 50);
});

test('реклама: x2 копится до 4 часов', () => {
    for (let i = 0; i < 30; i++) if (G.adAvailable('incomeX2')) G.applyAdReward('incomeX2');
    ok(G.S.boosts.incomeX2End - clock <= CFG.ads.incomeX2.maxMinutes * 60000);
    ok(G.globalMult() >= 2);
});

test('бесплатная корзинка раз в 3 часа', () => {
    ok(G.claimFreeChest() > 0);
    eq(G.claimFreeChest(), 0);
    clock += CFG.freeChest.cooldown;
    ok(G.claimFreeChest() > 0);
});

test('золотой тап есть с самого начала, роза его усиливает', () => {
    eq(G.critChance(), CFG.critChance);
    const base = G.critMult();
    G.S.level = 75;
    ok(G.critChance() > CFG.critChance && G.critMult() > base);
});

test('реклама: радужный дождь на минуту', () => {
    G.applyAdReward('shower');
    ok(G.buffActive());
    ok(G.buffLeft() >= 59000);
    eq(G.adAvailable('shower'), false);
});

test('задание «заработай» не засчитывает копилку', () => {
    M.ensureDaily();
    G.S.daily.quests[0] = { type: 'earn', target: 100, progress: 0, claimed: false };
    G.addCoins(1000);                 // как будто забрали копилку
    M.trackEarn();
    eq(G.S.daily.quests[0].progress, 0);
    for (let i = 0; i < 5; i++) G.tap('player');
    M.trackEarn();
    ok(G.S.daily.quests[0].progress >= 5);
});

console.log('Задания, подарки, достижения:');

test('ежедневные задания создаются и выполняются', () => {
    M.ensureDaily();
    eq(G.S.daily.quests.length, 3);
    const q = G.S.daily.quests[0];
    M.questProgress(q.type, q.target);
    ok(M.claimQuest(0) > 0);
    eq(M.claimQuest(0), 0, 'второй раз нельзя');
});

test('на следующий день новые задания', () => {
    M.ensureDaily();
    const day = G.S.daily.day;
    clock += 86400000;
    ok(M.ensureDaily());
    ok(G.S.daily.day !== day);
});

test('подарок дня: серия растёт и сбрасывается', () => {
    ok(M.giftAvailable());
    M.claimGift();
    eq(M.giftAvailable(), false);
    clock += 86400000;
    eq(M.giftStreakDay(), 2);
    M.claimGift();
    clock += 3 * 86400000;
    eq(M.giftStreakDay(), 1, 'пропуск дней — серия заново');
    eq(M.giftSeeds(7), CFG.giftDay7Seeds, 'седьмой день — семена');
});

test('достижения открываются по статистике', () => {
    G.S.stats.taps = 150;
    const fresh = M.checkAchievements();
    ok(fresh.some(a => a.id === 'taps_0'));
    ok(G.globalMult() > 1, 'достижение даёт бонус');
});

console.log('Сохранения:');

test('сохранение и загрузка сохраняют прогресс', () => {
    G.S.level = 33;
    G.S.coins = 12345;
    G.S.helpers[2] = 7;
    const json = R.save.serialize();
    G.S = G.newState();
    G.liveEarned = 0;
    R.save.apply(JSON.parse(json));
    eq(G.S.level, 33);
    eq(G.S.coins, 12345);
    eq(G.S.helpers[2], 7);
});

test('достижения, бонусы и подсказки переживают перезагрузку', () => {
    G.S.ach.taps_0 = 1;
    G.S.perks.can = 3;
    G.S.hints.tap = 1;
    const json = R.save.serialize();
    G.S = G.newState();
    R.save.apply(JSON.parse(json));
    eq(G.S.ach.taps_0, 1);
    eq(G.S.perks.can, 3);
    eq(G.S.hints.tap, 1);
});

test('битое сохранение не ломает игру', () => {
    R.save.apply({ level: 'abc', coins: -5, helpers: [1, 'x'] });
    eq(G.S.level, 0);
    eq(G.S.coins, 0);
    eq(G.S.helpers.length, CFG.helpers.length);
});

test('из двух сохранений выбирается то, где больше прогресса', () => {
    const weak = Object.assign(G.newState(), { lifeEarned: 1e9, savedAt: clock });
    const strong = Object.assign(G.newState(), { seedsLife: 5, prestiges: 1, lifeEarned: 1e6, savedAt: clock - 1e6 });
    R.save.choose(weak, strong);
    eq(G.S.seedsLife, 5);
});

test('перевод часов не продлевает бонусы бесконечно', () => {
    R.save.apply(Object.assign(G.newState(), { buffEnd: clock + 1e12, boosts: { incomeX2End: clock + 1e12, chargeX2End: 0 } }));
    ok(G.S.buffEnd - clock < 600000);
    ok(G.S.boosts.incomeX2End - clock <= CFG.ads.incomeX2.maxMinutes * 60000);
});

test('перевод часов назад не даёт второй подарок дня', () => {
    M.claimGift();
    clock -= 86400000;
    eq(M.giftAvailable(), false);
    clock += 86400000;
});

console.log('Числа и тексты:');

test('форматирование чисел', () => {
    eq(U.fmt(999, 'ru'), '999');
    eq(U.fmt(1500, 'ru'), '1,5 тыс');
    eq(U.fmt(130000, 'ru'), '130 тыс');
    eq(U.fmt(2.5e6, 'en'), '2.5M');
    eq(U.fmt(999999, 'en'), '999K');
    eq(U.fmt(1e40, 'en').length > 0, true);
});

test('у каждого текста есть перевод на английский', () => {
    const ru = R.i18n.dict.ru, en = R.i18n.dict.en;
    const missing = Object.keys(ru).filter(k => !(k in en));
    eq(missing.join(', '), '');
});

test('у каждой стадии, цветка, зверька и бонуса есть название', () => {
    CFG.stages.forEach(s => ok(R.t('stage_' + s.id) !== 'stage_' + s.id, s.id));
    CFG.flowers.forEach(f => ok(R.t('flower_' + f.id) !== 'flower_' + f.id, f.id));
    CFG.helpers.forEach(h => ok(R.t('helper_' + h.id) !== 'helper_' + h.id, h.id));
    CFG.perks.forEach(p => ok(R.t('perk_' + p.id) !== 'perk_' + p.id, p.id));
});

console.log(`\nИтог: ${passed} прошло, ${failed} упало`);
process.exit(failed ? 1 : 0);
