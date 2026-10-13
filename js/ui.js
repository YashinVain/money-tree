// ui.js — общие хелперы для отображения интерфейса

// Красиво форматирует большие числа: 12450 -> "12,45 тыс", 5000000 -> "5 млн"
function formatNumber(num) {
    num = Math.floor(num);
    const sign = num < 0 ? '-' : '';
    const abs = Math.abs(num);

    if (abs < 1000) return sign + String(abs);

    const units = [
        { value: 1e12, suffix: t('unit_trillion') },
        { value: 1e9, suffix: t('unit_billion') },
        { value: 1e6, suffix: t('unit_million') },
        { value: 1e3, suffix: t('unit_thousand') }
    ];

    for (const unit of units) {
        if (abs >= unit.value) {
            const short = abs / unit.value;
            const digits = short < 10 ? 2 : (short < 100 ? 1 : 0);
            // Обрезаем лишние нули только у дробной части (13.20 -> 13.2),
            // а не у целых чисел без точки (130 должно остаться 130, не 13)
            let text = short.toFixed(digits);
            if (text.includes('.')) {
                text = text.replace(/0+$/, '').replace(/\.$/, '');
            }
            return sign + text + unit.suffix;
        }
    }

    return sign + String(abs);
}

// Переводит числовой цвет Phaser (0xRRGGBB) в CSS-строку для стилей текста
function intToCss(intColor) {
    return Phaser.Display.Color.IntegerToColor(intColor).rgba;
}

// Смешивает два цвета Phaser (0xRRGGBB) в пропорции t (0..1) — линейно по RGB.
// Годится для затемнения (смешивания с чёрным/тёмным фоном)
function blendColors(colorA, colorB, t) {
    const a = Phaser.Display.Color.ValueToColor(colorA);
    const b = Phaser.Display.Color.ValueToColor(colorB);
    const mix = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, 100, t * 100);
    return Phaser.Display.Color.GetColor(Math.round(mix.r), Math.round(mix.g), Math.round(mix.b));
}

// Генерирует один раз мягкую радиальную текстуру (белое пятно, тающее к краям).
// Используется для фоновых "аур" — тонированная через setTint(), это выглядит
// как настоящее мягкое свечение, а не плоский круг с жёсткой границей
function ensureGlowTexture(scene) {
    if (scene.textures.exists('glowRadial')) return;

    const size = 256;
    const canvasTexture = scene.textures.createCanvas('glowRadial', size, size);
    const ctx = canvasTexture.getContext();
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    canvasTexture.refresh();
}

