window.ysdk = null;
window.sdkReady = false;
window.gameLang = 'ru';

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
}