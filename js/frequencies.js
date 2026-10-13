// frequencies.js — 5 частот, открываются автоматически по уровню резонатора
// (ровно на границах тиров — 20/40/60/80/100). Открытая частота работает
// всегда и для всех, дополнительно покупать/включать её не нужно

const FREQUENCIES = [
    {
        get name() { return t('freq_fire_name'); },
        icon: '🔥',
        color: 0xff5a3c,
        colorHex: '#ff5a3c',
        unlockLevel: 20,
        get description() { return t('freq_fire_desc'); }
    },
    {
        get name() { return t('freq_ice_name'); },
        icon: '❄️',
        color: 0x6fd6ff,
        colorHex: '#6fd6ff',
        unlockLevel: 40,
        get description() { return t('freq_ice_desc'); }
    },
    {
        get name() { return t('freq_lightning_name'); },
        icon: '⚡',
        color: 0xfff54f,
        colorHex: '#fff54f',
        unlockLevel: 60,
        get description() { return t('freq_lightning_desc'); }
    },
    {
        get name() { return t('freq_nature_name'); },
        icon: '🌿',
        color: 0x6bff8e,
        colorHex: '#6bff8e',
        unlockLevel: 80,
        get description() { return t('freq_nature_desc'); }
    },
    {
        get name() { return t('freq_dark_name'); },
        icon: '🌑',
        color: 0x9b6bff,
        colorHex: '#9b6bff',
        unlockLevel: 100,
        get description() { return t('freq_dark_desc'); }
    }
];

window.FrequencyState = {
    list: FREQUENCIES,

    isUnlocked(index) {
        return window.ResonatorState.level >= this.list[index].unlockLevel;
    },

    // То, что реально видно/действует в игре — в отличие от isUnlocked() учитывает
    // Тьму, которая остаётся активной навсегда после первого достижения 100
    // уровня, даже когда резонатор сброшен престижем
    isEffectivelyUnlocked(index) {
        return index === 4 ? this.hasDark() : this.isUnlocked(index);
    },

    // Осталась активной только благодаря престижу — резонатор сейчас ниже порога
    isPermanentlyUnlocked(index) {
        return index === 4 && window.PrestigeState.darkUnlockedEver && !this.isUnlocked(4);
    },

    hasFire() { return this.isUnlocked(0); },
    hasIce() { return this.isUnlocked(1); },
    hasLightning() { return this.isUnlocked(2); },
    hasNature() { return this.isUnlocked(3); },
    hasDark() { return this.isUnlocked(4) || window.PrestigeState.darkUnlockedEver; },

    getBuffMultiplier() {
        return this.hasFire() ? 3 : 2;
    },

    getBuffDurationBonus() {
        return this.hasIce() ? 1.3 : 1;
    },

    getChargeSpeedBonus() {
        return this.hasLightning() ? 1.3 : 1;
    },

    getPassiveIncome() {
        return this.hasNature() ? 2 : 0;
    },

    getCritChance() {
        return this.hasDark() ? 0.1 : 0;
    }
};
