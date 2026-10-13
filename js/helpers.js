// helpers.js — помощники: пассивный доход в секунду, не требует кликов.
// В отличие от резонатора, все 4 типа доступны сразу и качаются независимо
// друг от друга, каждый до 20 уровня

const HELPER_TYPES = [
    {
        get name() { return t('helper_operator'); },
        icon: '👷',
        color: 0x4fd6ff,
        colorHex: '#4fd6ff',
        perLevelRate: 2,
        basePrice: 100
    },
    {
        get name() { return t('helper_engineer'); },
        icon: '🛠️',
        color: 0xffa64f,
        colorHex: '#ffa64f',
        perLevelRate: 10,
        basePrice: 2500
    },
    {
        get name() { return t('helper_scientist'); },
        icon: '🧪',
        color: 0x7dff6b,
        colorHex: '#7dff6b',
        perLevelRate: 40,
        basePrice: 50000
    },
    {
        get name() { return t('helper_mage'); },
        icon: '🧙',
        color: 0xc04bff,
        colorHex: '#c04bff',
        perLevelRate: 200,
        basePrice: 1000000
    }
];

const HELPER_MAX_LEVEL = 20;

window.HelperState = {
    types: HELPER_TYPES,
    maxLevel: HELPER_MAX_LEVEL,
    levels: HELPER_TYPES.map(() => 0),

    isMaxed(index) {
        return this.levels[index] >= this.maxLevel;
    },

    getNextPrice(index) {
        if (this.isMaxed(index)) return null;
        const type = this.types[index];
        return Math.floor(type.basePrice * Math.pow(1.15, this.levels[index]));
    },

    getHelperIncome(index) {
        return this.levels[index] * this.types[index].perLevelRate;
    },

    getTotalIncomePerSec() {
        let total = 0;
        for (let i = 0; i < this.types.length; i++) {
            total += this.getHelperIncome(i);
        }
        return total;
    },

    buy(index) {
        const price = this.getNextPrice(index);
        if (price === null || window.gameState.currency < price) return false;

        window.gameState.currency -= price;
        this.levels[index]++;
        return true;
    },

    buyMax(index) {
        let bought = 0;

        while (!this.isMaxed(index)) {
            const price = this.getNextPrice(index);
            if (window.gameState.currency < price) break;

            window.gameState.currency -= price;
            this.levels[index]++;
            bought++;
        }

        return bought;
    }
};
