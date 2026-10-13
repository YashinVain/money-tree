const SAVE_KEY = 'resonance_save';

function saveGame() {
    const saveData = {
        currency: window.gameState.currency,
        totalEarned: window.gameState.totalEarned,
        resonatorLevel: window.ResonatorState.level,
        helperLevels: window.HelperState.levels,
        prestige: {
            shards: window.PrestigeState.shards,
            legacyLevel: window.PrestigeState.legacyLevel,
            sealLevel: window.PrestigeState.sealLevel,
            memoryUnlocked: window.PrestigeState.memoryUnlocked,
            darkUnlockedEver: window.PrestigeState.darkUnlockedEver,
            totalPrestiges: window.PrestigeState.totalPrestiges
        },
        savedAt: Date.now()
    };

    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch (error) {
        console.warn('Не удалось сохранить игру:', error);
    }
}

function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return;

        const saveData = JSON.parse(raw);
        window.gameState.currency = saveData.currency || 0;
        // Старые сохранения не считали totalEarned — берём максимум с текущим
        // балансом как разумную нижнюю границу, чтобы никто не застрял на 0 осколках
        window.gameState.totalEarned = Math.max(saveData.totalEarned || 0, window.gameState.currency);
        window.ResonatorState.level = saveData.resonatorLevel || 0;

        if (Array.isArray(saveData.helperLevels)) {
            window.HelperState.types.forEach((type, i) => {
                window.HelperState.levels[i] = saveData.helperLevels[i] || 0;
            });
        }

        if (saveData.prestige) {
            window.PrestigeState.shards = saveData.prestige.shards || 0;
            window.PrestigeState.legacyLevel = saveData.prestige.legacyLevel || 0;
            window.PrestigeState.sealLevel = saveData.prestige.sealLevel || 0;
            window.PrestigeState.memoryUnlocked = !!saveData.prestige.memoryUnlocked;
            window.PrestigeState.darkUnlockedEver = !!saveData.prestige.darkUnlockedEver;
            window.PrestigeState.totalPrestiges = saveData.prestige.totalPrestiges || 0;
        }

        // Считаем оффлайн-доход только теперь, когда состояние помощников/частот/
        // престижа уже загружено выше — от него зависит скорость дохода в секунду
        if (saveData.savedAt) {
            const awaySeconds = (Date.now() - saveData.savedAt) / 1000;
            window.lastOfflineAwaySeconds = awaySeconds;
            window.pendingOfflineIncome = calculateOfflineIncome(awaySeconds);
        }
    } catch (error) {
        console.warn('Не удалось загрузить сохранение:', error);
    }
}

// Полный сброс прогресса — используется из Настроек. Перезагружает страницу,
// чтобы весь код стартовал с чистого состояния, а не только сохранение
function resetSave() {
    try {
        localStorage.removeItem(SAVE_KEY);
    } catch (error) {
        console.warn('Не удалось сбросить сохранение:', error);
    }
    window.TutorialState.reset();
    window.location.reload();
}