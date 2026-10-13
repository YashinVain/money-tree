// tutorial.js — обучение для новых игроков. Показывается один раз при первом
// входе в игровой экран, дальше запоминается в localStorage и не появляется

const TUTORIAL_KEY = 'resonance_tutorial_seen';

window.TutorialState = {
    hasSeenTutorial() {
        try {
            return localStorage.getItem(TUTORIAL_KEY) === '1';
        } catch (error) {
            return true; // localStorage недоступен — не мучаем показом каждый раз
        }
    },

    markSeen() {
        try {
            localStorage.setItem(TUTORIAL_KEY, '1');
        } catch (error) {
            console.warn('Не удалось сохранить прогресс обучения:', error);
        }
    },

    reset() {
        try {
            localStorage.removeItem(TUTORIAL_KEY);
        } catch (error) {
            console.warn('Не удалось сбросить прогресс обучения:', error);
        }
    }
};
