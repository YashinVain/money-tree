document.addEventListener('contextmenu', (e) => e.preventDefault());

class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    async create() {
        await initYandexSDK();

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

        this.createParticleBackground();

        const title = this.add.text(width / 2, height * 0.2, 'РЕЗОНАНС', {
            fontFamily: 'Arial',
            fontSize: '64px',
            color: '#00eaff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setShadow(0, 0, '#00eaff', 20, true, true);

        this.tweens.add({
            targets: title,
            scale: { from: 1, to: 1.05 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.add.text(20, 20, `💠 ${window.gameState.currency}`, {
            fontFamily: 'Arial', fontSize: '28px', color: '#ffffff'
        });
        this.add.text(width - 20, 20, '✨ 0', {
            fontFamily: 'Arial', fontSize: '28px', color: '#ffffff'
        }).setOrigin(1, 0);

        const buttons = [
            { label: 'Играть', y: height * 0.45 },
            { label: 'Улучшения', y: height * 0.55 },
            { label: 'Помощники', y: height * 0.63 },
            { label: 'Частоты', y: height * 0.71 },
            { label: 'Настройки', y: height * 0.79 }
        ];

        buttons.forEach(btn => this.createButton(width / 2, btn.y, btn.label));
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

    createButton(x, y, label) {
        const button = this.add.text(x, y, label, {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#ffffff',
            backgroundColor: '#1a1a2e',
            padding: { x: 30, y: 12 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        button.on('pointerover', () => button.setStyle({ color: '#00eaff' }));
        button.on('pointerout', () => button.setStyle({ color: '#ffffff' }));
        button.on('pointerdown', () => {
            this.tweens.add({ targets: button, scale: 0.95, duration: 80, yoyo: true });
            if (label === 'Играть') {
                this.scene.start('ResonanceScene');
            } else {
                console.log(`Раздел "${label}" будет добавлен на следующих этапах`);
            }
        });

        return button;
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

        this.ensureParticleTexture();
        this.createAmbientParticles();
        this.createMenuButton();

        this.currencyText = this.add.text(20, 20, '', {
            fontFamily: 'Arial', fontSize: '28px', color: '#ffffff'
        });
        this.incomeText = this.add.text(20, 58, 'доход/сек: 0', {
            fontFamily: 'Arial', fontSize: '18px', color: '#8888aa'
        });
        this.add.text(width - 20, 20, '✨ 0', {
            fontFamily: 'Arial', fontSize: '28px', color: '#ffffff'
        }).setOrigin(1, 0);

        this.ringGraphics = this.add.graphics();
        this.createResonator();
        this.createReleaseButton();

        this.buffText = this.add.text(this.centerX, this.centerY + this.ringRadius + 110, '', {
            fontFamily: 'Arial', fontSize: '22px', color: '#ff00aa', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.updateUI();
    }

    ensureParticleTexture() {
        if (this.textures.exists('particle')) return;
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(0xffffff, 1);
        gfx.fillCircle(4, 4, 4);
        gfx.generateTexture('particle', 8, 8);
        gfx.destroy();
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

    createMenuButton() {
        const { width } = this.scale;
        const menuBtn = this.add.text(width - 20, 60, '☰ Меню', {
            fontFamily: 'Arial', fontSize: '20px', color: '#ffffff',
            backgroundColor: '#1a1a2e', padding: { x: 14, y: 8 }
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        menuBtn.on('pointerover', () => menuBtn.setStyle({ color: '#00eaff' }));
        menuBtn.on('pointerout', () => menuBtn.setStyle({ color: '#ffffff' }));
        menuBtn.on('pointerdown', () => this.scene.start('MainMenuScene'));
    }

    createResonator() {
        const radius = 90;

        this.glow = this.add.circle(this.centerX, this.centerY, radius + 20, 0x00eaff, 0.15);
        this.resonator = this.add.circle(this.centerX, this.centerY, radius, 0x162447)
            .setStrokeStyle(3, 0x00eaff)
            .setInteractive({ useHandCursor: true });

        this.add.text(this.centerX, this.centerY, '⚡', { fontSize: '56px' }).setOrigin(0.5);

        this.resonator.on('pointerdown', (pointer) => this.onResonatorClick(pointer));
    }

    onResonatorClick(pointer) {
        const income = handleClick();

        this.tweens.add({
            targets: [this.resonator, this.glow],
            scale: { from: 1, to: 0.9 },
            duration: 80,
            yoyo: true,
            ease: 'Sine.easeInOut'
        });

        const popup = this.add.text(pointer.x, pointer.y, `+${income}`, {
            fontFamily: 'Arial', fontSize: '26px', color: '#00eaff', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: popup,
            y: popup.y - 60,
            alpha: 0,
            duration: 600,
            ease: 'Cubic.easeOut',
            onComplete: () => popup.destroy()
        });

        this.emitBurst(pointer.x, pointer.y, 8, 0x00eaff);
        this.updateUI();
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
        this.releaseBtn = this.add.text(this.centerX, y, 'ВЫСВОБОДИТЬ', {
            fontFamily: 'Arial', fontSize: '28px', color: '#555566',
            backgroundColor: '#1a1a2e', padding: { x: 30, y: 14 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.releaseBtn.on('pointerdown', () => this.onRelease());
    }

    onRelease() {
        if (!window.ResonanceState.canRelease()) return;

        window.ResonanceState.release();

        const { width, height } = this.scale;
        const flash = this.add.rectangle(width / 2, height / 2, width, height, 0x00eaff, 0.5);
        this.tweens.add({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy() });

        this.emitBurst(this.centerX, this.centerY, 20, 0x00eaff);
        this.time.delayedCall(150, () => this.emitBurst(this.centerX, this.centerY, 20, 0xff00aa));
        this.cameras.main.shake(150, 0.004);

        this.updateUI();
    }

    updateUI() {
        this.currencyText.setText(`💠 ${window.gameState.currency}`);
        this.drawRing();
        this.updateReleaseButton();
        this.updateBuffText();
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
            const color = filled ? 0x00eaff : 0x2a2a3e;
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
            this.releaseBtn.setText('ВЫСВОБОДИТЬ');
            this.releaseBtn.setStyle({ color: '#0a0a12', backgroundColor: '#00eaff' });

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

            if (cooling) {
                const secondsLeft = Math.ceil(state.getCooldownTimeLeft() / 1000);
                this.releaseBtn.setText(`ПЕРЕЗАРЯДКА ${secondsLeft}с`);
                this.releaseBtn.setStyle({ color: '#ff9933', backgroundColor: '#2a1e12' });
            } else {
                this.releaseBtn.setText('ВЫСВОБОДИТЬ');
                this.releaseBtn.setStyle({ color: '#555566', backgroundColor: '#1a1a2e' });
            }
        }
    }

    updateBuffText() {
        if (window.ResonanceState.isBuffActive()) {
            const secondsLeft = Math.ceil(window.ResonanceState.getBuffTimeLeft() / 1000);
            this.buffText.setText(`⚡ БАФФ x2: ${secondsLeft}с`);
        } else {
            this.buffText.setText('');
        }
    }

    update() {
        this.currencyText.setText(`💠 ${window.gameState.currency}`);
        this.updateReleaseButton();
        this.updateBuffText();
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
    scene: [BootScene, MainMenuScene, ResonanceScene]
};

const game = new Phaser.Game(config);