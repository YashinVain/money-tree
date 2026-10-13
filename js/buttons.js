// buttons.js — единый переиспользуемый компонент кнопки для всей игры.
// Скруглённый фон, цветная иконка-бейдж слева, лёгкое свечение (на WebGL),
// анимация наведения и нажатия. Используется для навигации между экранами
//
// Кликабельная область — отдельная Zone поверх визуала (не сам Container).
// Zone — простой, надёжный примитив Phaser со своим origin(0.5,0.5) из коробки,
// без ручной математики хитбокса, и не "плавает" во время анимации наведения

function createNeonButton(scene, x, y, options) {
    const {
        width = 220,
        height = 56,
        icon = '',
        label = '',
        accentColor = 0x00eaff,
        fontSize = 22,
        iconFontSize = 24,
        onClick = () => {}
    } = options;

    let currentAccent = accentColor;
    let hovering = false;

    const visuals = scene.add.container(x, y);
    const bg = scene.add.graphics();

    const redraw = () => {
        bg.clear();
        bg.fillStyle(0x12121e, hovering ? 0.96 : 0.88);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, height / 2);
        bg.lineStyle(2, currentAccent, hovering ? 1 : 0.55);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, height / 2);
    };
    redraw();

    const badgeX = -width / 2 + height / 2;
    const iconBadge = scene.add.circle(badgeX, 0, height / 2 - 10, currentAccent, 0.2)
        .setStrokeStyle(1.5, currentAccent, 0.9);
    const iconText = scene.add.text(badgeX, 0, icon, { fontSize: `${iconFontSize}px` }).setOrigin(0.5);

    const labelText = scene.add.text(badgeX + height / 2 + 8, 0, label, {
        fontFamily: 'Arial', fontSize: `${fontSize}px`, color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    visuals.add([bg, iconBadge, iconText, labelText]);

    let glowFX = null;
    if (scene.game.renderer.type === Phaser.WEBGL) {
        glowFX = bg.postFX.addGlow(currentAccent, 1.5, 0, false, 0.2, 10);
    }

    // Кликабельная зона — фиксированного размера, не участвует в scale-анимации
    const zone = scene.add.zone(x, y, width, height).setInteractive({ useHandCursor: true });

    zone.on('pointerover', () => {
        hovering = true;
        redraw();
        window.AudioState.playUIHover();
        scene.tweens.add({ targets: visuals, scale: 1.045, duration: 120, ease: 'Sine.easeOut' });
    });
    zone.on('pointerout', () => {
        hovering = false;
        redraw();
        scene.tweens.add({ targets: visuals, scale: 1, duration: 120, ease: 'Sine.easeOut' });
    });
    zone.on('pointerdown', () => {
        window.AudioState.playUIClick();
        scene.tweens.add({
            targets: visuals, scale: 0.94, duration: 70, yoyo: true,
            onComplete: onClick
        });
    });

    zone.setAccentColor = (color) => {
        currentAccent = color;
        iconBadge.setStrokeStyle(1.5, color, 0.9).setFillStyle(color, 0.2);
        redraw();
        if (glowFX) glowFX.color = color;
        return zone;
    };
    zone.setLabel = (text) => { labelText.setText(text); return zone; };
    zone.setIcon = (text) => { iconText.setText(text); return zone; };
    zone.visuals = visuals;

    return zone;
}
