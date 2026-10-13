
window.gameState = window.gameState || {
    currency: 0,
    totalEarned: 0 // с последнего престижа — от этого считаются осколки резонанса
};

window.lastClickWasCrit = false;

function handleClick() {
    const baseIncome = 1 + window.ResonatorState.getClickBonus();
    let income = window.ResonanceState.isBuffActive()
        ? baseIncome * window.FrequencyState.getBuffMultiplier()
        : baseIncome;

    window.lastClickWasCrit = Math.random() < window.FrequencyState.getCritChance();
    if (window.lastClickWasCrit) {
        income *= 10;
    }

    income *= window.PrestigeState.getCurrencyMultiplier();
    window.gameState.currency += income;
    window.gameState.totalEarned += income;

    const chargeGain = 1 * window.ResonatorState.getChargeSpeedMultiplier()
        * window.FrequencyState.getChargeSpeedBonus()
        * window.PrestigeState.getSpeedMultiplier();
    window.ResonanceState.addCharge(chargeGain);

    if (Math.random() < window.ResonatorState.getInstantChargeChance()) {
        window.ResonanceState.addCharge(window.ResonanceState.maxCharge);
    }

    saveGame();
    return income;
}

// Сколько кликов в секунду симулирует авто-клик (способность Плазменного тира).
// Ручной клик всегда быстрее — это осознанный баланс: авто-клик помогает,
// но не заменяет активную игру
const AUTO_CLICK_RATE = 3;

// Единая точка для пассивного дохода (помощники + авто-клик резонатора).
// Вызывается раз в секунду из всех игровых экранов, кроме главного меню.
// Возвращает, что именно начислилось, чтобы вызывающая сцена могла показать эффект
function tickPassiveEconomy() {
    const helperIncome = (window.HelperState.getTotalIncomePerSec() + window.FrequencyState.getPassiveIncome())
        * window.PrestigeState.getCurrencyMultiplier();
    if (helperIncome > 0) {
        window.gameState.currency += helperIncome;
        window.gameState.totalEarned += helperIncome;
    }

    let autoClickIncome = null;
    if (window.ResonatorState.hasAutoClick()) {
        autoClickIncome = 0;
        for (let i = 0; i < AUTO_CLICK_RATE; i++) {
            autoClickIncome += handleClick();
        }
    } else if (helperIncome > 0) {
        saveGame();
    }

    return { helperIncome, autoClickIncome };
}
