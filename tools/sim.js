// sim.js — симулятор баланса.
//   node tools/sim.js            — непрерывная игра (4 тапа/сек), несколько садов подряд
//   node tools/sim.js sessions   — короткие заходы по 4 минуты с перерывами по 4 часа
// Виртуальный игрок тапает, включает радугу, ловит бабочек и покупает самое
// выгодное улучшение ("прибавка дохода / цена"). Печатает темп роста дерева.

const path = require('path');
global.window = global;
['js/core/util.js', 'js/game/config.js'].forEach(f => require(path.join(__dirname, '..', f)));
// Быстрый подбор баланса без правки config.js: SIM='{"offlineRate":0.3}' node tools/sim.js
if (process.env.SIM) {
    const o = JSON.parse(process.env.SIM);
    if (o.sb) global.R.CFG.stages.forEach((st, i) => { st.basePrice = o.sb[i]; st.tapPerLevel = o.st[i]; st.priceGrowth = o.sg; });
    if (o.hb) global.R.CFG.helpers.forEach((h, i) => { h.basePrice = o.hb[i]; h.rate = o.hr[i]; h.priceGrowth = o.hg; });
    Object.keys(o).filter(k => !['sb', 'st', 'sg', 'hb', 'hr', 'hg'].includes(k)).forEach(k => { global.R.CFG[k] = o[k]; });
}
require(path.join(__dirname, '..', 'js/game/game.js'));

const R = global.R, G = R.game, CFG = R.CFG;
const mode = process.argv[2] || 'continuous';
const TPS = +(process.argv[3] || (mode === 'sessions' ? 3 : 4));

let clock = 0;
G.now = () => clock;
const fmt = (n) => R.util.fmt(n, 'en');

function bestPurchase() {
    const opts = [];
    if (!G.isMaxed()) {
        const d = (G.tapBaseAt(G.S.level + 1) - G.tapBaseAt(G.S.level)) * (TPS + G.autoTapRate()) * G.globalMult();
        const stageBonus = (G.S.level + 1) % CFG.levelsPerStage === 0 ? 1.6 : 1;
        opts.push({ kind: 'tree', price: G.treePrice(), value: d * stageBonus });
    }
    CFG.helpers.forEach((h, i) => {
        if (!G.helperRevealed(i)) return;
        const lvl = G.S.helpers[i];
        opts.push({ kind: 'h', i, price: G.helperPrice(i), value: (G.helperRateAt(i, lvl + 1) - G.helperRateAt(i, lvl)) * G.globalMult() });
    });
    opts.forEach(o => { o.roi = o.value / o.price; });
    opts.sort((a, b) => b.roi - a.roi);
    return opts[0];
}

let tapAcc = 0;
let nextComet = CFG.cometFirstDelay;
function play(ms) {
    const end = clock + ms;
    while (clock < end) {
        clock += 100;
        tapAcc += TPS * 0.1;
        while (tapAcc >= 1) { tapAcc -= 1; G.tap('player'); }
        G.tick(0.1);
        if (G.canRelease()) G.release();
        if (clock >= nextComet) {
            G.catchComet();
            nextComet = clock + (CFG.cometMinGap + CFG.cometMaxGap) / 2 / G.cometRateMult();
        }
        for (let k = 0; k < 30; k++) {
            const b = bestPurchase();
            if (!b || G.S.coins < b.price) break;
            if (b.kind === 'tree') G.buyTree(); else G.buyHelper(b.i, 1);
        }
    }
}

function spendSeeds() {
    for (let k = 0; k < 200; k++) {
        if (G.perkLevel('diary') === 0 && G.S.prestiges >= 2 && G.buyPerk('diary')) continue;
        if (!G.perkMaxed('bed') && G.perkPrice('bed') <= G.S.seeds * 0.4 && G.buyPerk('bed')) continue;
        if (G.buyPerk('can')) continue;
        break;
    }
}

const stageName = () => CFG.stages[G.stageIndex()].id;

if (mode === 'sessions') {
    console.log(`Короткие заходы: 4 мин игры (${TPS} тапа/сек) → 4 часа перерыв`);
    for (let s = 1; s <= 18; s++) {
        const lvl0 = G.S.level;
        play(4 * 60000);
        const line = `заход ${String(s).padStart(2)}: ур ${String(lvl0).padStart(3)} → ${String(G.S.level).padStart(3)} (${stageName().padEnd(9)})  ` +
            `доход ${fmt(G.passivePerSec()).padStart(7)}/с  семян ${String(G.seedsOnPrestige()).padStart(3)}  зверята ${G.S.helpers.join(',')}`;
        // Стратегия игрока: новый сад, когда семян хватает на заметный бонус
        let extra = '';
        if (G.canPrestige() && G.seedsOnPrestige() >= Math.max(4, G.S.seedsLife)) {
            extra = `  >>> НОВЫЙ САД +${G.prestige()} семян`;
            spendSeeds();
        }
        console.log(line + extra);
        const off = G.offlineGain(4 * 3600);
        G.addCoins(off);
        clock += 4 * 3600 * 1000;
    }
} else {
    console.log(`Непрерывная игра, ${TPS} тапа/сек`);
    for (let run = 1; run <= 3; run++) {
        const start = clock;
        const marks = [];
        while (clock - start < 3 * 3600000) {
            play(1000);
            const l = G.S.level;
            if (l % CFG.levelsPerStage === 0 && l > 0 && !marks.find(m => m.l === l)) {
                marks.push({ l, t: clock - start, seeds: G.seedsOnPrestige(), ps: G.passivePerSec(), tap: G.tapValue(false) });
            }
            if (run < 3 && G.canPrestige() && G.seedsOnPrestige() >= Math.max(4, G.S.seedsLife)) break;
            if (G.isMaxed()) break;
        }
        console.log(`\n=== Сад ${run} (бонусы: ${JSON.stringify(G.S.perks)}) ===`);
        marks.forEach(m => console.log(`  ур.${String(m.l).padStart(3)} ${CFG.stages[Math.min(m.l / CFG.levelsPerStage, CFG.stages.length - 1)].id.padEnd(9)} ${((m.t) / 60000).toFixed(1).padStart(6)} мин  семян ${String(m.seeds).padStart(3)}  тап ${fmt(m.tap).padStart(7)}  зверята ${fmt(m.ps).padStart(7)}/с`));
        console.log(`  итог: ${((clock - start) / 60000).toFixed(1)} мин, ур.${G.S.level}, семян к получению ${G.seedsOnPrestige()}`);
        if (run < 3) { console.log(`  >>> НОВЫЙ САД +${G.prestige()} семян`); spendSeeds(); }
    }
}
