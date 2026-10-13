// config.js — ВСЕ числа баланса игры в одном месте. Хочешь поменять цену,
// силу зверька или длительность радуги — меняй здесь, логика подхватит сама.
// Темп проверяется симулятором: node tools/sim.js (непрерывная игра)
// и node tools/sim.js sessions (короткие заходы с перерывами в несколько часов)

(function (root) {
    const R = root.R = root.R || {};

    R.CFG = {
        // ---- Дерево: 8 стадий роста по 15 уровней. Каждая стадия — новый вид дерева ----
        levelsPerStage: 15,
        stages: [
            { id: 'seed', color: '#c98a4b', basePrice: 20, priceGrowth: 1.18, tapPerLevel: 1, perk: null },
            { id: 'sprout', color: '#7ed957', basePrice: 500, priceGrowth: 1.18, tapPerLevel: 7, perk: { chargeSpeed: 0.15 } },
            { id: 'sapling', color: '#4cc96b', basePrice: 12000, priceGrowth: 1.18, tapPerLevel: 50, perk: { buffDuration: 0.25 } },
            { id: 'young', color: '#2fb35a', basePrice: 400000, priceGrowth: 1.18, tapPerLevel: 350, perk: { autoTap: 2 } },
            { id: 'blossom', color: '#ff8fc8', basePrice: 15000000, priceGrowth: 1.18, tapPerLevel: 2500, perk: { instantCharge: 0.02 } },
            { id: 'fruit', color: '#ff5a5a', basePrice: 600000000, priceGrowth: 1.18, tapPerLevel: 18000, perk: { autoTap: 3 } },
            { id: 'magic', color: '#a98bff', basePrice: 25000000000, priceGrowth: 1.18, tapPerLevel: 130000, perk: { critMult: 5 } },
            { id: 'world', color: '#ffd23f', basePrice: 1100000000000, priceGrowth: 1.18, tapPerLevel: 950000, perk: { globalMult: 1 } }
        ],

        // ---- Радуга (шкала заряда) и бафф "Радужный час" ----
        chargeMax: 30,
        buffDuration: 15000,      // мс
        buffCooldown: 40000,      // мс после окончания баффа
        buffMult: 2,              // x2, с Подсолнухом — x3

        // ---- Волшебные цветы: по одному за каждую выращенную стадию ----
        // effect — что даёт цветок, пока он растёт в саду
        flowers: [
            { id: 'sunflower', color: '#ffc928', unlockLevel: 15, effect: { buffMult: 3 } },
            { id: 'bluebell', color: '#6f9bff', unlockLevel: 30, effect: { buffDuration: 0.3 } },
            { id: 'dandelion', color: '#fff27a', unlockLevel: 45, effect: { chargeSpeed: 0.3 } },
            { id: 'clover', color: '#5fd65a', unlockLevel: 60, effect: { helperMult: 0.5 } },
            { id: 'rose', color: '#ff4f6d', unlockLevel: 75, effect: { critChance: 0.1 } },
            { id: 'lavender', color: '#b98bff', unlockLevel: 90, effect: { cometRate: 1 } },
            { id: 'lotus', color: '#ff9fd0', unlockLevel: 105, effect: { offlineMult: 1 } },
            { id: 'rainbowflower', color: '#ff8a3d', unlockLevel: 120, effect: { globalMult: 1 } }
        ],
        critMult: 10,

        // ---- Зверята-помощники: монетки в секунду, уровни без потолка, вехи x2 ----
        helpers: [
            { id: 'bee', color: '#ffd23f', basePrice: 25, priceGrowth: 1.17, rate: 1 },
            { id: 'hedgehog', color: '#c08a5a', basePrice: 500, priceGrowth: 1.17, rate: 7.5 },
            { id: 'squirrel', color: '#ff9a3d', basePrice: 10000, priceGrowth: 1.17, rate: 55 },
            { id: 'bunny', color: '#f0e6ff', basePrice: 200000, priceGrowth: 1.17, rate: 400 },
            { id: 'owl', color: '#a07850', basePrice: 4000000, priceGrowth: 1.17, rate: 3000 },
            { id: 'dragon', color: '#5fd6a0', basePrice: 80000000, priceGrowth: 1.17, rate: 22000 }
        ],
        helperMilestones: [10, 25, 50, 75, 100, 150, 200],   // на каждой вехе x2 к этому зверьку

        // ---- Новый сад (престиж) ----
        prestigeLevel: 60,         // открывается, когда дерево зацветёт
        seedDivisor: 1e6,          // золотые семена = floor(sqrt(монет_за_сад / делитель))
        perks: [
            { id: 'can', basePrice: 1, priceStep: 1, max: 0, effect: 0.25 },        // Лейка: +25% ко всем монеткам
            { id: 'fertilizer', basePrice: 2, priceStep: 2, max: 10, effect: 0.1 }, // Удобрение: радуга быстрее
            { id: 'bed', basePrice: 3, priceStep: 3, max: 6, effect: 5 },           // Грядка: старт с +5 уровней
            { id: 'net', basePrice: 2, priceStep: 2, max: 5, effect: 0.25 },        // Сачок: бабочки чаще и щедрее
            { id: 'diary', basePrice: 6, priceStep: 0, max: 1, effect: 1 },         // Дневник: лучший зверёк остаётся
            { id: 'basket', basePrice: 3, priceStep: 3, max: 4, effect: 2 }         // Корзинка: +2 ч к копилке
        ],

        // ---- Копилка (доход, пока игрока нет) ----
        offlineRate: 0.3,
        offlineMaxSec: 4 * 3600,
        offlineMinSec: 60,

        // ---- Золотая бабочка (редкий бонус, ловится тапом) ----
        cometMinGap: 40000,
        cometMaxGap: 90000,
        cometFirstDelay: 25000,
        cometLife: 8000,
        cometRewards: [
            { id: 'stardust', weight: 45 },   // мгновенно: доход за 60 сек
            { id: 'frenzy', weight: 30 },     // x7 к тапу на 12 сек
            { id: 'overcharge', weight: 25 }  // радуга заполнена, перезарядка сброшена
        ],
        frenzyMult: 7,
        frenzyDuration: 12000,
        stardustSeconds: 60,

        // ---- Бонусы за рекламу (rewarded video) ----
        ads: {
            incomeX2: { minutes: 15, maxMinutes: 240 },   // каждый просмотр +15 мин, максимум 4 ч
            chargeX2: { minutes: 10, cooldown: 10 * 60000 },
            instantCharge: { cooldown: 3 * 60000 },
            chest: { seconds: 300, cooldown: 8 * 60000 }    // доход за 5 минут
        },
        freeChest: { seconds: 600, cooldown: 3 * 3600000 }, // бесплатная корзинка раз в 3 часа
        interstitialGap: 180000,

        // ---- Достижения: каждое +2% к доходу навсегда ----
        achievementBonus: 0.02,

        // ---- Ежедневные задания и подарок ----
        questsPerDay: 3,
        questRewardSeconds: 180,
        dailyGiftSeconds: [180, 300, 420, 600, 780, 1020, 1500]   // по дням серии
    };
})(typeof window !== 'undefined' ? window : globalThis);
