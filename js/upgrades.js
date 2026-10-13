// upgrades.js — система резонатора: 5 тиров по 20 уровней в каждом.
// Каждый уровень поднимает доход за клик. Переход на новый тир открывает
// особую способность (скорость шкалы, длительность баффа, авто-клик,
// шанс мгновенной зарядки).

// name/description — геттеры, а не строки: читают текущий язык при каждом
// обращении, так что после смены языка в Настройках всё пересчитывается само
const RESONATOR_TIERS = [
    {
        get name() { return t('tier_copper_name'); },
        icon: '🔶',
        color: 0xe8763a,
        colorHex: '#e8763a',
        perLevelBonus: 1,
        basePrice: 10,
        get description() { return t('tier_copper_desc'); }
    },
    {
        get name() { return t('tier_silver_name'); },
        icon: '⚪',
        color: 0x9fe0f5,
        colorHex: '#9fe0f5',
        perLevelBonus: 5,
        basePrice: 500,
        get description() { return t('tier_silver_desc'); }
    },
    {
        get name() { return t('tier_gold_name'); },
        icon: '🟡',
        color: 0xffd700,
        colorHex: '#ffd700',
        perLevelBonus: 25,
        basePrice: 10000,
        get description() { return t('tier_gold_desc'); }
    },
    {
        get name() { return t('tier_plasma_name'); },
        icon: '🟣',
        color: 0xaa33ff,
        colorHex: '#aa33ff',
        perLevelBonus: 100,
        basePrice: 250000,
        get description() { return t('tier_plasma_desc'); }
    },
    {
        get name() { return t('tier_quantum_name'); },
        icon: '🔵',
        color: 0x00eaff,
        colorHex: '#00eaff',
        perLevelBonus: 500,
        basePrice: 5000000,
        get description() { return t('tier_quantum_desc'); }
    }
];

const RESONATOR_LEVELS_PER_TIER = 20;

// С какой доли прогресса внутри тира цвет начинает подмешивать следующий тир.
// Первые 70% уровня — чистый цвет своего тира (Золотой — жёлтый, а не зелёный),
// и только последние 30% — плавный переход-предвестник к следующей эпохе
const ERA_TRANSITION_START = 0.7;

window.ResonatorState = {
    level: 0,
    tiers: RESONATOR_TIERS,
    levelsPerTier: RESONATOR_LEVELS_PER_TIER,
    maxLevel: RESONATOR_TIERS.length * RESONATOR_LEVELS_PER_TIER,

    isMaxed() {
        return this.level >= this.maxLevel;
    },

    getTierIndex() {
        return Math.min(Math.floor(this.level / this.levelsPerTier), this.tiers.length - 1);
    },

    getSubLevel() {
        if (this.isMaxed()) return this.levelsPerTier;
        return this.level % this.levelsPerTier;
    },

    getCurrentTier() {
        return this.tiers[this.getTierIndex()];
    },

    getNextPrice() {
        if (this.isMaxed()) return null;
        const tier = this.getCurrentTier();
        const sub = this.getSubLevel();
        return Math.floor(tier.basePrice * Math.pow(1.15, sub));
    },

    // Суммарный бонус к доходу за клик от всех купленных уровней резонатора
    getClickBonus() {
        let bonus = 0;
        const tierIdx = this.getTierIndex();

        for (let i = 0; i < tierIdx; i++) {
            bonus += this.tiers[i].perLevelBonus * this.levelsPerTier;
        }
        bonus += this.tiers[tierIdx].perLevelBonus * this.getSubLevel();

        return bonus;
    },

    // Способности открываются, когда пройден весь тир (Серебряный = индекс 1 и т.д.)
    getChargeSpeedMultiplier() {
        return this.level >= this.levelsPerTier * 1 ? 1.10 : 1.0;
    },

    getBuffDurationMultiplier() {
        return this.level >= this.levelsPerTier * 2 ? 1.20 : 1.0;
    },

    hasAutoClick() {
        return this.level >= this.levelsPerTier * 3;
    },

    getInstantChargeChance() {
        return this.level >= this.levelsPerTier * 4 ? 0.05 : 0;
    },

    // "Цвет эпохи" — большую часть тира это ровно цвет своего тира (Золотой тир
    // выглядит золотым), и только на подходе к следующему тиру (последние 30%
    // уровней) цвет начинает плавно подмешивать цвет следующей эпохи
    getEraColor() {
        const idx = this.getTierIndex();
        const tier = this.tiers[idx];

        if (this.isMaxed()) return tier.color;

        const t = this.getSubLevel() / this.levelsPerTier;
        if (t < ERA_TRANSITION_START) return tier.color;

        const nextTier = this.tiers[Math.min(idx + 1, this.tiers.length - 1)];
        const blendT = (t - ERA_TRANSITION_START) / (1 - ERA_TRANSITION_START);
        return blendColors(tier.color, nextTier.color, blendT);
    },

    buy() {
        const price = this.getNextPrice();
        if (price === null || window.gameState.currency < price) return false;

        window.gameState.currency -= price;
        this.level++;
        return true;
    },

    // Покупает максимум уровней, на которые хватает валюты — но только до конца
    // ТЕКУЩЕГО тира. Даже если денег хватает и на начало следующего тира,
    // "Купить макс" на нём останавливается — переход в новый тир требует
    // отдельного нажатия
    buyMax() {
        let bought = 0;
        const tierEndLevel = (this.getTierIndex() + 1) * this.levelsPerTier;

        while (!this.isMaxed() && this.level < tierEndLevel) {
            const price = this.getNextPrice();
            if (window.gameState.currency < price) break;

            window.gameState.currency -= price;
            this.level++;
            bought++;
        }

        return bought;
    }
};
