window.ysdk = null;
window.sdkReady = false;
window.gameLang = 'ru';

const LANG_OVERRIDE_KEY = 'resonance_lang_override';

// Игрок мог вручную выбрать язык в Настройках (вдруг SDK определил неверно) —
// такой выбор перекрывает автоопределение и запоминается навсегда
function setGameLang(lang) {
    window.gameLang = lang === 'en' ? 'en' : 'ru';
    try {
        localStorage.setItem(LANG_OVERRIDE_KEY, window.gameLang);
    } catch (error) {
        console.warn('Не удалось сохранить выбор языка:', error);
    }
}

async function initYandexSDK() {
    try {
        window.ysdk = await YaGames.init();
        window.sdkReady = true;

        const lang = window.ysdk.environment.i18n.lang;
        window.gameLang = lang === 'ru' ? 'ru' : 'en';

        console.log('SDK Яндекс Игр инициализирован. Язык:', window.gameLang);
    } catch (error) {
        console.warn('SDK Яндекс Игр не инициализирован (норма для локального теста):', error);
        window.sdkReady = false;
    }

    try {
        const override = localStorage.getItem(LANG_OVERRIDE_KEY);
        if (override === 'ru' || override === 'en') {
            window.gameLang = override;
        }
    } catch (error) {
        // localStorage недоступен — просто остаёмся с тем, что определил SDK
    }
}