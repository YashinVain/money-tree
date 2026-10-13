document.addEventListener('contextmenu', (e) => e.preventDefault());

class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    async create() {
        await initYandexSDK();
        loadGame();

        if (window.sdkReady) {
            window.ysdk.features.LoadingAPI.ready();
        }

        this.scene.start('MainMenuScene');
    }
}

class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
    }

    create() {
        const { width, height } = this.scale;
        const eraColor = window.ResonatorState.getEraColor();

        this.cameras.main.setBackgroundColor(blendColors(0x0a0a12, eraColor, 0.16));

        this.ensureStarTexture();
        this.createTwinkleStars();
        this.createParticleBackground();
        this.scheduleShootingStar();

        const titleColor = intToCss(eraColor);
        const title = this.add.text(width / 2, height * 0.2, t('game_title'), {
            fontFamily: 'Arial',
            fontSize: '64px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setShadow(0, 0, titleColor, 20, true, true);

        if (this.game.renderer.type === Phaser.WEBGL) {
            title.postFX.addGlow(eraColor, 2, 0, false, 0.15, 14);
        }

        this.tweens.add({
            targets: title,
            scale: { from: 1, to: 1.05 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.currencyText = this.add.text(20, 20, `💠 ${formatNumber(window.gameState.currency)}`, {
            fontFamily: 'Arial', fontSize: '28px', color: '#ffffff'
        });
        this.add.text(width - 20, 20, `✨ ${formatNumber(window.PrestigeState.shards)}`, {
            fontFamily: 'Arial', fontSize: '28px', color: '#ffffff'
        }).setOrigin(1, 0);

        const buttons = [
            { id: 'play', label: t('mainmenu_play'), icon: '▶', y: height * 0.45, accent: eraColor },
            { id: 'upgrades', label: t('mainmenu_upgrades'), icon: '🔧', y: height * 0.545, accent: eraColor },
            { id: 'helpers', label: t('mainmenu_helpers'), icon: '👷', y: height * 0.64, accent: 0x6fe0c0 },
            { id: 'frequencies', label: t('mainmenu_frequencies'), icon: '📡', y: height * 0.735, accent: 0xff6bd6 },
            { id: 'settings', label: t('mainmenu_settings'), icon: '⚙', y: height * 0.83, accent: 0x8fa0c4 }
        ];

        buttons.forEach(btn => this.createMenuNavButton(width / 2, btn.y, btn.label, btn.icon, btn.accent, btn.id));

        if (window.pendingOfflineIncome > 0) {
            this.showOfflineIncomeModal(eraColor);
        }
    }

    formatAwayTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        if (hours > 0) return t('time_hours_minutes', { h: hours, m: minutes });
        if (minutes > 0) return t('time_minutes', { m: minutes });
        return t('time_less_minute');
    }

    showOfflineIncomeModal(accentColor) {
        const { width, height } = this.scale;
        const amount = window.pendingOfflineIncome;
        const awayLabel = this.formatAwayTime(window.lastOfflineAwaySeconds);
        const accentCss = intToCss(accentColor);
        const cx = width / 2, cy = height / 2;

        const overlay = this.add.rectangle(cx, cy, width, height, 0x000000, 0).setInteractive();
        const boxW = width - 80;
        const boxH = 320;

        const glow = this.add.rectangle(cx, cy, boxW + 40, boxH + 40, accentColor, 0.18)
            .setBlendMode(Phaser.BlendModes.ADD);
        const box = this.add.rectangle(cx, cy, boxW, boxH, 0x141428).setStrokeStyle(3, accentColor, 1);
        if (this.game.renderer.type === Phaser.WEBGL) {
            box.postFX.addGlow(accentColor, 3, 0, false, 0.2, 14);
        }

        // Немного мерцающих искр внутри окна для атмосферы
        this.ensureStarTexture();
        const sparkles = [];
        for (let i = 0; i < 7; i++) {
            const sx = cx + Phaser.Math.Between(-boxW / 2 + 20, boxW / 2 - 20);
            const sy = cy + Phaser.Math.Between(-boxH / 2 + 20, boxH / 2 - 20);
            const s = this.add.image(sx, sy, 'star')
                .setScale(Phaser.Math.FloatBetween(0.3, 0.7))
                .setAlpha(0)
                .setTint(accentColor)
                .setBlendMode(Phaser.BlendModes.ADD);
            sparkles.push(s);
            this.tweens.add({
                targets: s, alpha: { from: 0.15, to: Phaser.Math.FloatBetween(0.4, 0.75) },
                duration: Phaser.Math.Between(900, 1800), delay: Phaser.Math.Between(0, 1200),
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
        }

        const moon = this.add.text(cx, cy - 108, '🌙', { fontSize: '54px' }).setOrigin(0.5);
        this.tweens.add({
            targets: moon, angle: { from: -8, to: 8 }, y: { from: cy - 112, to: cy - 104 },
            duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        const title = this.add.text(cx, cy - 54, t('offline_title'), {
            fontFamily: 'Arial', fontSize: '27px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);
        const subtitle = this.add.text(cx, cy - 18, t('offline_subtitle', { time: awayLabel }), {
            fontFamily: 'Arial', fontSize: '20px', color: '#a8a8c8'
        }).setOrigin(0.5);
        const amountText = this.add.text(cx, cy + 32, `+${formatNumber(amount)} 💠`, {
            fontFamily: 'Arial', fontSize: '46px', color: accentCss, fontStyle: 'bold'
        }).setOrigin(0.5).setShadow(0, 0, accentCss, 16, true, true);

        this.tweens.add({
            targets: amountText, scale: { from: 1, to: 1.05 },
            duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        const borderPulse = this.tweens.add({
            targets: box, strokeAlpha: { from: 0.6, to: 1 },
            duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        const group = [glow, box, moon, title, subtitle, amountText, ...sparkles];
        const entrance = [glow, box, moon, title, subtitle, amountText];
        entrance.forEach(o => o.setAlpha(0).setScale(0.85));

        this.tweens.add({ targets: overlay, alpha: 0.75, duration: 250, ease: 'Sine.easeOut' });
        this.tweens.add({
            targets: entrance,
            alpha: 1, scale: 1, duration: 380, ease: 'Back.easeOut', delay: 80
        });

        const collectBtn = createNeonButton(this, cx, cy + 108, {
            width: boxW - 60, height: 56, icon: '✓', label: t('offline_collect'),
            fontSize: 21, accentColor,
            onClick: () => {
                collectOfflineIncome();
                this.currencyText.setText(`💠 ${formatNumber(window.gameState.currency)}`);
                this.emitOfflineBurst(cx, cy, accentColor);
                borderPulse.stop();
                overlay.destroy();
                group.forEach(o => o.destroy());
                collectBtn.visuals.destroy();
                collectBtn.destroy();
            }
        });
        collectBtn.visuals.setAlpha(0).setScale(0.85);
        this.tweens.add({ targets: collectBtn.visuals, alpha: 1, scale: 1, duration: 380, ease: 'Back.easeOut', delay: 140 });
    }

    emitOfflineBurst(x, y, color) {
        this.ensureParticleTexture();
        const emitter = this.add.particles(x, y, 'particle', {
            lifespan: 600, speed: { min: 80, max: 220 }, scale: { start: 0.7, end: 0 },
            tint: color, blendMode: 'ADD', quantity: 26, emitting: false
        });
        emitter.explode(26);
        this.time.delayedCall(700, () => emitter.destroy());
    }

    createParticleBackground() {
        this.ensureParticleTexture();
        const { width, height } = this.scale;

        this.add.particles(0, 0, 'particle', {
            x: { min: 0, max: width },
            y: { min: 0, max: height },
            lifespan: 6000,
            speedY: { min: -15, max: -5 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.5, end: 0 },
            tint: 0x00eaff,
            quantity: 1,
            frequency: 200,
            blendMode: 'ADD'
        });
    }

    ensureParticleTexture() {
        if (this.textures.exists('particle')) return;
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(0xffffff, 1);
        gfx.fillCircle(4, 4, 4);
        gfx.generateTexture('particle', 8, 8);
        gfx.destroy();
    }

    ensureStarTexture() {
        if (this.textures.exists('star')) return;
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(0xffffff, 1);
        gfx.beginPath();
        gfx.moveTo(8, 0);
        gfx.lineTo(10, 6);
        gfx.lineTo(16, 8);
        gfx.lineTo(10, 10);
        gfx.lineTo(8, 16);
        gfx.lineTo(6, 10);
        gfx.lineTo(0, 8);
        gfx.lineTo(6, 6);
        gfx.closePath();
        gfx.fillPath();
        gfx.generateTexture('star', 16, 16);
        gfx.destroy();
    }

    createTwinkleStars() {
        const { width, height } = this.scale;

        for (let i = 0; i < 16; i++) {
            const x = Phaser.Math.Between(20, width - 20);
            const y = Phaser.Math.Between(20, height - 20);

            const star = this.add.image(x, y, 'star')
                .setScale(Phaser.Math.FloatBetween(0.5, 1.4))
                .setAlpha(0.15)
                .setBlendMode(Phaser.BlendModes.ADD);

            this.tweens.add({
                targets: star,
                alpha: { from: 0.1, to: Phaser.Math.FloatBetween(0.4, 0.85) },
                duration: Phaser.Math.Between(1300, 3000),
                delay: Phaser.Math.Between(0, 2000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    scheduleShootingStar() {
        const delay = Phaser.Math.Between(14000, 30000);
        this.time.delayedCall(delay, () => {
            this.spawnShootingStar();
            this.scheduleShootingStar();
        });
    }

    spawnShootingStar() {
        const { width, height } = this.scale;
        const startX = Phaser.Math.Between(30, width * 0.5);
        const startY = Phaser.Math.Between(20, height * 0.25);
        const travelX = Phaser.Math.Between(240, 400);
        const travelY = Phaser.Math.Between(150, 260);

        const star = this.add.image(startX, startY, 'star')
            .setScale(1.5)
            .setAlpha(0.95)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setRotation(Math.atan2(travelY, travelX));

        const trail = this.add.particles(0, 0, 'particle', {
            follow: star,
            lifespan: 260,
            speed: 0,
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.6, end: 0 },
            tint: 0xffffff,
            blendMode: 'ADD',
            frequency: 12,
            quantity: 1
        });

        this.tweens.add({
            targets: star,
            x: startX + travelX,
            y: startY + travelY,
            alpha: { from: 0.95, to: 0 },
            duration: 900,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                star.destroy();
                this.time.delayedCall(300, () => trail.destroy());
            }
        });
    }

    createMenuNavButton(x, y, label, icon, accent, id) {
        return createNeonButton(this, x, y, {
            width: 320, height: 60, icon, label,
            fontSize: 24, iconFontSize: 26,
            accentColor: accent,
            onClick: () => {
                if (id === 'play') {
                    this.scene.start('ResonanceScene');
                } else if (id === 'upgrades') {
                    this.scene.start('UpgradeScene', { from: 'MainMenuScene' });
                } else if (id === 'helpers') {
                    this.scene.start('HelperScene', { from: 'MainMenuScene' });
                } else if (id === 'frequencies') {
                    this.scene.start('FrequencyScene', { from: 'MainMenuScene' });
                } else if (id === 'settings') {
                    this.scene.start('SettingsScene', { from: 'MainMenuScene' });
                } else {
                    console.log(`Раздел "${id}" будет добавлен на следующих этапах`);
                }
            }
        });
    }
}

class ResonanceScene extends Phaser.Scene {
    constructor() {
        super('ResonanceScene');
    }

    create() {
        const { width, height } = this.scale;
        this.centerX = width / 2;
        this.centerY = height * 0.45;
        this.ringRadius = 160;
        this.releasePulseTween = null;
        this.fxEnabled = this.game.renderer.type === Phaser.WEBGL;

        this.eraColor = window.ResonatorState.getEraColor();

        this.ensureParticleTexture();
        this.ensureStarTexture();
        this.createBackgroundAura();
        this.createEraGlow();
        this.createAmbientParticles();
        this.createTwinkleStars();
        this.createOrbitDots();
        this.scheduleShootingStar();
        this.createNavButtons();
        this.createIncomeTimer();

        this.currencyText = this.add.text(20, 20, '', {
            fontFamily: 'Arial', fontSize: '28px', color: '#ffffff'
        });
        this.incomeText = this.add.text(20, 58, t('income_per_sec', { n: 0 }), {
            fontFamily: 'Arial', fontSize: '18px', color: '#8888aa'
        });
        this.shardText = this.add.text(width - 20, 20, '', {
            fontFamily: 'Arial', fontSize: '28px', color: '#ffffff'
        }).setOrigin(1, 0);

        this.ringGraphics = this.add.graphics();
        this.createResonator();
        this.createReleaseButton();

        this.buffText = this.add.text(this.centerX, this.centerY + this.ringRadius + 110, '', {
            fontFamily: 'Arial', fontSize: '22px', color: '#ff00aa', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.updateUI();
        this.startTutorialIfNeeded();
    }

    ensureParticleTexture() {
        if (this.textures.exists('particle')) return;
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(0xffffff, 1);
        gfx.fillCircle(4, 4, 4);
        gfx.generateTexture('particle', 8, 8);
        gfx.destroy();
    }

    ensureStarTexture() {
        if (this.textures.exists('star')) return;
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(0xffffff, 1);
        gfx.beginPath();
        gfx.moveTo(8, 0);
        gfx.lineTo(10, 6);
        gfx.lineTo(16, 8);
        gfx.lineTo(10, 10);
        gfx.lineTo(8, 16);
        gfx.lineTo(6, 10);
        gfx.lineTo(0, 8);
        gfx.lineTo(6, 6);
        gfx.closePath();
        gfx.fillPath();
        gfx.generateTexture('star', 16, 16);
        gfx.destroy();
    }

    createBackgroundAura() {
        ensureGlowTexture(this);
        const { width, height } = this.scale;
        const specs = [
            { x: width * 0.18, y: height * 0.18, scale: 3.4, alpha: 0.5 },
            { x: width * 0.85, y: height * 0.32, scale: 2.8, alpha: 0.4 },
            { x: width * 0.5, y: height * 0.92, scale: 3.8, alpha: 0.38 }
        ];

        this.auraBlobs = specs.map((spec, i) => {
            const img = this.add.image(spec.x, spec.y, 'glowRadial')
                .setScale(spec.scale)
                .setTint(this.eraColor)
                .setAlpha(spec.alpha)
                .setBlendMode(Phaser.BlendModes.ADD);

            this.tweens.add({
                targets: img,
                x: spec.x + Phaser.Math.Between(-70, 70),
                y: spec.y + Phaser.Math.Between(-70, 70),
                scale: { from: spec.scale * 0.85, to: spec.scale * 1.2 },
                duration: 9000 + i * 1600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            return { shape: img, baseAlpha: spec.alpha };
        });
    }

    createOrbitDots() {
        this.orbitAngle = 0;
        this.orbitDots = [];

        for (let i = 0; i < 4; i++) {
            const dot = this.add.circle(this.centerX, this.centerY, 5, this.eraColor, 0.9)
                .setBlendMode(Phaser.BlendModes.ADD);
            this.orbitDots.push(dot);
        }
    }

    createTwinkleStars() {
        const { width, height } = this.scale;

        // Не даём звёздам заспавниться под кнопками навигации (справа сверху)
        // и под счётчиками валюты (слева сверху)
        const noSpawnZones = [
            { x: width - 240, y: 10, w: 230, h: 385 },
            { x: 0, y: 0, w: 190, h: 100 }
        ];
        const inZone = (x, y) => noSpawnZones.some(z => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h);

        for (let i = 0; i < 24; i++) {
            let x, y, attempts = 0;
            do {
                x = Phaser.Math.Between(20, width - 20);
                y = Phaser.Math.Between(20, height - 20);
                attempts++;
            } while (inZone(x, y) && attempts < 10);

            const star = this.add.image(x, y, 'star')
                .setScale(Phaser.Math.FloatBetween(0.5, 1.4))
                .setAlpha(0.15)
                .setTint(0xffffff)
                .setBlendMode(Phaser.BlendModes.ADD);

            this.tweens.add({
                targets: star,
                alpha: { from: 0.1, to: Phaser.Math.FloatBetween(0.4, 0.85) },
                duration: Phaser.Math.Between(1300, 3000),
                delay: Phaser.Math.Between(0, 2000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    // Редкое фоновое украшение — падающая звезда со шлейфом. Не влияет
    // на геймплей, просто изредка оживляет фон
    scheduleShootingStar() {
        const delay = Phaser.Math.Between(14000, 30000);
        this.time.delayedCall(delay, () => {
            this.spawnShootingStar();
            this.scheduleShootingStar();
        });
    }

    spawnShootingStar() {
        const { width } = this.scale;
        const startX = Phaser.Math.Between(30, width * 0.5);
        const startY = Phaser.Math.Between(20, this.centerY - this.ringRadius - 80);
        const travelX = Phaser.Math.Between(240, 400);
        const travelY = Phaser.Math.Between(150, 260);

        const star = this.add.image(startX, startY, 'star')
            .setScale(1.5)
            .setAlpha(0.95)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setRotation(Math.atan2(travelY, travelX));

        const trail = this.add.particles(0, 0, 'particle', {
            follow: star,
            lifespan: 260,
            speed: 0,
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.6, end: 0 },
            tint: 0xffffff,
            blendMode: 'ADD',
            frequency: 12,
            quantity: 1
        });

        this.tweens.add({
            targets: star,
            x: startX + travelX,
            y: startY + travelY,
            alpha: { from: 0.95, to: 0 },
            duration: 900,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                star.destroy();
                this.time.delayedCall(300, () => trail.destroy());
            }
        });
    }

    createEraGlow() {
        const { width, height } = this.scale;
        this.eraGlowOverlay = this.add.rectangle(width / 2, height / 2, width, height, this.eraColor, 0.07)
            .setBlendMode(Phaser.BlendModes.ADD);
    }

    createAmbientParticles() {
        const { width, height } = this.scale;
        this.add.particles(0, 0, 'particle', {
            x: { min: 0, max: width },
            y: { min: 0, max: height },
            lifespan: 6000,
            speedY: { min: -15, max: -5 },
            scale: { start: 0.25, end: 0 },
            alpha: { start: 0.35, end: 0 },
            tint: 0x00eaff,
            quantity: 1,
            frequency: 250,
            blendMode: 'ADD'
        });
    }

    createNavButtons() {
        const { width } = this.scale;
        const navX = width - 20 - 105;

        // Начинаем ниже счётчика "✨" в правом верхнем углу (он занимает y:20-50),
        // чтобы кнопки не накладывались на него
        this.menuNavBtn = createNeonButton(this, navX, 90, {
            width: 210, height: 52, icon: '☰', label: t('nav_menu'),
            accentColor: 0x8fa0c4,
            onClick: () => this.scene.start('MainMenuScene')
        });

        this.upgradeNavBtn = createNeonButton(this, navX, 156, {
            width: 210, height: 52, icon: '🔧', label: t('nav_upgrades'),
            accentColor: this.eraColor,
            onClick: () => this.scene.start('UpgradeScene', { from: 'ResonanceScene' })
        });

        this.helperNavBtn = createNeonButton(this, navX, 222, {
            width: 210, height: 52, icon: '👷', label: t('nav_helpers'),
            accentColor: 0x6fe0c0,
            onClick: () => this.scene.start('HelperScene', { from: 'ResonanceScene' })
        });

        this.frequencyNavBtn = createNeonButton(this, navX, 288, {
            width: 210, height: 52, icon: '📡', label: t('nav_frequencies'),
            accentColor: 0xff8a3d,
            onClick: () => this.scene.start('FrequencyScene', { from: 'ResonanceScene' })
        });

        this.prestigeNavBtn = createNeonButton(this, navX, 354, {
            width: 210, height: 52, icon: '♻️', label: t('nav_prestige'),
            accentColor: window.PrestigeState.canPrestige() ? 0xc9a8ff : 0x555566,
            onClick: () => this.scene.start('PrestigeScene', { from: 'ResonanceScene' })
        });
    }

    createIncomeTimer() {
        this.incomeTimer = this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                const result = tickPassiveEconomy();

                if (result.autoClickIncome !== null) {
                    this.showIncomePopup(this.centerX, this.centerY - 90, result.autoClickIncome, '#aa33ff');
                    this.emitBurst(this.centerX, this.centerY, 6, 0xaa33ff);
                }

                if (result.helperIncome > 0 || result.autoClickIncome !== null) {
                    this.updateUI();
                }
            }
        });
    }

    createResonator() {
        const radius = 90;

        this.glow = this.add.circle(this.centerX, this.centerY, radius + 20, this.eraColor, 0.15);
        this.resonator = this.add.circle(this.centerX, this.centerY, radius, 0x162447)
            .setStrokeStyle(3, this.eraColor)
            .setInteractive({ useHandCursor: true });

        this.add.text(this.centerX, this.centerY, '⚡', { fontSize: '56px' }).setOrigin(0.5);

        if (this.fxEnabled) {
            this.resonatorGlowFX = this.resonator.postFX.addGlow(this.eraColor, 3, 0, false, 0.15, 24);
            this.glowFX = this.glow.postFX.addGlow(this.eraColor, 2, 0, false, 0.1, 16);
        }

        this.resonator.on('pointerdown', (pointer) => this.onResonatorClick(pointer));
    }

    spawnShockwave(x, y) {
        const ring = this.add.circle(x, y, 8, this.eraColor, 0).setStrokeStyle(3, this.eraColor, 1);
        this.tweens.add({
            targets: ring,
            radius: 55,
            alpha: 0,
            duration: 450,
            ease: 'Cubic.easeOut',
            onComplete: () => ring.destroy()
        });
    }

    onResonatorClick(pointer) {
        const income = handleClick();
        const isCrit = window.lastClickWasCrit;

        this.tweens.add({
            targets: [this.resonator, this.glow],
            scale: { from: 1, to: isCrit ? 0.82 : 0.9 },
            duration: 80,
            yoyo: true,
            ease: 'Sine.easeInOut'
        });

        this.spawnShockwave(this.centerX, this.centerY);

        if (isCrit) {
            this.showCritPopup(pointer.x, pointer.y, income);
            this.emitBurst(pointer.x, pointer.y, 20, 0x9b6bff);
            this.cameras.main.shake(120, 0.006);
            window.AudioState.playCrit();
        } else {
            this.showIncomePopup(pointer.x, pointer.y, income, intToCss(this.eraColor));
            this.emitBurst(pointer.x, pointer.y, 8, this.eraColor);
            window.AudioState.playClick();
        }

        this.updateUI();
    }

    showCritPopup(x, y, income) {
        const label = this.add.text(x, y - 24, t('crit_label'), {
            fontFamily: 'Arial', fontSize: '20px', color: '#9b6bff', fontStyle: 'bold'
        }).setOrigin(0.5).setScale(0.5);
        const popup = this.add.text(x, y + 6, `+${formatNumber(income)}`, {
            fontFamily: 'Arial', fontSize: '34px', color: '#c9a8ff', fontStyle: 'bold'
        }).setOrigin(0.5).setScale(0.5);

        this.tweens.add({ targets: [label, popup], scale: 1, duration: 160, ease: 'Back.easeOut' });
        this.tweens.add({
            targets: [label, popup],
            y: '-=70',
            alpha: 0,
            delay: 160,
            duration: 550,
            ease: 'Cubic.easeOut',
            onComplete: () => { label.destroy(); popup.destroy(); }
        });
    }

    showIncomePopup(x, y, income, color) {
        const popup = this.add.text(x, y, `+${formatNumber(income)}`, {
            fontFamily: 'Arial', fontSize: '26px', color: color, fontStyle: 'bold'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: popup,
            y: y - 60,
            alpha: 0,
            duration: 600,
            ease: 'Cubic.easeOut',
            onComplete: () => popup.destroy()
        });
    }

    emitBurst(x, y, count, color) {
        const emitter = this.add.particles(x, y, 'particle', {
            lifespan: 400,
            speed: { min: 60, max: 140 },
            scale: { start: 0.6, end: 0 },
            tint: color,
            blendMode: 'ADD',
            quantity: count,
            emitting: false
        });
        emitter.explode(count);
        this.time.delayedCall(500, () => emitter.destroy());
    }

    createReleaseButton() {
        const y = this.centerY + this.ringRadius + 60;
        this.releaseBtn = this.add.text(this.centerX, y, t('release_button'), {
            fontFamily: 'Arial', fontSize: '28px', color: '#555566',
            backgroundColor: '#1a1a2e', padding: { x: 30, y: 14 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.releaseBtn.on('pointerdown', () => this.onRelease());
    }

    onRelease() {
        if (!window.ResonanceState.canRelease()) return;

        window.ResonanceState.release();
        window.AudioState.playRelease();

        const { width, height } = this.scale;
        const flash = this.add.rectangle(width / 2, height / 2, width, height, this.eraColor, 0.5);
        this.tweens.add({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy() });

        this.emitBurst(this.centerX, this.centerY, 20, this.eraColor);
        this.time.delayedCall(150, () => this.emitBurst(this.centerX, this.centerY, 20, 0xff00aa));
        this.cameras.main.shake(150, 0.004);

        this.updateUI();
    }

    updateUI() {
        this.currencyText.setText(`💠 ${formatNumber(window.gameState.currency)}`);
        this.shardText.setText(`✨ ${formatNumber(window.PrestigeState.shards)}`);
        const totalPerSec = window.HelperState.getTotalIncomePerSec() + window.FrequencyState.getPassiveIncome();
        this.incomeText.setText(t('income_per_sec', { n: formatNumber(totalPerSec) }));
        this.applyEraVisuals();
        this.drawRing();
        this.updateReleaseButton();
        this.updateBuffText();
    }

    applyEraVisuals() {
        this.eraColor = window.ResonatorState.getEraColor();
        this.eraGlowOverlay.setFillStyle(this.eraColor, 0.07);
        this.resonator.setStrokeStyle(3, this.eraColor);
        this.glow.setFillStyle(this.eraColor, 0.15);

        const bgColor = blendColors(0x0a0a12, this.eraColor, 0.16);
        this.cameras.main.setBackgroundColor(bgColor);

        this.auraBlobs.forEach(blob => blob.shape.setTint(this.eraColor));
        this.orbitDots.forEach(dot => dot.setFillStyle(this.eraColor, 0.9));
        this.upgradeNavBtn.setAccentColor(this.eraColor);

        if (this.fxEnabled) {
            this.resonatorGlowFX.color = this.eraColor;
            this.glowFX.color = this.eraColor;
        }
    }

    drawRing() {
        const g = this.ringGraphics;
        g.clear();

        const segments = window.ResonanceState.maxCharge;
        const gapDeg = 3;
        const segDeg = 360 / segments;
        const drawDeg = segDeg - gapDeg;

        for (let i = 0; i < segments; i++) {
            const filled = i < window.ResonanceState.charge;
            const color = filled ? this.eraColor : 0x2a2a3e;
            const alpha = filled ? 1 : 0.6;

            const startDeg = -90 + i * segDeg + gapDeg / 2;
            const endDeg = startDeg + drawDeg;

            g.lineStyle(10, color, alpha);
            g.beginPath();
            g.arc(this.centerX, this.centerY, this.ringRadius,
                Phaser.Math.DegToRad(startDeg), Phaser.Math.DegToRad(endDeg), false);
            g.strokePath();
        }
    }

        updateReleaseButton() {
        const state = window.ResonanceState;
        const ready = state.canRelease();
        const cooling = state.isOnCooldown();

        if (ready) {
            this.releaseBtn.setText(t('release_button'));
            this.releaseBtn.setStyle({ color: '#0a0a12', backgroundColor: intToCss(this.eraColor) });

            if (this.fxEnabled) {
                if (!this.releaseGlowFX) {
                    this.releaseGlowFX = this.releaseBtn.postFX.addGlow(this.eraColor, 2, 0, false, 0.15, 12);
                } else {
                    this.releaseGlowFX.color = this.eraColor;
                }
            }

            if (!this.releasePulseTween) {
                this.releasePulseTween = this.tweens.add({
                    targets: this.releaseBtn,
                    scale: { from: 1, to: 1.08 },
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        } else {
            if (this.releasePulseTween) {
                this.releasePulseTween.stop();
                this.releasePulseTween = null;
                this.releaseBtn.setScale(1);
            }

            if (this.releaseGlowFX) {
                this.releaseBtn.postFX.clear();
                this.releaseGlowFX = null;
            }

            if (cooling) {
                const secondsLeft = Math.ceil(state.getCooldownTimeLeft() / 1000);
                this.releaseBtn.setText(t('release_cooldown', { sec: secondsLeft }));
                this.releaseBtn.setStyle({ color: '#ff9933', backgroundColor: '#2a1e12' });
            } else {
                this.releaseBtn.setText(t('release_button'));
                this.releaseBtn.setStyle({ color: '#555566', backgroundColor: '#1a1a2e' });
            }
        }
    }

    updateBuffText() {
        if (window.ResonanceState.isBuffActive()) {
            const secondsLeft = Math.ceil(window.ResonanceState.getBuffTimeLeft() / 1000);
            const mult = window.FrequencyState.getBuffMultiplier();
            this.buffText.setText(t('buff_label', { mult, sec: secondsLeft }));
        } else {
            this.buffText.setText('');
        }
    }


    update() {
        this.currencyText.setText(`💠 ${formatNumber(window.gameState.currency)}`);
        this.updateReleaseButton();
        this.updateBuffText();
        this.updateOrbitDots();
    }

    updateOrbitDots() {
        this.orbitAngle += 0.018;
        const radius = 128;

        this.orbitDots.forEach((dot, i) => {
            const angle = this.orbitAngle + (i * Math.PI / 2);
            dot.setPosition(
                this.centerX + Math.cos(angle) * radius,
                this.centerY + Math.sin(angle) * radius * 0.32
            );
        });
    }

    // Обучение для новых игроков — один раз, дальше запоминается навсегда
    startTutorialIfNeeded() {
        if (window.TutorialState.hasSeenTutorial()) return;

        this.tutorialSteps = [
            {
                x: this.centerX, y: this.centerY, radius: 118,
                text: t('tutorial_step1')
            },
            {
                x: this.centerX, y: this.centerY, radius: this.ringRadius + 18,
                text: t('tutorial_step2')
            },
            {
                x: this.releaseBtn.x, y: this.releaseBtn.y, radius: 140,
                text: t('tutorial_step3', { release: t('release_button') })
            },
            {
                x: this.upgradeNavBtn.x, y: this.upgradeNavBtn.y, radius: 120,
                text: t('tutorial_step4', { upgrades: t('nav_upgrades') })
            },
            {
                x: this.helperNavBtn.x, y: this.helperNavBtn.y, radius: 120,
                text: t('tutorial_step5', { helpers: t('nav_helpers') })
            },
            {
                x: this.prestigeNavBtn.x, y: this.prestigeNavBtn.y, radius: 120,
                text: t('tutorial_step6', { prestige: t('nav_prestige') })
            }
        ];
        this.tutorialIndex = 0;
        this.buildTutorialUI();
    }

    buildTutorialUI() {
        const { width, height } = this.scale;
        const step0 = this.tutorialSteps[0];

        this.tutorialOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
            .setInteractive();
        this.tweens.add({ targets: this.tutorialOverlay, alpha: 0.45, duration: 300 });

        this.tutorialRing = this.add.circle(step0.x, step0.y, step0.radius, 0xffffff, 0)
            .setStrokeStyle(4, 0x00eaff, 0.9);
        this.tutorialRingOuter = this.add.circle(step0.x, step0.y, step0.radius + 16, 0xffffff, 0)
            .setStrokeStyle(2, 0x00eaff, 0.4);

        this.tutorialPulse = this.tweens.add({
            targets: [this.tutorialRing, this.tutorialRingOuter],
            scale: { from: 0.94, to: 1.06 },
            duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        const panelY = height - 190;
        const panelW = width - 60;
        const panelH = 170;

        this.tutorialPanel = this.add.rectangle(width / 2, panelY, panelW, panelH, 0x141428, 0.97)
            .setStrokeStyle(2, 0x00eaff, 0.8);
        if (this.fxEnabled) this.tutorialPanel.postFX.addGlow(0x00eaff, 2, 0, false, 0.2, 10);

        this.tutorialText = this.add.text(width / 2, panelY - 34, '', {
            fontFamily: 'Arial', fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
            align: 'center', wordWrap: { width: panelW - 60 }
        }).setOrigin(0.5);

        this.tutorialDots = [];
        const dotsY = panelY + 16;
        const dotsStartX = width / 2 - (this.tutorialSteps.length - 1) * 12;
        for (let i = 0; i < this.tutorialSteps.length; i++) {
            this.tutorialDots.push(this.add.circle(dotsStartX + i * 24, dotsY, 5, 0x00eaff, 0.3));
        }

        this.tutorialSkip = this.add.text(width / 2, panelY + 48, t('tutorial_skip'), {
            fontFamily: 'Arial', fontSize: '15px', color: '#666677'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.tutorialSkip.on('pointerover', () => this.tutorialSkip.setColor('#9999aa'));
        this.tutorialSkip.on('pointerout', () => this.tutorialSkip.setColor('#666677'));
        this.tutorialSkip.on('pointerdown', () => this.endTutorial());

        this.tutorialNextBtn = createNeonButton(this, width / 2, panelY + 92, {
            width: panelW - 100, height: 46, icon: '→', label: t('tutorial_next'),
            fontSize: 18, accentColor: 0x00eaff,
            onClick: () => this.advanceTutorial()
        });

        this.renderTutorialStep();
    }

    renderTutorialStep() {
        const step = this.tutorialSteps[this.tutorialIndex];
        const isLast = this.tutorialIndex === this.tutorialSteps.length - 1;

        this.tutorialText.setAlpha(0).setText(step.text);
        this.tweens.add({ targets: this.tutorialText, alpha: 1, duration: 200 });

        this.tutorialDots.forEach((dot, i) => dot.setFillStyle(0x00eaff, i === this.tutorialIndex ? 1 : 0.3));

        this.tweens.add({
            targets: this.tutorialRing,
            x: step.x, y: step.y, radius: step.radius,
            duration: 420, ease: 'Cubic.easeInOut'
        });
        this.tweens.add({
            targets: this.tutorialRingOuter,
            x: step.x, y: step.y, radius: step.radius + 16,
            duration: 420, ease: 'Cubic.easeInOut'
        });

        this.tutorialNextBtn.setLabel(isLast ? t('tutorial_done') : t('tutorial_next'));
        this.tutorialNextBtn.setIcon(isLast ? '✓' : '→');
    }

    advanceTutorial() {
        if (this.tutorialIndex >= this.tutorialSteps.length - 1) {
            this.endTutorial();
            return;
        }
        this.tutorialIndex++;
        this.renderTutorialStep();
    }

    endTutorial() {
        window.TutorialState.markSeen();

        if (this.tutorialPulse) this.tutorialPulse.stop();

        const parts = [
            this.tutorialOverlay, this.tutorialRing, this.tutorialRingOuter,
            this.tutorialPanel, this.tutorialText, this.tutorialSkip,
            ...this.tutorialDots
        ];
        this.tweens.add({
            targets: parts, alpha: 0, duration: 250,
            onComplete: () => parts.forEach(p => p.destroy())
        });

        this.tutorialNextBtn.visuals.destroy();
        this.tutorialNextBtn.destroy();
    }
}

class UpgradeScene extends Phaser.Scene {
    constructor() {
        super('UpgradeScene');
    }

    init(data) {
        this.fromScene = (data && data.from) || 'MainMenuScene';
    }

    create() {
        const { width } = this.scale;
        this.cardX = 30;
        this.cardWidth = width - 60;
        this.cardGap = 18;
        this.cardStartY = 130;
        this.cards = [];
        this.layoutReady = false;
        this.eraColor = window.ResonatorState.getEraColor();
        this.fxEnabled = this.game.renderer.type === Phaser.WEBGL;

        this.ensureParticleTexture();
        this.ensureStarTexture();
        this.cameras.main.setBackgroundColor(blendColors(0x0a0a12, this.eraColor, 0.16));
        this.createEraGlow();
        this.createAmbientParticles();
        this.createTwinkleStars();
        this.createHeader();

        window.ResonatorState.tiers.forEach((tier, index) => {
            this.cards.push(this.createTierCard(tier, index));
        });

        this.updateCards();
        this.layoutReady = true;

        // Доход от помощников и авто-клика продолжает капать, пока мы качаем
        // резонатор — сессия считается "активной" везде, кроме главного меню
        this.incomeTimer = this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                const result = tickPassiveEconomy();
                if (result.helperIncome > 0 || result.autoClickIncome !== null) {
                    this.currencyText.setText(`💠 ${formatNumber(window.gameState.currency)}`);
                }
            }
        });
    }

    ensureParticleTexture() {
        if (this.textures.exists('particle')) return;
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(0xffffff, 1);
        gfx.fillCircle(4, 4, 4);
        gfx.generateTexture('particle', 8, 8);
        gfx.destroy();
    }

    ensureStarTexture() {
        if (this.textures.exists('star')) return;
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(0xffffff, 1);
        gfx.beginPath();
        gfx.moveTo(8, 0);
        gfx.lineTo(10, 6);
        gfx.lineTo(16, 8);
        gfx.lineTo(10, 10);
        gfx.lineTo(8, 16);
        gfx.lineTo(6, 10);
        gfx.lineTo(0, 8);
        gfx.lineTo(6, 6);
        gfx.closePath();
        gfx.fillPath();
        gfx.generateTexture('star', 16, 16);
        gfx.destroy();
    }

    createTwinkleStars() {
        const { width, height } = this.scale;

        for (let i = 0; i < 14; i++) {
            const x = Phaser.Math.Between(20, width - 20);
            const y = Phaser.Math.Between(20, height - 20);

            const star = this.add.image(x, y, 'star')
                .setScale(Phaser.Math.FloatBetween(0.5, 1.2))
                .setAlpha(0.12)
                .setBlendMode(Phaser.BlendModes.ADD);

            this.tweens.add({
                targets: star,
                alpha: { from: 0.08, to: Phaser.Math.FloatBetween(0.3, 0.6) },
                duration: Phaser.Math.Between(1300, 3000),
                delay: Phaser.Math.Between(0, 2000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    createEraGlow() {
        const { width, height } = this.scale;
        this.eraGlowOverlay = this.add.rectangle(width / 2, height / 2, width, height, this.eraColor, 0.06)
            .setBlendMode(Phaser.BlendModes.ADD);

        ensureGlowTexture(this);
        this.auraBlobs = [
            this.add.image(width * 0.1, height * 0.08, 'glowRadial').setScale(2.6),
            this.add.image(width * 0.95, height * 1.02, 'glowRadial').setScale(3)
        ].map(img => img.setTint(this.eraColor).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD));
    }

    createAmbientParticles() {
        const { width, height } = this.scale;
        this.add.particles(0, 0, 'particle', {
            x: { min: 0, max: width },
            y: { min: 0, max: height },
            lifespan: 6000,
            speedY: { min: -15, max: -5 },
            scale: { start: 0.2, end: 0 },
            alpha: { start: 0.25, end: 0 },
            tint: 0x00eaff,
            quantity: 1,
            frequency: 300,
            blendMode: 'ADD'
        });
    }

    createHeader() {
        const { width } = this.scale;

        this.currencyText = this.add.text(20, 20, '', {
            fontFamily: 'Arial', fontSize: '26px', color: '#ffffff'
        });

        createNeonButton(this, width - 20 - 80, 44, {
            width: 160, height: 48, icon: '←', label: t('nav_back'),
            fontSize: 19, iconFontSize: 20,
            accentColor: 0x8fa0c4,
            onClick: () => this.scene.start(this.fromScene)
        });

        this.titleText = this.add.text(width / 2, 75, t('upgrade_title'), {
            fontFamily: 'Arial', fontSize: '36px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.updateTitleGlow();
    }

    updateTitleGlow() {
        const css = intToCss(this.eraColor);
        this.titleText.setShadow(0, 0, css, 15, true, true);
        this.eraGlowOverlay.setFillStyle(this.eraColor, 0.06);
        this.cameras.main.setBackgroundColor(blendColors(0x0a0a12, this.eraColor, 0.16));
        this.auraBlobs.forEach(blob => blob.setTint(this.eraColor));

        if (this.fxEnabled) {
            if (!this.titleGlowFX) {
                this.titleGlowFX = this.titleText.postFX.addGlow(this.eraColor, 2, 0, false, 0.15, 14);
            } else {
                this.titleGlowFX.color = this.eraColor;
            }
        }
    }

    createTierCard(tier, index) {
        const w = this.cardWidth;
        const container = this.add.container(this.cardX, 0);

        const glowBg = this.add.rectangle(w / 2, 0, w + 30, 10, tier.color, 0.15)
            .setBlendMode(Phaser.BlendModes.ADD).setVisible(false);

        const cardBg = this.add.rectangle(w / 2, 0, w, 10, 0x141428)
            .setStrokeStyle(2, tier.color, 0.6);

        const iconCircle = this.add.circle(0, 0, 30, tier.color, 0.22).setStrokeStyle(2, tier.color);
        const iconText = this.add.text(0, 0, tier.icon, { fontSize: '30px' }).setOrigin(0.5);
        const checkIcon = this.add.text(0, 0, '✅', { fontSize: '26px' }).setOrigin(0.5).setVisible(false);
        const lockIcon = this.add.text(0, 0, '🔒', { fontSize: '22px' }).setOrigin(0.5).setVisible(false);

        const tierLabelText = this.add.text(0, 0, t('upgrade_current_tier'), {
            fontFamily: 'Arial', fontSize: '14px', color: tier.colorHex, fontStyle: 'bold'
        }).setVisible(false);

        const nameText = this.add.text(0, 0, tier.name, {
            fontFamily: 'Arial', fontSize: '22px', color: '#ffffff', fontStyle: 'bold'
        });
        const descText = this.add.text(0, 0, tier.description, {
            fontFamily: 'Arial', fontSize: '17px', color: '#9a9ac0'
        });
        const levelText = this.add.text(0, 0, '', {
            fontFamily: 'Arial', fontSize: '19px', color: '#cccccc'
        });
        const priceText = this.add.text(0, 0, '', {
            fontFamily: 'Arial', fontSize: '22px', color: '#ffdd55', fontStyle: 'bold'
        });

        const progressBg = this.add.rectangle(0, 0, 10, 16, 0x2a2a3e).setOrigin(0, 0.5);
        const progressFill = this.add.rectangle(0, 0, 0, 16, tier.color).setOrigin(0, 0.5);
        const percentText = this.add.text(0, 0, '', {
            fontFamily: 'Arial', fontSize: '13px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false);

        const buyBtn = this.add.text(0, 0, t('upgrade_buy'), {
            fontFamily: 'Arial', fontSize: '21px', color: '#0a0a12',
            backgroundColor: '#00eaff', padding: { x: 18, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const buyMaxBtn = this.add.text(0, 0, t('upgrade_buy_max'), {
            fontFamily: 'Arial', fontSize: '18px', color: '#ffffff',
            backgroundColor: '#2a2a3e', padding: { x: 14, y: 9 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        buyBtn.on('pointerdown', () => this.onBuy(index, buyBtn));
        buyMaxBtn.on('pointerdown', () => this.onBuyMax(index, buyMaxBtn));
        buyBtn.on('pointerover', () => buyBtn.setScale(1.05));
        buyBtn.on('pointerout', () => buyBtn.setScale(1));
        buyMaxBtn.on('pointerover', () => buyMaxBtn.setScale(1.05));
        buyMaxBtn.on('pointerout', () => buyMaxBtn.setScale(1));

        container.add([
            glowBg, cardBg, iconCircle, iconText, checkIcon, lockIcon, tierLabelText,
            nameText, descText, levelText, priceText, progressBg, progressFill,
            percentText, buyBtn, buyMaxBtn
        ]);

        return {
            tier, container, glowBg, cardBg, iconCircle, iconText, checkIcon, lockIcon,
            tierLabelText, nameText, descText, levelText, priceText,
            progressBg, progressFill, percentText, buyBtn, buyMaxBtn,
            pulseTween: null, glowTween: null, lastState: null, height: 0
        };
    }

    getTierState(index) {
        const tierIdx = window.ResonatorState.getTierIndex();
        const maxed = window.ResonatorState.isMaxed();

        if (maxed) return 'completed';
        if (index < tierIdx) return 'completed';
        if (index === tierIdx) return 'current';
        return 'locked';
    }

    getStateHeight(state) {
        if (state === 'current') return 336;
        if (state === 'completed') return 118;
        return 84;
    }

    updateCards() {
        this.currencyText.setText(`💠 ${formatNumber(window.gameState.currency)}`);
        this.eraColor = window.ResonatorState.getEraColor();
        this.updateTitleGlow();

        let y = this.cardStartY;
        this.cards.forEach((card, index) => {
            const state = this.getTierState(index);
            const h = this.getStateHeight(state);
            const stateChanged = card.lastState !== state;

            card.height = h;
            this.layoutCardContent(card, state, index, h);

            if (!this.layoutReady) {
                card.container.setY(y);
            } else if (card.container.y !== y) {
                this.tweens.add({ targets: card.container, y, duration: 450, ease: 'Cubic.easeInOut' });
            }

            if (stateChanged && this.layoutReady) {
                card.container.setScale(0.97);
                this.tweens.add({ targets: card.container, scale: 1, duration: 280, ease: 'Back.easeOut' });
            }

            card.lastState = state;
            y += h + this.cardGap;
        });
    }

    layoutCardContent(card, state, index, h) {
        const w = this.cardWidth;
        const tier = card.tier;

        card.glowBg.setSize(w + 30, h + 30).setPosition(w / 2, h / 2);
        card.cardBg.setSize(w, h).setPosition(w / 2, h / 2);

        if (state === 'completed') {
            card.container.setAlpha(1);
            card.glowBg.setVisible(false);
            this.stopPulse(card);

            card.iconCircle.setPosition(46, h / 2).setRadius(30);
            card.iconText.setVisible(false);
            card.checkIcon.setPosition(46, h / 2).setVisible(true);
            card.lockIcon.setVisible(false);
            card.tierLabelText.setVisible(false);

            card.nameText.setPosition(92, 14).setFontSize(23).setColor('#ffffff');
            const totalBonus = tier.perLevelBonus * window.ResonatorState.levelsPerTier;
            card.descText.setPosition(92, 44).setFontSize(16).setColor(tier.colorHex)
                .setStyle({ wordWrap: { width: w - 108 } })
                .setText(t('upgrade_maxed_contribution', { n: formatNumber(totalBonus) }));

            card.levelText.setVisible(false);
            card.priceText.setVisible(false);

            card.progressBg.setPosition(92, h - 22).setSize(w - 108, 10);
            card.progressFill.setPosition(92, h - 22).setSize(w - 108, 10).setFillStyle(tier.color);
            card.percentText.setVisible(false);

            card.buyBtn.setVisible(false);
            card.buyMaxBtn.setVisible(false);
        } else if (state === 'current') {
            card.container.setAlpha(1);
            card.glowBg.setVisible(true);
            this.startPulse(card);

            card.iconCircle.setPosition(74, 96).setRadius(46);
            card.iconText.setPosition(74, 96).setFontSize('44px').setVisible(true);
            card.checkIcon.setVisible(false);
            card.lockIcon.setVisible(false);

            card.tierLabelText.setPosition(154, 18).setVisible(true);
            card.nameText.setPosition(154, 38).setFontSize(30).setColor('#ffffff');
            card.descText.setPosition(154, 78).setFontSize(19).setColor('#a8a8cc')
                .setStyle({ wordWrap: { width: w - 178 } })
                .setText(tier.description);

            const sub = window.ResonatorState.getSubLevel();
            const levelsPerTier = window.ResonatorState.levelsPerTier;
            const price = window.ResonatorState.getNextPrice();
            const canAfford = window.gameState.currency >= price;
            const fraction = sub / levelsPerTier;

            card.levelText.setVisible(true).setPosition(28, 156).setText(t('upgrade_level', { cur: sub, max: levelsPerTier }));
            card.priceText.setVisible(true).setPosition(28, 184).setText(t('upgrade_price', { price: formatNumber(price) }));

            const barWidth = w - 56;
            card.progressBg.setPosition(28, 224).setSize(barWidth, 20);
            card.progressFill.setPosition(28, 224).setSize(barWidth * fraction, 20).setFillStyle(tier.color);
            card.percentText.setVisible(true).setPosition(28 + barWidth / 2, 224).setText(`${Math.round(fraction * 100)}%`);

            card.buyBtn.setVisible(true).setPosition(w / 2 - 105, 274);
            card.buyMaxBtn.setVisible(true).setPosition(w / 2 + 110, 274);
            card.buyBtn.setStyle({
                color: canAfford ? '#0a0a12' : '#666677',
                backgroundColor: canAfford ? tier.colorHex : '#1a1a2e'
            });
        } else {
            card.container.setAlpha(0.5);
            card.glowBg.setVisible(false);
            this.stopPulse(card);

            card.iconCircle.setPosition(36, h / 2).setRadius(26);
            card.iconText.setVisible(false);
            card.checkIcon.setVisible(false);
            card.lockIcon.setPosition(36, h / 2 - 1).setFontSize(20).setVisible(true);
            card.tierLabelText.setVisible(false);

            card.nameText.setPosition(74, 18).setFontSize(21).setColor('#71718a');
            const prevTier = window.ResonatorState.tiers[index - 1];
            card.descText.setPosition(74, 44).setFontSize(16).setColor('#52526a')
                .setStyle({ wordWrap: { width: w - 90 } })
                .setText(prevTier ? t('upgrade_locked_after', { tier: prevTier.name }) : '');

            card.levelText.setVisible(false);
            card.priceText.setVisible(false);
            card.percentText.setVisible(false);
            card.progressBg.setPosition(74, h - 16).setSize(w - 90, 6);
            card.progressFill.setSize(0, 6);

            card.buyBtn.setVisible(false);
            card.buyMaxBtn.setVisible(false);
        }
    }

    startPulse(card) {
        if (this.fxEnabled && !card.cardGlowFX) {
            card.cardGlowFX = card.cardBg.postFX.addGlow(card.tier.color, 2, 0, false, 0.2, 10);
        }

        if (card.pulseTween) return;
        card.pulseTween = this.tweens.add({
            targets: card.cardBg,
            strokeAlpha: { from: 0.5, to: 1 },
            duration: 850,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        card.glowTween = this.tweens.add({
            targets: card.glowBg,
            fillAlpha: { from: 0.08, to: 0.28 },
            duration: 850,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    stopPulse(card) {
        if (card.pulseTween) { card.pulseTween.stop(); card.pulseTween = null; }
        if (card.glowTween) { card.glowTween.stop(); card.glowTween = null; }
        if (card.cardGlowFX) { card.cardBg.postFX.clear(); card.cardGlowFX = null; }
        card.cardBg.setStrokeStyle(2, card.tier.color, 0.6);
    }

    onBuy(index, buyBtn) {
        const beforeLevel = window.ResonatorState.level;
        const price = window.ResonatorState.getNextPrice();
        if (price === null || window.gameState.currency < price) return;

        if (!window.ResonatorState.buy()) return;

        saveGame();
        window.AudioState.playBuy();
        this.emitBurst(buyBtn.x + this.cardX, buyBtn.y + this.cards[index].container.y, 10, this.cards[index].tier.color);
        this.punchCard(index);
        this.checkTierTransition(beforeLevel);
        this.updateCards();
    }

    onBuyMax(index, buyMaxBtn) {
        const beforeLevel = window.ResonatorState.level;
        const bought = window.ResonatorState.buyMax();
        if (bought === 0) return;

        saveGame();
        window.AudioState.playBuy();
        this.emitBurst(buyMaxBtn.x + this.cardX, buyMaxBtn.y + this.cards[index].container.y, 16, this.cards[index].tier.color);
        this.punchCard(index);
        this.checkTierTransition(beforeLevel);
        this.updateCards();
    }

    punchCard(index) {
        const card = this.cards[index];
        if (card.lastState !== 'current') return;
        this.tweens.add({
            targets: card.progressFill,
            scaleY: { from: 1.4, to: 1 },
            duration: 220,
            ease: 'Back.easeOut'
        });
    }

    checkTierTransition(beforeLevel) {
        const levelsPerTier = window.ResonatorState.levelsPerTier;
        const beforeTier = Math.floor(beforeLevel / levelsPerTier);
        const afterTier = Math.floor(window.ResonatorState.level / levelsPerTier);

        if (afterTier > beforeTier) {
            const completedTier = window.ResonatorState.tiers[Math.min(beforeTier, window.ResonatorState.tiers.length - 1)];
            const nextTier = window.ResonatorState.tiers[afterTier] || null;
            const unlockedFrequency = window.FrequencyState.list.find(f => f.unlockLevel === afterTier * levelsPerTier);
            this.playTierFanfare(completedTier, nextTier, unlockedFrequency);
        }
    }

    emitBurst(x, y, count, color) {
        const emitter = this.add.particles(x, y, 'particle', {
            lifespan: 500,
            speed: { min: 60, max: 160 },
            scale: { start: 0.6, end: 0 },
            tint: color,
            blendMode: 'ADD',
            quantity: count,
            emitting: false
        });
        emitter.explode(count);
        this.time.delayedCall(600, () => emitter.destroy());
    }

    playTierFanfare(completedTier, nextTier, unlockedFrequency) {
        const { width, height } = this.scale;

        window.AudioState.playFanfare();

        const flash = this.add.rectangle(width / 2, height / 2, width, height, completedTier.color, 0.35);
        this.tweens.add({ targets: flash, alpha: 0, duration: 500, onComplete: () => flash.destroy() });

        const glowColorHex = (nextTier || completedTier).colorHex;

        this.cameras.main.shake(200, 0.005);
        this.emitBurst(width / 2, height / 2, 30, completedTier.color);
        this.time.delayedCall(150, () => this.emitBurst(width / 2, height / 2, 30, (nextTier || completedTier).color));

        const title = this.add.text(width / 2, height / 2 - 60,
            t('tier_complete_title', { tier: completedTier.name.toUpperCase() }), {
            fontFamily: 'Arial', fontSize: '30px', color: '#ffffff', fontStyle: 'bold',
            align: 'center', wordWrap: { width: width - 80 }
        }).setOrigin(0.5).setAlpha(0).setShadow(0, 0, glowColorHex, 20, true, true);

        const subtitle = nextTier
            ? this.add.text(width / 2, height / 2, t('tier_unlocked_next', { icon: nextTier.icon, tier: nextTier.name }), {
                fontFamily: 'Arial', fontSize: '22px', color: nextTier.colorHex, fontStyle: 'bold'
            }).setOrigin(0.5).setAlpha(0)
            : this.add.text(width / 2, height / 2, t('tier_fully_upgraded'), {
                fontFamily: 'Arial', fontSize: '22px', color: completedTier.colorHex, fontStyle: 'bold'
            }).setOrigin(0.5).setAlpha(0);

        const parts = [title, subtitle];

        let freqLine = null;
        if (unlockedFrequency) {
            freqLine = this.add.text(width / 2, height / 2 + 45,
                t('tier_new_frequency', { icon: unlockedFrequency.icon, name: unlockedFrequency.name, desc: unlockedFrequency.description }), {
                fontFamily: 'Arial', fontSize: '17px', color: unlockedFrequency.colorHex, fontStyle: 'bold',
                align: 'center', wordWrap: { width: width - 100 }
            }).setOrigin(0.5).setAlpha(0);
            parts.push(freqLine);
        }

        this.tweens.add({
            targets: parts,
            alpha: 1,
            scale: { from: 0.7, to: 1 },
            duration: 350,
            ease: 'Back.easeOut'
        });

        this.time.delayedCall(2600, () => {
            this.tweens.add({
                targets: parts,
                alpha: 0,
                duration: 400,
                onComplete: () => parts.forEach(p => p.destroy())
            });
        });
    }

    update() {
        this.currencyText.setText(`💠 ${formatNumber(window.gameState.currency)}`);

        const current = this.cards.find(c => c.lastState === 'current');
        if (current) {
            const price = window.ResonatorState.getNextPrice();
            const canAfford = price !== null && window.gameState.currency >= price;
            current.buyBtn.setStyle({
                color: canAfford ? '#0a0a12' : '#666677',
                backgroundColor: canAfford ? current.tier.colorHex : '#1a1a2e'
            });
        }
    }
}

class HelperScene extends Phaser.Scene {
    constructor() {
        super('HelperScene');
    }

    init(data) {
        this.fromScene = (data && data.from) || 'MainMenuScene';
    }

    create() {
        const { width } = this.scale;
        this.eraColor = window.ResonatorState.getEraColor();
        this.fxEnabled = this.game.renderer.type === Phaser.WEBGL;

        this.cardW = 320;
        this.cardH = 380;
        this.gridStartX = (width - (this.cardW * 2 + 20)) / 2;
        this.gridStartY = 150;

        this.ensureParticleTexture();
        this.ensureStarTexture();
        this.cameras.main.setBackgroundColor(blendColors(0x0a0a12, this.eraColor, 0.16));
        this.createEraGlow();
        this.createAmbientParticles();
        this.createTwinkleStars();
        this.createHeader();

        this.cards = window.HelperState.types.map((type, index) => this.createHelperCard(type, index));

        this.summaryText = this.add.text(width / 2, this.gridStartY + this.cardH * 2 + 40, '', {
            fontFamily: 'Arial', fontSize: '22px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.updateCards();

        // Доход продолжает капать, пока мы на этом экране — сессия активна
        // везде, кроме главного меню
        this.incomeTimer = this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                const result = tickPassiveEconomy();
                if (result.helperIncome > 0 || result.autoClickIncome !== null) {
                    this.updateCards();
                }
            }
        });
    }

    ensureParticleTexture() {
        if (this.textures.exists('particle')) return;
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(0xffffff, 1);
        gfx.fillCircle(4, 4, 4);
        gfx.generateTexture('particle', 8, 8);
        gfx.destroy();
    }

    ensureStarTexture() {
        if (this.textures.exists('star')) return;
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(0xffffff, 1);
        gfx.beginPath();
        gfx.moveTo(8, 0);
        gfx.lineTo(10, 6);
        gfx.lineTo(16, 8);
        gfx.lineTo(10, 10);
        gfx.lineTo(8, 16);
        gfx.lineTo(6, 10);
        gfx.lineTo(0, 8);
        gfx.lineTo(6, 6);
        gfx.closePath();
        gfx.fillPath();
        gfx.generateTexture('star', 16, 16);
        gfx.destroy();
    }

    createEraGlow() {
        const { width, height } = this.scale;
        this.eraGlowOverlay = this.add.rectangle(width / 2, height / 2, width, height, this.eraColor, 0.06)
            .setBlendMode(Phaser.BlendModes.ADD);

        ensureGlowTexture(this);
        this.auraBlobs = [
            this.add.image(width * 0.1, height * 0.08, 'glowRadial').setScale(2.6),
            this.add.image(width * 0.95, height * 1.02, 'glowRadial').setScale(3)
        ].map(img => img.setTint(this.eraColor).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD));
    }

    createAmbientParticles() {
        const { width, height } = this.scale;
        this.add.particles(0, 0, 'particle', {
            x: { min: 0, max: width },
            y: { min: 0, max: height },
            lifespan: 6000,
            speedY: { min: -15, max: -5 },
            scale: { start: 0.2, end: 0 },
            alpha: { start: 0.25, end: 0 },
            tint: 0x00eaff,
            quantity: 1,
            frequency: 300,
            blendMode: 'ADD'
        });
    }

    createTwinkleStars() {
        const { width, height } = this.scale;

        for (let i = 0; i < 14; i++) {
            const x = Phaser.Math.Between(20, width - 20);
            const y = Phaser.Math.Between(20, height - 20);

            const star = this.add.image(x, y, 'star')
                .setScale(Phaser.Math.FloatBetween(0.5, 1.2))
                .setAlpha(0.12)
                .setBlendMode(Phaser.BlendModes.ADD);

            this.tweens.add({
                targets: star,
                alpha: { from: 0.08, to: Phaser.Math.FloatBetween(0.3, 0.6) },
                duration: Phaser.Math.Between(1300, 3000),
                delay: Phaser.Math.Between(0, 2000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    createHeader() {
        const { width } = this.scale;

        this.currencyText = this.add.text(20, 20, '', {
            fontFamily: 'Arial', fontSize: '26px', color: '#ffffff'
        });

        createNeonButton(this, width - 20 - 80, 44, {
            width: 160, height: 48, icon: '←', label: t('nav_back'),
            fontSize: 19, iconFontSize: 20,
            accentColor: 0x8fa0c4,
            onClick: () => this.scene.start(this.fromScene)
        });

        const title = this.add.text(width / 2, 75, t('helpers_title'), {
            fontFamily: 'Arial', fontSize: '36px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setShadow(0, 0, intToCss(this.eraColor), 15, true, true);

        if (this.fxEnabled) {
            title.postFX.addGlow(this.eraColor, 2, 0, false, 0.15, 14);
        }
    }

    createHelperCard(type, index) {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = this.gridStartX + col * (this.cardW + 20);
        const y = this.gridStartY + row * (this.cardH + 20);

        const container = this.add.container(x, y);
        const w = this.cardW;
        const h = this.cardH;

        const cardBg = this.add.rectangle(w / 2, h / 2, w, h, 0x141428)
            .setStrokeStyle(2, type.color, 0.7);

        if (this.fxEnabled) {
            cardBg.postFX.addGlow(type.color, 1.5, 0, false, 0.2, 8);
        }

        const iconCircle = this.add.circle(60, 66, 40, type.color, 0.22).setStrokeStyle(2, type.color);
        const iconText = this.add.text(60, 66, type.icon, { fontSize: '38px' }).setOrigin(0.5);

        const nameText = this.add.text(w / 2, 128, type.name, {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);

        const contributionText = this.add.text(w / 2, 160, '', {
            fontFamily: 'Arial', fontSize: '17px', color: type.colorHex
        }).setOrigin(0.5);

        const levelText = this.add.text(24, 196, '', {
            fontFamily: 'Arial', fontSize: '18px', color: '#cccccc'
        });
        const priceText = this.add.text(24, 222, '', {
            fontFamily: 'Arial', fontSize: '20px', color: '#ffdd55', fontStyle: 'bold'
        });

        const barWidth = w - 48;
        const progressBg = this.add.rectangle(24, 258, barWidth, 14, 0x2a2a3e).setOrigin(0, 0.5);
        const progressFill = this.add.rectangle(24, 258, 0, 14, type.color).setOrigin(0, 0.5);

        const buyBtn = this.add.text(w / 2, 302, t('upgrade_buy'), {
            fontFamily: 'Arial', fontSize: '20px', color: '#0a0a12',
            backgroundColor: type.colorHex, padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const buyMaxBtn = this.add.text(w / 2, 346, t('upgrade_buy_max'), {
            fontFamily: 'Arial', fontSize: '17px', color: '#ffffff',
            backgroundColor: '#2a2a3e', padding: { x: 14, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        buyBtn.on('pointerover', () => buyBtn.setScale(1.05));
        buyBtn.on('pointerout', () => buyBtn.setScale(1));
        buyBtn.on('pointerdown', () => this.onBuy(index));
        buyMaxBtn.on('pointerover', () => buyMaxBtn.setScale(1.05));
        buyMaxBtn.on('pointerout', () => buyMaxBtn.setScale(1));
        buyMaxBtn.on('pointerdown', () => this.onBuyMax(index));

        container.add([
            cardBg, iconCircle, iconText, nameText, contributionText,
            levelText, priceText, progressBg, progressFill, buyBtn, buyMaxBtn
        ]);

        return { type, container, nameText, contributionText, levelText, priceText, progressFill, buyBtn, buyMaxBtn };
    }

    updateCards() {
        this.currencyText.setText(`💠 ${formatNumber(window.gameState.currency)}`);
        const totalPerSec = window.HelperState.getTotalIncomePerSec() + window.FrequencyState.getPassiveIncome();
        this.summaryText.setText(t('helpers_total', { n: formatNumber(totalPerSec) }));

        this.cards.forEach((card, index) => {
            const level = window.HelperState.levels[index];
            const maxed = window.HelperState.isMaxed(index);
            const income = window.HelperState.getHelperIncome(index);

            card.contributionText.setText(t('helpers_income_suffix', { n: formatNumber(income) }));
            card.levelText.setText(t('upgrade_level', { cur: level, max: window.HelperState.maxLevel }));
            card.progressFill.width = (this.cardW - 48) * (level / window.HelperState.maxLevel);

            if (maxed) {
                card.priceText.setText(t('helpers_maxed'));
                card.buyBtn.setVisible(false);
                card.buyMaxBtn.setVisible(false);
            } else {
                const price = window.HelperState.getNextPrice(index);
                const canAfford = window.gameState.currency >= price;

                card.priceText.setText(t('upgrade_price', { price: formatNumber(price) }));
                card.buyBtn.setVisible(true);
                card.buyMaxBtn.setVisible(true);
                card.buyBtn.setAlpha(canAfford ? 1 : 0.5);
            }
        });
    }

    onBuy(index) {
        if (!window.HelperState.buy(index)) return;
        saveGame();
        window.AudioState.playBuy();
        this.punchCard(index);
        this.updateCards();
    }

    onBuyMax(index) {
        const bought = window.HelperState.buyMax(index);
        if (bought === 0) return;
        saveGame();
        window.AudioState.playBuy();
        this.punchCard(index);
        this.updateCards();
    }

    punchCard(index) {
        const card = this.cards[index];
        this.tweens.add({
            targets: card.container,
            scale: { from: 0.97, to: 1 },
            duration: 220,
            ease: 'Back.easeOut'
        });

        const type = card.type;
        const worldX = card.container.x + this.cardW / 2;
        const worldY = card.container.y + 66;
        const emitter = this.add.particles(worldX, worldY, 'particle', {
            lifespan: 450,
            speed: { min: 50, max: 130 },
            scale: { start: 0.6, end: 0 },
            tint: type.color,
            blendMode: 'ADD',
            quantity: 8,
            emitting: false
        });
        emitter.explode(8);
        this.time.delayedCall(550, () => emitter.destroy());
    }

    update() {
        this.currencyText.setText(`💠 ${formatNumber(window.gameState.currency)}`);
        this.cards.forEach((card, index) => {
            if (window.HelperState.isMaxed(index)) return;
            const price = window.HelperState.getNextPrice(index);
            const canAfford = window.gameState.currency >= price;
            card.buyBtn.setAlpha(canAfford ? 1 : 0.5);
        });
    }
}

class FrequencyScene extends Phaser.Scene {
    constructor() {
        super('FrequencyScene');
    }

    init(data) {
        this.fromScene = (data && data.from) || 'MainMenuScene';
    }

    create() {
        const { width } = this.scale;
        this.eraColor = window.ResonatorState.getEraColor();
        this.fxEnabled = this.game.renderer.type === Phaser.WEBGL;

        this.cardX = 30;
        this.cardWidth = width - 60;
        this.cardHeight = 150;
        this.cardGap = 16;
        this.cardStartY = 130;

        this.ensureParticleTexture();
        this.ensureStarTexture();
        this.cameras.main.setBackgroundColor(blendColors(0x0a0a12, this.eraColor, 0.16));
        this.createEraGlow();
        this.createAmbientParticles();
        this.createTwinkleStars();
        this.createHeader();

        this.cards = window.FrequencyState.list.map((freq, index) => this.createFrequencyCard(freq, index));
        this.updateCards();

        // Доход продолжает капать, пока мы на этом экране — сессия активна
        // везде, кроме главного меню
        this.incomeTimer = this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                const result = tickPassiveEconomy();
                if (result.helperIncome > 0 || result.autoClickIncome !== null) {
                    this.currencyText.setText(`💠 ${formatNumber(window.gameState.currency)}`);
                }
            }
        });
    }

    ensureParticleTexture() {
        if (this.textures.exists('particle')) return;
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(0xffffff, 1);
        gfx.fillCircle(4, 4, 4);
        gfx.generateTexture('particle', 8, 8);
        gfx.destroy();
    }

    ensureStarTexture() {
        if (this.textures.exists('star')) return;
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(0xffffff, 1);
        gfx.beginPath();
        gfx.moveTo(8, 0);
        gfx.lineTo(10, 6);
        gfx.lineTo(16, 8);
        gfx.lineTo(10, 10);
        gfx.lineTo(8, 16);
        gfx.lineTo(6, 10);
        gfx.lineTo(0, 8);
        gfx.lineTo(6, 6);
        gfx.closePath();
        gfx.fillPath();
        gfx.generateTexture('star', 16, 16);
        gfx.destroy();
    }

    createEraGlow() {
        const { width, height } = this.scale;
        this.eraGlowOverlay = this.add.rectangle(width / 2, height / 2, width, height, this.eraColor, 0.06)
            .setBlendMode(Phaser.BlendModes.ADD);

        ensureGlowTexture(this);
        this.auraBlobs = [
            this.add.image(width * 0.1, height * 0.08, 'glowRadial').setScale(2.6),
            this.add.image(width * 0.95, height * 1.02, 'glowRadial').setScale(3)
        ].map(img => img.setTint(this.eraColor).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD));
    }

    createAmbientParticles() {
        const { width, height } = this.scale;
        this.add.particles(0, 0, 'particle', {
            x: { min: 0, max: width },
            y: { min: 0, max: height },
            lifespan: 6000,
            speedY: { min: -15, max: -5 },
            scale: { start: 0.2, end: 0 },
            alpha: { start: 0.25, end: 0 },
            tint: 0x00eaff,
            quantity: 1,
            frequency: 300,
            blendMode: 'ADD'
        });
    }

    createTwinkleStars() {
        const { width, height } = this.scale;

        for (let i = 0; i < 14; i++) {
            const x = Phaser.Math.Between(20, width - 20);
            const y = Phaser.Math.Between(20, height - 20);

            const star = this.add.image(x, y, 'star')
                .setScale(Phaser.Math.FloatBetween(0.5, 1.2))
                .setAlpha(0.12)
                .setBlendMode(Phaser.BlendModes.ADD);

            this.tweens.add({
                targets: star,
                alpha: { from: 0.08, to: Phaser.Math.FloatBetween(0.3, 0.6) },
                duration: Phaser.Math.Between(1300, 3000),
                delay: Phaser.Math.Between(0, 2000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    createHeader() {
        const { width } = this.scale;

        this.currencyText = this.add.text(20, 20, '', {
            fontFamily: 'Arial', fontSize: '26px', color: '#ffffff'
        });

        createNeonButton(this, width - 20 - 80, 44, {
            width: 160, height: 48, icon: '←', label: t('nav_back'),
            fontSize: 19, iconFontSize: 20,
            accentColor: 0x8fa0c4,
            onClick: () => this.scene.start(this.fromScene)
        });

        this.titleText = this.add.text(width / 2, 75, t('freq_title'), {
            fontFamily: 'Arial', fontSize: '36px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setShadow(0, 0, intToCss(this.eraColor), 15, true, true);

        if (this.fxEnabled) {
            this.titleText.postFX.addGlow(this.eraColor, 2, 0, false, 0.15, 14);
        }
    }

    createFrequencyCard(freq, index) {
        const y = this.cardStartY + index * (this.cardHeight + this.cardGap);
        const w = this.cardWidth;
        const h = this.cardHeight;
        const container = this.add.container(this.cardX, y);

        const cardBg = this.add.rectangle(w / 2, h / 2, w, h, 0x141428)
            .setStrokeStyle(2, freq.color, 0.6);

        const iconCircle = this.add.circle(66, 75, 44, freq.color, 0.2).setStrokeStyle(2, freq.color);
        const iconText = this.add.text(66, 75, freq.icon, { fontSize: '40px' }).setOrigin(0.5);
        const lockIcon = this.add.text(66, 74, '🔒', { fontSize: '28px' }).setOrigin(0.5).setVisible(false);

        const nameText = this.add.text(128, 18, freq.name, {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
        });
        const descText = this.add.text(128, 50, freq.description, {
            fontFamily: 'Arial', fontSize: '17px', color: '#9a9ac0',
            wordWrap: { width: w - 144 }
        });

        const statusText = this.add.text(128, h - 44, '', {
            fontFamily: 'Arial', fontSize: '17px', color: '#8888aa', fontStyle: 'bold'
        });

        const progressBg = this.add.rectangle(128, h - 14, w - 158, 8, 0x2a2a3e).setOrigin(0, 0.5);
        const progressFill = this.add.rectangle(128, h - 14, 0, 8, freq.color).setOrigin(0, 0.5);

        container.add([cardBg, iconCircle, iconText, lockIcon, nameText, descText, statusText, progressBg, progressFill]);

        return { freq, container, cardBg, iconCircle, iconText, lockIcon, nameText, statusText, progressFill, glowFX: null };
    }

    updateCards() {
        this.currencyText.setText(`💠 ${formatNumber(window.gameState.currency)}`);
        const level = window.ResonatorState.level;

        this.cards.forEach(card => {
            const index = window.FrequencyState.list.indexOf(card.freq);
            const unlocked = window.FrequencyState.isEffectivelyUnlocked(index);
            const permanent = window.FrequencyState.isPermanentlyUnlocked(index);
            const barWidth = this.cardWidth - 158;

            if (unlocked) {
                card.container.setAlpha(1);
                card.iconText.setVisible(true);
                card.lockIcon.setVisible(false);
                card.nameText.setColor('#ffffff');
                card.statusText.setColor(card.freq.colorHex)
                    .setText(permanent ? t('freq_active_forever') : t('freq_active'));
                card.progressFill.width = barWidth;
                card.cardBg.setStrokeStyle(2, card.freq.color, 1);

                if (this.fxEnabled && !card.glowFX) {
                    card.glowFX = card.cardBg.postFX.addGlow(card.freq.color, 2, 0, false, 0.2, 10);
                }
            } else {
                card.container.setAlpha(0.55);
                card.iconText.setVisible(false);
                card.lockIcon.setVisible(true);
                card.nameText.setColor('#888899');
                card.statusText.setColor('#8888aa').setText(t('freq_locked_progress', { cur: level, max: card.freq.unlockLevel }));
                card.progressFill.width = barWidth * Math.min(1, level / card.freq.unlockLevel);
                card.cardBg.setStrokeStyle(2, card.freq.color, 0.4);
            }
        });
    }

    update() {
        this.currencyText.setText(`💠 ${formatNumber(window.gameState.currency)}`);
    }
}

class PrestigeScene extends Phaser.Scene {
    constructor() {
        super('PrestigeScene');
    }

    init(data) {
        this.fromScene = (data && data.from) || 'MainMenuScene';
    }

    create() {
        const { width } = this.scale;
        this.eraColor = window.ResonatorState.getEraColor();
        this.fxEnabled = this.game.renderer.type === Phaser.WEBGL;

        this.ensureParticleTexture();
        this.ensureStarTexture();
        this.cameras.main.setBackgroundColor(blendColors(0x0a0a12, this.eraColor, 0.16));
        this.createEraGlow();
        this.createAmbientParticles();
        this.createTwinkleStars();
        this.createHeader();
        this.createActionPanel();
        this.createPerkShop();

        // Доход продолжает капать, пока мы на этом экране — сессия активна
        // везде, кроме главного меню
        this.incomeTimer = this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                const result = tickPassiveEconomy();
                if (result.helperIncome > 0 || result.autoClickIncome !== null) {
                    this.currencyText.setText(`💠 ${formatNumber(window.gameState.currency)}`);
                }
            }
        });
    }

    ensureParticleTexture() {
        if (this.textures.exists('particle')) return;
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(0xffffff, 1);
        gfx.fillCircle(4, 4, 4);
        gfx.generateTexture('particle', 8, 8);
        gfx.destroy();
    }

    ensureStarTexture() {
        if (this.textures.exists('star')) return;
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(0xffffff, 1);
        gfx.beginPath();
        gfx.moveTo(8, 0);
        gfx.lineTo(10, 6);
        gfx.lineTo(16, 8);
        gfx.lineTo(10, 10);
        gfx.lineTo(8, 16);
        gfx.lineTo(6, 10);
        gfx.lineTo(0, 8);
        gfx.lineTo(6, 6);
        gfx.closePath();
        gfx.fillPath();
        gfx.generateTexture('star', 16, 16);
        gfx.destroy();
    }

    createEraGlow() {
        const { width, height } = this.scale;
        this.eraGlowOverlay = this.add.rectangle(width / 2, height / 2, width, height, this.eraColor, 0.06)
            .setBlendMode(Phaser.BlendModes.ADD);

        ensureGlowTexture(this);
        this.auraBlobs = [
            this.add.image(width * 0.1, height * 0.08, 'glowRadial').setScale(2.6),
            this.add.image(width * 0.95, height * 1.02, 'glowRadial').setScale(3)
        ].map(img => img.setTint(0xc9a8ff).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD));
    }

    createAmbientParticles() {
        const { width, height } = this.scale;
        this.add.particles(0, 0, 'particle', {
            x: { min: 0, max: width },
            y: { min: 0, max: height },
            lifespan: 6000,
            speedY: { min: -15, max: -5 },
            scale: { start: 0.2, end: 0 },
            alpha: { start: 0.25, end: 0 },
            tint: 0xc9a8ff,
            quantity: 1,
            frequency: 300,
            blendMode: 'ADD'
        });
    }

    createTwinkleStars() {
        const { width, height } = this.scale;

        for (let i = 0; i < 14; i++) {
            const x = Phaser.Math.Between(20, width - 20);
            const y = Phaser.Math.Between(20, height - 20);

            const star = this.add.image(x, y, 'star')
                .setScale(Phaser.Math.FloatBetween(0.5, 1.2))
                .setAlpha(0.12)
                .setBlendMode(Phaser.BlendModes.ADD);

            this.tweens.add({
                targets: star,
                alpha: { from: 0.08, to: Phaser.Math.FloatBetween(0.3, 0.6) },
                duration: Phaser.Math.Between(1300, 3000),
                delay: Phaser.Math.Between(0, 2000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    createHeader() {
        const { width } = this.scale;

        this.currencyText = this.add.text(20, 20, `💠 ${formatNumber(window.gameState.currency)}`, {
            fontFamily: 'Arial', fontSize: '22px', color: '#ffffff'
        });
        this.shardHeaderText = this.add.text(20, 50, '', {
            fontFamily: 'Arial', fontSize: '18px', color: '#c9a8ff'
        });

        createNeonButton(this, width - 20 - 80, 44, {
            width: 160, height: 48, icon: '←', label: t('nav_back'),
            fontSize: 19, iconFontSize: 20,
            accentColor: 0x8fa0c4,
            onClick: () => this.scene.start(this.fromScene)
        });

        const title = this.add.text(width / 2, 75, t('prestige_title'), {
            fontFamily: 'Arial', fontSize: '36px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setShadow(0, 0, '#c9a8ff', 15, true, true);

        if (this.fxEnabled) {
            title.postFX.addGlow(0xc9a8ff, 2, 0, false, 0.15, 14);
        }
    }

    createActionPanel() {
        const { width } = this.scale;
        const x = 30, y = 130, w = width - 60, h = 260;

        const panel = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x141428).setStrokeStyle(2, 0xc9a8ff, 0.7);
        if (this.fxEnabled) panel.postFX.addGlow(0xc9a8ff, 2, 0, false, 0.2, 10);

        const gain = window.PrestigeState.getShardsOnPrestige();

        if (window.PrestigeState.canPrestige() && gain > 0) {
            this.add.text(x + w / 2, y + 28, t('prestige_ready_title'), {
                fontFamily: 'Arial', fontSize: '22px', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0.5);

            this.add.text(x + w / 2, y + 78, `+${formatNumber(gain)} ✨`, {
                fontFamily: 'Arial', fontSize: '44px', color: '#c9a8ff', fontStyle: 'bold'
            }).setOrigin(0.5);

            this.add.text(x + w / 2, y + 118, t('prestige_shards_label'), {
                fontFamily: 'Arial', fontSize: '18px', color: '#8888aa'
            }).setOrigin(0.5);

            this.add.text(x + w / 2, y + 150,
                t('prestige_ready_desc'), {
                fontFamily: 'Arial', fontSize: '15px', color: '#8a8aa5', align: 'center',
                wordWrap: { width: w - 60 }
            }).setOrigin(0.5, 0);

            this.resetBtn = createNeonButton(this, x + w / 2, y + h - 30, {
                width: w - 60, height: 52, icon: '♻️', label: t('prestige_reset_button'),
                fontSize: 18, accentColor: 0xc9a8ff,
                onClick: () => this.showConfirm(gain)
            });

            this.tweens.add({
                targets: this.resetBtn.visuals, scale: { from: 1, to: 1.03 },
                duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
        } else if (window.PrestigeState.canPrestige()) {
            // Уровень резонатора уже достаточен, но заработано меньше 1 млн —
            // перезагружаться пока не имеет смысла, осколков не будет
            const earned = window.gameState.totalEarned;

            this.add.text(x + w / 2, y + 40, '⏳', { fontSize: '44px' }).setOrigin(0.5);
            this.add.text(x + w / 2, y + 96, t('prestige_not_ready_title'), {
                fontFamily: 'Arial', fontSize: '20px', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0.5);
            this.add.text(x + w / 2, y + 128,
                t('prestige_not_ready_desc'), {
                fontFamily: 'Arial', fontSize: '15px', color: '#8a8aa5', align: 'center',
                wordWrap: { width: w - 60 }
            }).setOrigin(0.5, 0);
            this.add.text(x + w / 2, y + 190, t('prestige_earned_label', { n: formatNumber(earned) }), {
                fontFamily: 'Arial', fontSize: '16px', color: '#8888aa'
            }).setOrigin(0.5);

            const barW = w - 80;
            this.add.rectangle(x + 40, y + 220, barW, 12, 0x2a2a3e).setOrigin(0, 0.5);
            this.add.rectangle(x + 40, y + 220, barW * Math.min(1, earned / 1000000), 12, 0xc9a8ff).setOrigin(0, 0.5);
        } else {
            const level = window.ResonatorState.level;
            const threshold = 60;

            this.add.text(x + w / 2, y + 40, '🔒', { fontSize: '48px' }).setOrigin(0.5);
            this.add.text(x + w / 2, y + 100, t('prestige_locked_title'), {
                fontFamily: 'Arial', fontSize: '20px', color: '#ffffff', fontStyle: 'bold', align: 'center',
                wordWrap: { width: w - 60 }
            }).setOrigin(0.5);
            this.add.text(x + w / 2, y + 140, t('prestige_locked_progress', { cur: level, max: threshold }), {
                fontFamily: 'Arial', fontSize: '18px', color: '#8888aa'
            }).setOrigin(0.5);

            const barW = w - 80;
            this.add.rectangle(x + 40, y + 180, barW, 12, 0x2a2a3e).setOrigin(0, 0.5);
            this.add.rectangle(x + 40, y + 180, barW * Math.min(1, level / threshold), 12, 0xc9a8ff).setOrigin(0, 0.5);
        }
    }

    showConfirm(gain) {
        const { width, height } = this.scale;

        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
            .setInteractive();
        const box = this.add.rectangle(width / 2, height / 2, width - 100, 260, 0x141428)
            .setStrokeStyle(2, 0xc9a8ff, 1);

        const text = this.add.text(width / 2, height / 2 - 70, t('prestige_confirm_text', { n: formatNumber(gain) }), {
            fontFamily: 'Arial', fontSize: '20px', color: '#ffffff', fontStyle: 'bold', align: 'center'
        }).setOrigin(0.5);

        const group = [overlay, box, text];

        const yesBtn = createNeonButton(this, width / 2 - 90, height / 2 + 50, {
            width: 150, height: 52, icon: '✓', label: t('prestige_yes'), accentColor: 0xc9a8ff,
            onClick: () => {
                group.forEach(o => o.destroy());
                yesBtn.visuals.destroy(); yesBtn.destroy();
                noBtn.visuals.destroy(); noBtn.destroy();
                this.doPrestige();
            }
        });
        const noBtn = createNeonButton(this, width / 2 + 90, height / 2 + 50, {
            width: 150, height: 52, icon: '✕', label: t('prestige_no'), accentColor: 0x8fa0c4,
            onClick: () => {
                group.forEach(o => o.destroy());
                yesBtn.visuals.destroy(); yesBtn.destroy();
                noBtn.visuals.destroy(); noBtn.destroy();
            }
        });
    }

    doPrestige() {
        const gain = window.PrestigeState.prestige();
        if (!gain) return;

        window.AudioState.playPrestige();

        const { width, height } = this.scale;
        const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xc9a8ff, 0.5);
        this.tweens.add({ targets: flash, alpha: 0, duration: 600, onComplete: () => flash.destroy() });
        this.cameras.main.shake(300, 0.006);

        for (let i = 0; i < 3; i++) {
            this.time.delayedCall(i * 200, () => {
                const emitter = this.add.particles(width / 2, height / 2, 'particle', {
                    lifespan: 700, speed: { min: 100, max: 260 }, scale: { start: 0.8, end: 0 },
                    tint: 0xc9a8ff, blendMode: 'ADD', quantity: 40, emitting: false
                });
                emitter.explode(40);
                this.time.delayedCall(800, () => emitter.destroy());
            });
        }

        const title = this.add.text(width / 2, height / 2, t('prestige_fanfare', { n: formatNumber(gain) }), {
            fontFamily: 'Arial', fontSize: '40px', color: '#ffffff', fontStyle: 'bold', align: 'center'
        }).setOrigin(0.5).setAlpha(0).setShadow(0, 0, '#c9a8ff', 25, true, true);

        this.tweens.add({ targets: title, alpha: 1, scale: { from: 0.6, to: 1 }, duration: 400, ease: 'Back.easeOut' });

        this.time.delayedCall(2200, () => this.scene.restart());
    }

    createPerkShop() {
        const { width } = this.scale;
        const startY = 434;
        const cardH = 130;
        const gap = 16;

        this.add.text(width / 2, startY - 24, t('prestige_perks_title'), {
            fontFamily: 'Arial', fontSize: '18px', color: '#8888aa', fontStyle: 'bold'
        }).setOrigin(0.5);

        const perks = [
            {
                icon: '📜', name: t('perk_legacy_name'), color: 0xffd700, colorHex: '#ffd700',
                desc: () => t('perk_legacy_desc', { n: window.PrestigeState.legacyLevel * 10 }),
                price: () => window.PrestigeState.getLegacyPrice(),
                level: () => window.PrestigeState.legacyLevel,
                oneTime: false,
                buy: () => window.PrestigeState.buyLegacy()
            },
            {
                icon: '🔱', name: t('perk_seal_name'), color: 0x6fd6ff, colorHex: '#6fd6ff',
                desc: () => t('perk_seal_desc', { n: window.PrestigeState.sealLevel * 5 }),
                price: () => window.PrestigeState.getSealPrice(),
                level: () => window.PrestigeState.sealLevel,
                oneTime: false,
                buy: () => window.PrestigeState.buySeal()
            },
            {
                icon: '🧠', name: t('perk_memory_name'), color: 0xff6bd6, colorHex: '#ff6bd6',
                desc: () => t('perk_memory_desc'),
                price: () => window.PrestigeState.getMemoryPrice(),
                level: () => window.PrestigeState.memoryUnlocked ? 1 : 0,
                oneTime: true,
                buy: () => window.PrestigeState.buyMemory()
            }
        ];

        this.perkCards = perks.map((perk, i) => this.createPerkCard(perk, startY + i * (cardH + gap), cardH));
        this.refreshPerkCards();
    }

    createPerkCard(perk, y, h) {
        const w = this.scale.width - 60;
        const container = this.add.container(30, y);

        const cardBg = this.add.rectangle(w / 2, h / 2, w, h, 0x141428).setStrokeStyle(2, perk.color, 0.6);
        const iconCircle = this.add.circle(56, h / 2, 36, perk.color, 0.2).setStrokeStyle(2, perk.color);
        const iconText = this.add.text(56, h / 2, perk.icon, { fontSize: '30px' }).setOrigin(0.5);

        const nameText = this.add.text(104, 16, perk.name, {
            fontFamily: 'Arial', fontSize: '22px', color: '#ffffff', fontStyle: 'bold'
        });
        const descText = this.add.text(104, 46, '', {
            fontFamily: 'Arial', fontSize: '16px', color: '#9a9ac0', wordWrap: { width: w - 250 }
        });

        const buyBtn = this.add.text(w - 90, h / 2, '', {
            fontFamily: 'Arial', fontSize: '18px', color: '#0a0a12',
            backgroundColor: perk.colorHex, padding: { x: 16, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        buyBtn.on('pointerdown', () => {
            if (!perk.buy()) return;
            this.refreshPerkCards();
        });

        container.add([cardBg, iconCircle, iconText, nameText, descText, buyBtn]);
        return { perk, cardBg, descText, buyBtn };
    }

    refreshPerkCards() {
        this.currencyText.setText(`💠 ${formatNumber(window.gameState.currency)}`);
        this.shardHeaderText.setText(`✨ ${formatNumber(window.PrestigeState.shards)}`);

        this.perkCards.forEach(card => {
            const perk = card.perk;
            card.descText.setText(perk.desc());

            if (perk.oneTime && perk.level() > 0) {
                card.buyBtn.setText(t('perk_bought')).setStyle({ backgroundColor: '#2a2a3e', color: '#8888aa' });
                card.buyBtn.disableInteractive();
            } else {
                const price = perk.price();
                const canAfford = window.PrestigeState.shards >= price;
                card.buyBtn.setText(`✨ ${formatNumber(price)}`);
                card.buyBtn.setAlpha(canAfford ? 1 : 0.5);
            }
        });
    }

    update() {
        this.currencyText.setText(`💠 ${formatNumber(window.gameState.currency)}`);
    }
}

class SettingsScene extends Phaser.Scene {
    constructor() {
        super('SettingsScene');
    }

    init(data) {
        this.fromScene = (data && data.from) || 'MainMenuScene';
    }

    create() {
        this.eraColor = window.ResonatorState.getEraColor();
        this.fxEnabled = this.game.renderer.type === Phaser.WEBGL;

        this.ensureParticleTexture();
        this.ensureStarTexture();
        this.cameras.main.setBackgroundColor(blendColors(0x0a0a12, this.eraColor, 0.16));
        this.createEraGlow();
        this.createAmbientParticles();
        this.createTwinkleStars();

        // Фон (звёзды/частицы/свечение) создаётся один раз. Контент ниже
        // пересобирается при смене языка/звука через buildContent(), а не
        // scene.restart() — иначе звёзды на фоне прыгали бы на новые
        // случайные позиции при каждом переключении настройки
        this.contentObjects = [];
        this.buildContent();
    }

    track(obj) {
        this.contentObjects.push(obj);
        return obj;
    }

    trackButton(zone) {
        this.contentObjects.push(zone, zone.visuals);
        return zone;
    }

    buildContent() {
        this.contentObjects.forEach(obj => obj.destroy());
        this.contentObjects = [];

        const { width } = this.scale;

        this.createHeader();
        this.createLanguageCard();
        this.createSoundCard(400, '🔊', 'settings_sfx_label', 'settings_sfx_hint',
            () => window.AudioState.soundEnabled,
            (on) => window.AudioState.setSoundEnabled(on));
        this.createSoundCard(650, '🎵', 'settings_music_label', 'settings_music_hint',
            () => window.AudioState.musicEnabled,
            (on) => window.AudioState.setMusicEnabled(on));

        this.track(this.add.text(width / 2, 1230, t('settings_footer'), {
            fontFamily: 'Arial', fontSize: '14px', color: '#555566'
        }).setOrigin(0.5));
    }

    ensureParticleTexture() {
        if (this.textures.exists('particle')) return;
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(0xffffff, 1);
        gfx.fillCircle(4, 4, 4);
        gfx.generateTexture('particle', 8, 8);
        gfx.destroy();
    }

    ensureStarTexture() {
        if (this.textures.exists('star')) return;
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(0xffffff, 1);
        gfx.beginPath();
        gfx.moveTo(8, 0);
        gfx.lineTo(10, 6);
        gfx.lineTo(16, 8);
        gfx.lineTo(10, 10);
        gfx.lineTo(8, 16);
        gfx.lineTo(6, 10);
        gfx.lineTo(0, 8);
        gfx.lineTo(6, 6);
        gfx.closePath();
        gfx.fillPath();
        gfx.generateTexture('star', 16, 16);
        gfx.destroy();
    }

    createEraGlow() {
        const { width, height } = this.scale;
        this.eraGlowOverlay = this.add.rectangle(width / 2, height / 2, width, height, this.eraColor, 0.06)
            .setBlendMode(Phaser.BlendModes.ADD);

        ensureGlowTexture(this);
        [
            this.add.image(width * 0.1, height * 0.08, 'glowRadial').setScale(2.6),
            this.add.image(width * 0.95, height * 1.02, 'glowRadial').setScale(3)
        ].forEach(img => img.setTint(this.eraColor).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD));
    }

    createAmbientParticles() {
        const { width, height } = this.scale;
        this.add.particles(0, 0, 'particle', {
            x: { min: 0, max: width },
            y: { min: 0, max: height },
            lifespan: 6000,
            speedY: { min: -15, max: -5 },
            scale: { start: 0.2, end: 0 },
            alpha: { start: 0.25, end: 0 },
            tint: 0x00eaff,
            quantity: 1,
            frequency: 300,
            blendMode: 'ADD'
        });
    }

    createTwinkleStars() {
        const { width, height } = this.scale;

        for (let i = 0; i < 14; i++) {
            const x = Phaser.Math.Between(20, width - 20);
            const y = Phaser.Math.Between(20, height - 20);

            const star = this.add.image(x, y, 'star')
                .setScale(Phaser.Math.FloatBetween(0.5, 1.2))
                .setAlpha(0.12)
                .setBlendMode(Phaser.BlendModes.ADD);

            this.tweens.add({
                targets: star,
                alpha: { from: 0.08, to: Phaser.Math.FloatBetween(0.3, 0.6) },
                duration: Phaser.Math.Between(1300, 3000),
                delay: Phaser.Math.Between(0, 2000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    createHeader() {
        const { width } = this.scale;

        this.trackButton(createNeonButton(this, width - 20 - 80, 44, {
            width: 160, height: 48, icon: '←', label: t('nav_back'),
            fontSize: 19, iconFontSize: 20,
            accentColor: 0x8fa0c4,
            onClick: () => this.scene.start(this.fromScene)
        }));

        const title = this.track(this.add.text(width / 2, 75, t('settings_title'), {
            fontFamily: 'Arial', fontSize: '36px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setShadow(0, 0, intToCss(this.eraColor), 15, true, true));

        if (this.fxEnabled) {
            title.postFX.addGlow(this.eraColor, 2, 0, false, 0.15, 14);
        }
    }

    createLanguageCard() {
        const { width } = this.scale;
        const x = 30, y = 140, w = width - 60, h = 230;
        const cx = x + w / 2;

        const panel = this.track(this.add.rectangle(cx, y + h / 2, w, h, 0x141428).setStrokeStyle(2, 0x8fa0c4, 0.6));
        if (this.fxEnabled) panel.postFX.addGlow(0x8fa0c4, 1.5, 0, false, 0.2, 8);

        this.track(this.add.text(x + 46, y + 52, '🌐', { fontSize: '40px' }).setOrigin(0.5));
        this.track(this.add.text(x + 92, y + 24, t('settings_language_label'), {
            fontFamily: 'Arial', fontSize: '32px', color: '#ffffff', fontStyle: 'bold'
        }));
        this.track(this.add.text(x + 92, y + 66, t('settings_language_hint'), {
            fontFamily: 'Arial', fontSize: '20px', color: '#b0b0d0',
            wordWrap: { width: w - 120 }
        }));

        // Пересобираем только контент (buildContent), не всю сцену — фон
        // с звёздами и частицами остаётся нетронутым и не "прыгает"
        this.trackButton(createNeonButton(this, cx - 120, y + 160, {
            width: 210, height: 56, icon: window.gameLang === 'ru' ? '✓' : '', label: 'Русский',
            fontSize: 21, accentColor: window.gameLang === 'ru' ? this.eraColor : 0x3a3a4a,
            onClick: () => { setGameLang('ru'); this.buildContent(); }
        }));
        this.trackButton(createNeonButton(this, cx + 120, y + 160, {
            width: 210, height: 56, icon: window.gameLang === 'en' ? '✓' : '', label: 'English',
            fontSize: 21, accentColor: window.gameLang === 'en' ? this.eraColor : 0x3a3a4a,
            onClick: () => { setGameLang('en'); this.buildContent(); }
        }));
    }

    createSoundCard(y, icon, labelKey, hintKey, getEnabled, setEnabled) {
        const { width } = this.scale;
        const x = 30, w = width - 60, h = 230;
        const cx = x + w / 2;

        const panel = this.track(this.add.rectangle(cx, y + h / 2, w, h, 0x141428).setStrokeStyle(2, 0x8fa0c4, 0.6));
        if (this.fxEnabled) panel.postFX.addGlow(0x8fa0c4, 1.5, 0, false, 0.2, 8);

        this.track(this.add.text(x + 46, y + 52, icon, { fontSize: '40px' }).setOrigin(0.5));
        this.track(this.add.text(x + 92, y + 24, t(labelKey), {
            fontFamily: 'Arial', fontSize: '32px', color: '#ffffff', fontStyle: 'bold'
        }));
        this.track(this.add.text(x + 92, y + 66, t(hintKey), {
            fontFamily: 'Arial', fontSize: '20px', color: '#b0b0d0',
            wordWrap: { width: w - 120 }
        }));

        const enabled = getEnabled();
        this.trackButton(createNeonButton(this, cx - 120, y + 160, {
            width: 210, height: 56, icon: enabled ? '✓' : '', label: t('settings_on'),
            fontSize: 21, accentColor: enabled ? this.eraColor : 0x3a3a4a,
            onClick: () => { setEnabled(true); this.buildContent(); }
        }));
        this.trackButton(createNeonButton(this, cx + 120, y + 160, {
            width: 210, height: 56, icon: !enabled ? '✓' : '', label: t('settings_off'),
            fontSize: 21, accentColor: !enabled ? this.eraColor : 0x3a3a4a,
            onClick: () => { setEnabled(false); this.buildContent(); }
        }));
    }
}

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 720,
    height: 1280,
    backgroundColor: '#0a0a12',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BootScene, MainMenuScene, ResonanceScene, UpgradeScene, HelperScene, FrequencyScene, PrestigeScene, SettingsScene]
};

const game = new Phaser.Game(config);