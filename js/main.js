

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

       
        this.add.text(20, 20, '💠 0', {
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

        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(0x00eaff, 1);
        gfx.fillCircle(4, 4, 4);
        gfx.generateTexture('particle', 8, 8);
        gfx.destroy();

        const { width, height } = this.scale;

        this.add.particles(0, 0, 'particle', {
            x: { min: 0, max: width },
            y: { min: 0, max: height },
            lifespan: 6000,
            speedY: { min: -15, max: -5 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.5, end: 0 },
            quantity: 1,
            frequency: 200,
            blendMode: 'ADD'
        });
    }

    createButton(x, y, label) {
        const button = this.add.text(x, y, label, {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#ffffff',
            backgroundColor: '#1a1a2e',
            padding: { x: 30, y: 12 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        button.on('pointerover', () => {
            button.setStyle({ color: '#00eaff' });
            this.tweens.add({ targets: button, scale: 1.08, duration: 150, ease: 'Back.easeOut' });
        });
        button.on('pointerout', () => {
            button.setStyle({ color: '#ffffff' });
            this.tweens.add({ targets: button, scale: 1, duration: 150 });
        });
        button.on('pointerdown', () => {
            this.tweens.add({ targets: button, scale: 0.95, duration: 80, yoyo: true });
            console.log(`Раздел "${label}" будет добавлен на следующих этапах`);
        });

        return button;
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
    scene: [BootScene, MainMenuScene]
};

const game = new Phaser.Game(config);