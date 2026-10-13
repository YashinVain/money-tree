// i18n.js — переводы интерфейса. window.gameLang ('ru'/'en') задаётся в sdk.js
// (автоопределение) или вручную в Настройках. t(key, vars) возвращает строку
// для текущего языка, с подстановкой {переменных} и откатом на русский,
// если перевод почему-то не найден

const TRANSLATIONS = {
    ru: {
        // Главное меню
        game_title: 'РЕЗОНАНС',
        mainmenu_play: 'Играть',
        mainmenu_upgrades: 'Улучшения',
        mainmenu_helpers: 'Помощники',
        mainmenu_frequencies: 'Частоты',
        mainmenu_settings: 'Настройки',

        // Оффлайн-доход
        offline_title: 'Пока тебя не было',
        offline_subtitle: 'Помощники работали {time}',
        offline_collect: 'Собрать',
        time_hours_minutes: '{h} ч {m} мин',
        time_minutes: '{m} мин',
        time_less_minute: 'меньше минуты',

        // Суффиксы больших чисел (formatNumber в ui.js)
        unit_thousand: ' тыс',
        unit_million: ' млн',
        unit_billion: ' млрд',
        unit_trillion: ' трлн',

        // Навигация внутри игры
        nav_menu: 'Меню',
        nav_upgrades: 'Апгрейды',
        nav_helpers: 'Помощники',
        nav_frequencies: 'Частоты',
        nav_prestige: 'Престиж',
        nav_back: 'Назад',

        // Игровой экран
        income_per_sec: 'доход/сек: {n}',
        buff_label: '⚡ БАФФ x{mult}: {sec}с',
        release_button: 'ВЫСВОБОДИТЬ',
        release_cooldown: 'ПЕРЕЗАРЯДКА {sec}с',
        crit_label: 'КРИТ!',

        // Обучение
        tutorial_step1: 'Нажимай на резонатор ⚡ — каждый клик даёт монеты 💠',
        tutorial_step2: 'Клики заполняют кольцо заряда вокруг резонатора',
        tutorial_step3: 'Когда кольцо заполнено — жми «{release}» и получи мощный бафф к доходу',
        tutorial_step4: 'В «{upgrades}» усиливай сам резонатор — больше дохода за клик',
        tutorial_step5: '«{helpers}» — это доход в секунду: нанял одного, и монеты капают сами, даже когда ты не кликаешь и не в игре',
        tutorial_step6: 'Когда сильно прокачаешь резонатор — «{prestige}» позволит начать заново ради Осколков и бонусов навсегда. Пригодится позже!',
        tutorial_next: 'Далее',
        tutorial_done: 'Понятно!',
        tutorial_skip: 'Пропустить',

        // Апгрейды (резонатор)
        upgrade_title: 'РЕЗОНАТОР',
        upgrade_current_tier: 'ТЕКУЩИЙ ТИР',
        upgrade_level: 'Уровень: {cur} / {max}',
        upgrade_price: 'Цена: 💠 {price}',
        upgrade_buy: 'Улучшить',
        upgrade_buy_max: 'Купить макс',
        upgrade_maxed_contribution: '✓ Максимум · вклад в доход +{n}',
        upgrade_locked_after: 'Откроется после тира «{tier}»',
        tier_complete_title: 'ТИР "{tier}" ЗАВЕРШЁН!',
        tier_unlocked_next: 'Открыт новый резонатор: {icon} {tier}',
        tier_fully_upgraded: 'Резонатор полностью прокачан!',
        tier_new_frequency: 'Новая частота: {icon} {name} — {desc}',

        // Помощники
        helpers_title: 'ПОМОЩНИКИ',
        helpers_income_suffix: '+{n}/сек',
        helpers_maxed: 'Максимум',
        helpers_total: 'Итого доход/сек: {n}',

        // Частоты
        freq_title: 'ЧАСТОТЫ',
        freq_active: '✓ Активна',
        freq_active_forever: '✓ Активна навсегда (престиж)',
        freq_locked_progress: 'Уровень резонатора: {cur}/{max}',

        // Престиж
        prestige_title: 'ПРЕСТИЖ',
        prestige_ready_title: 'Резонанс готов к перезагрузке!',
        prestige_shards_label: 'осколков резонанса',
        prestige_ready_desc: 'Обнулятся: валюта, резонатор, помощники (кроме сохранённых Памятью) и частоты. Осколки и постоянные улучшения остаются навсегда.',
        prestige_reset_button: 'ПЕРЕЗАГРУЗИТЬ РЕЗОНАТОР',
        prestige_not_ready_title: 'Пока рано перезагружаться',
        prestige_not_ready_desc: 'Нужно заработать 1 млн монет за этот забег, чтобы получить хотя бы 1 осколок',
        prestige_earned_label: 'Заработано: 💠 {n} / 1 млн',
        prestige_locked_title: 'Открывается после частоты ⚡ Молния',
        prestige_locked_progress: 'Уровень резонатора: {cur}/{max}',
        prestige_confirm_text: 'Точно перезагрузить?\nПолучишь +{n} ✨',
        prestige_yes: 'Да',
        prestige_no: 'Нет',
        prestige_fanfare: 'ПРЕСТИЖ!\n+{n} ✨',
        prestige_perks_title: 'ПОСТОЯННЫЕ УЛУЧШЕНИЯ',
        perk_legacy_name: 'Наследие',
        perk_legacy_desc: '+10% к валюте за уровень (сейчас +{n}%)',
        perk_seal_name: 'Печать',
        perk_seal_desc: '+5% к скорости всего за уровень (сейчас +{n}%)',
        perk_memory_name: 'Память',
        perk_memory_desc: 'Сохраняет уровень лучшего помощника при перезагрузке',
        perk_bought: 'Куплено ✓',

        // Настройки
        settings_title: 'НАСТРОЙКИ',
        settings_language_label: 'Язык',
        settings_language_hint: 'Определяется автоматически — можно выбрать вручную',
        settings_sfx_label: 'Звуки',
        settings_sfx_hint: 'Клики, покупки, престиж и другие эффекты',
        settings_music_label: 'Музыка',
        settings_music_hint: 'Фоновая атмосферная музыка',
        settings_on: 'Вкл',
        settings_off: 'Выкл',
        settings_footer: 'Резонанс · v1.0',

        // Тиры резонатора
        tier_copper_name: 'Медный',
        tier_copper_desc: '+1 к доходу за клик',
        tier_silver_name: 'Серебряный',
        tier_silver_desc: '+5 к доходу за клик. Шкала заряжается на 10% быстрее',
        tier_gold_name: 'Золотой',
        tier_gold_desc: '+25 к доходу за клик. Бафф длится на 20% дольше',
        tier_plasma_name: 'Плазменный',
        tier_plasma_desc: '+100 к доходу за клик. Авто-клик 1 раз в секунду',
        tier_quantum_name: 'Квантовый',
        tier_quantum_desc: '+500 к доходу за клик. 5% шанс мгновенно заполнить шкалу',

        // Помощники (имена)
        helper_operator: 'Оператор',
        helper_engineer: 'Инженер',
        helper_scientist: 'Учёный',
        helper_mage: 'Маг',

        // Частоты
        freq_fire_name: 'Огонь',
        freq_fire_desc: 'Бафф резонанса даёт x3 дохода вместо x2',
        freq_ice_name: 'Лёд',
        freq_ice_desc: 'Бафф резонанса длится на 30% дольше',
        freq_lightning_name: 'Молния',
        freq_lightning_desc: 'Шкала резонанса заряжается на 30% быстрее',
        freq_nature_name: 'Природа',
        freq_nature_desc: 'Постоянный пассивный доход +2 в секунду',
        freq_dark_name: 'Тьма',
        freq_dark_desc: '10% шанс критического клика — доход x10'
    },

    en: {
        game_title: 'RESONANCE',
        mainmenu_play: 'Play',
        mainmenu_upgrades: 'Upgrades',
        mainmenu_helpers: 'Helpers',
        mainmenu_frequencies: 'Frequencies',
        mainmenu_settings: 'Settings',

        offline_title: 'While you were away',
        offline_subtitle: 'Helpers worked for {time}',
        offline_collect: 'Collect',
        time_hours_minutes: '{h}h {m}m',
        time_minutes: '{m}m',
        time_less_minute: 'less than a minute',

        unit_thousand: 'K',
        unit_million: 'M',
        unit_billion: 'B',
        unit_trillion: 'T',

        nav_menu: 'Menu',
        nav_upgrades: 'Upgrades',
        nav_helpers: 'Helpers',
        nav_frequencies: 'Frequencies',
        nav_prestige: 'Prestige',
        nav_back: 'Back',

        income_per_sec: 'income/sec: {n}',
        buff_label: '⚡ BUFF x{mult}: {sec}s',
        release_button: 'RELEASE',
        release_cooldown: 'RECHARGE {sec}s',
        crit_label: 'CRIT!',

        tutorial_step1: 'Tap the resonator ⚡ — every click gives you coins 💠',
        tutorial_step2: 'Clicks fill the charge ring around the resonator',
        tutorial_step3: 'When the ring is full — press "{release}" for a powerful income buff',
        tutorial_step4: 'In "{upgrades}" strengthen the resonator itself — more income per click',
        tutorial_step5: '"{helpers}" give income every second — hire one and coins keep flowing in, even while you\'re not clicking or not in the game',
        tutorial_step6: 'Once you upgrade the resonator far enough, "{prestige}" lets you restart for Shards and permanent bonuses. Useful later!',
        tutorial_next: 'Next',
        tutorial_done: 'Got it!',
        tutorial_skip: 'Skip',

        upgrade_title: 'RESONATOR',
        upgrade_current_tier: 'CURRENT TIER',
        upgrade_level: 'Level: {cur} / {max}',
        upgrade_price: 'Price: 💠 {price}',
        upgrade_buy: 'Upgrade',
        upgrade_buy_max: 'Buy max',
        upgrade_maxed_contribution: '✓ Maxed · contributes +{n} income',
        upgrade_locked_after: 'Unlocks after the {tier} tier',
        tier_complete_title: '{tier} TIER COMPLETE!',
        tier_unlocked_next: 'New resonator unlocked: {icon} {tier}',
        tier_fully_upgraded: 'Resonator fully upgraded!',
        tier_new_frequency: 'New frequency: {icon} {name} — {desc}',

        helpers_title: 'HELPERS',
        helpers_income_suffix: '+{n}/sec',
        helpers_maxed: 'Maxed',
        helpers_total: 'Total income/sec: {n}',

        freq_title: 'FREQUENCIES',
        freq_active: '✓ Active',
        freq_active_forever: '✓ Active forever (prestige)',
        freq_locked_progress: 'Resonator level: {cur}/{max}',

        prestige_title: 'PRESTIGE',
        prestige_ready_title: 'Resonance is ready to reset!',
        prestige_shards_label: 'resonance shards',
        prestige_ready_desc: 'Will reset: currency, resonator, helpers (except one kept by Memory) and frequencies. Shards and permanent upgrades stay forever.',
        prestige_reset_button: 'RESET RESONATOR',
        prestige_not_ready_title: 'Not ready to reset yet',
        prestige_not_ready_desc: 'Earn 1M coins this run to get at least 1 shard',
        prestige_earned_label: 'Earned: 💠 {n} / 1M',
        prestige_locked_title: 'Unlocks after the ⚡ Lightning frequency',
        prestige_locked_progress: 'Resonator level: {cur}/{max}',
        prestige_confirm_text: 'Reset for real?\nYou\'ll get +{n} ✨',
        prestige_yes: 'Yes',
        prestige_no: 'No',
        prestige_fanfare: 'PRESTIGE!\n+{n} ✨',
        prestige_perks_title: 'PERMANENT UPGRADES',
        perk_legacy_name: 'Legacy',
        perk_legacy_desc: '+10% currency per level (currently +{n}%)',
        perk_seal_name: 'Seal',
        perk_seal_desc: '+5% speed to everything per level (currently +{n}%)',
        perk_memory_name: 'Memory',
        perk_memory_desc: "Keeps your best helper's level on reset",
        perk_bought: 'Bought ✓',

        settings_title: 'SETTINGS',
        settings_language_label: 'Language',
        settings_language_hint: 'Auto-detected — you can pick it manually',
        settings_sfx_label: 'Sound effects',
        settings_sfx_hint: 'Clicks, purchases, prestige and other effects',
        settings_music_label: 'Music',
        settings_music_hint: 'Background ambient music',
        settings_on: 'On',
        settings_off: 'Off',
        settings_footer: 'Resonance · v1.0',

        tier_copper_name: 'Copper',
        tier_copper_desc: '+1 income per click',
        tier_silver_name: 'Silver',
        tier_silver_desc: '+5 income per click. Charge ring fills 10% faster',
        tier_gold_name: 'Gold',
        tier_gold_desc: '+25 income per click. Buff lasts 20% longer',
        tier_plasma_name: 'Plasma',
        tier_plasma_desc: '+100 income per click. Auto-clicks once per second',
        tier_quantum_name: 'Quantum',
        tier_quantum_desc: '+500 income per click. 5% chance to instantly fill the charge ring',

        helper_operator: 'Operator',
        helper_engineer: 'Engineer',
        helper_scientist: 'Scientist',
        helper_mage: 'Mage',

        freq_fire_name: 'Fire',
        freq_fire_desc: 'Resonance buff gives x3 income instead of x2',
        freq_ice_name: 'Ice',
        freq_ice_desc: 'Resonance buff lasts 30% longer',
        freq_lightning_name: 'Lightning',
        freq_lightning_desc: 'Charge ring fills 30% faster',
        freq_nature_name: 'Nature',
        freq_nature_desc: 'Constant passive income +2 per second',
        freq_dark_name: 'Dark',
        freq_dark_desc: '10% chance of a critical click — x10 income'
    }
};

function t(key, vars) {
    const dict = TRANSLATIONS[window.gameLang] || TRANSLATIONS.ru;
    let str = dict[key] !== undefined ? dict[key] : TRANSLATIONS.ru[key];
    if (str === undefined) return key;

    if (vars) {
        Object.keys(vars).forEach((k) => {
            str = str.split(`{${k}}`).join(vars[k]);
        });
    }
    return str;
}
