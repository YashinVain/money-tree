// prestige.js — престиж: сброс резонатора/помощников/валюты ради Осколков
// Резонанса, которые остаются навсегда и дают постоянные множители.
// Открывается после частоты "Молния" (60 уровень резонатора)

const PRESTIGE_UNLOCK_LEVEL = 60;
const LEGACY_PRICE = 1;   // осколков за уровень "Наследия" (+10% к валюте)
const SEAL_PRICE = 10;    // осколков за уровень "Печати" (+5% к скорости)
const MEMORY_PRICE = 5;   // осколков за разовую покупку "Памяти"

window.PrestigeState = {
    shards: 0,
    legacyLevel: 0,
    sealLevel: 0,
    memoryUnlocked: false,
    darkUnlockedEver: false,
    totalPrestiges: 0,

    canPrestige() {
        return window.ResonatorState.level >= PRESTIGE_UNLOCK_LEVEL;
    },

    getShardsOnPrestige() {
        // Считаем от ВСЕГО заработанного с последнего престижа, а не от текущего
        // баланса — иначе игрок, который тратит монеты на апгрейды по пути
        // к разблокировке (а это все), приходит к 60 уровню с пустым карманом
        // и не получает ни одного осколка
        return Math.floor(Math.sqrt(window.gameState.totalEarned / 1000000));
    },

    prestige() {
        if (!this.canPrestige()) return 0;
        const gained = this.getShardsOnPrestige();
        if (gained <= 0) return 0;

        if (window.ResonatorState.level >= 100) {
            this.darkUnlockedEver = true;
        }

        this.shards += gained;
        this.totalPrestiges++;

        let keepIndex = -1;
        if (this.memoryUnlocked) {
            keepIndex = window.HelperState.levels.reduce(
                (best, lvl, i) => lvl > (window.HelperState.levels[best] || 0) ? i : best, -1
            );
        }

        window.gameState.currency = 0;
        window.gameState.totalEarned = 0;
        window.ResonatorState.level = 0;
        window.HelperState.levels = window.HelperState.types.map(
            (t, i) => (i === keepIndex ? window.HelperState.levels[i] : 0)
        );
        window.ResonanceState.charge = 0;
        window.ResonanceState.buffActive = false;
        window.ResonanceState.buffEndTime = 0;
        window.ResonanceState.cooldownEndTime = 0;

        saveGame();
        return gained;
    },

    getLegacyPrice() { return LEGACY_PRICE; },
    getSealPrice() { return SEAL_PRICE; },
    getMemoryPrice() { return MEMORY_PRICE; },

    buyLegacy() {
        if (this.shards < LEGACY_PRICE) return false;
        this.shards -= LEGACY_PRICE;
        this.legacyLevel++;
        saveGame();
        return true;
    },

    buySeal() {
        if (this.shards < SEAL_PRICE) return false;
        this.shards -= SEAL_PRICE;
        this.sealLevel++;
        saveGame();
        return true;
    },

    buyMemory() {
        if (this.memoryUnlocked || this.shards < MEMORY_PRICE) return false;
        this.shards -= MEMORY_PRICE;
        this.memoryUnlocked = true;
        saveGame();
        return true;
    },

    getCurrencyMultiplier() {
        return 1 + this.legacyLevel * 0.10;
    },

    getSpeedMultiplier() {
        return 1 + this.sealLevel * 0.05;
    }
};
