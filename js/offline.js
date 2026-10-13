// offline.js — оффлайн-доход: пока игрока нет в игре, помощники и Природа
// продолжают работать (не авто-клик резонатора — это осознанное упрощение).
// Начисляется 50% от обычной скорости, максимум за 4 часа отсутствия

const OFFLINE_MAX_SECONDS = 4 * 60 * 60;
const OFFLINE_RATE = 0.5;
const OFFLINE_MIN_SECONDS = 30; // не считаем за секундную перезагрузку страницы

window.pendingOfflineIncome = 0;
window.lastOfflineAwaySeconds = 0;

function calculateOfflineIncome(awaySeconds) {
    const cappedSeconds = Math.min(awaySeconds, OFFLINE_MAX_SECONDS);
    if (cappedSeconds < OFFLINE_MIN_SECONDS) return 0;

    const perSec = (window.HelperState.getTotalIncomePerSec() + window.FrequencyState.getPassiveIncome())
        * window.PrestigeState.getCurrencyMultiplier();

    return Math.floor(perSec * cappedSeconds * OFFLINE_RATE);
}

function collectOfflineIncome() {
    const amount = window.pendingOfflineIncome;
    if (amount > 0) {
        window.gameState.currency += amount;
        window.gameState.totalEarned += amount;
        window.pendingOfflineIncome = 0;
        saveGame();
    }
    return amount;
}
