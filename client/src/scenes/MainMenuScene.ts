import Phaser from 'phaser';

export default class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
    }

    create() {
        // 1. Launch Dynamic Background
        if (!this.scene.get('BackgroundScene').scene.settings.active) {
            this.scene.launch('BackgroundScene');
        }
        this.scene.bringToTop('MainMenuScene');

        const { width, height } = this.cameras.main;

        // --- Glass Panel Container ---
        const panelWidth = 400;
        const panelHeight = 300;
        const panelX = width / 2;
        const panelY = height / 2 + 50;

        // Glass effect backing
        const graphics = this.add.graphics();
        graphics.fillStyle(0xffffff, 0.1); // Semi-transparent white
        graphics.fillRoundedRect(panelX - panelWidth/2, panelY - panelHeight/2, panelWidth, panelHeight, 20);
        
        graphics.lineStyle(2, 0xffffff, 0.3); // Subtle border
        graphics.strokeRoundedRect(panelX - panelWidth/2, panelY - panelHeight/2, panelWidth, panelHeight, 20);

        // --- Title (Floating above) ---
        const titleText = this.add.text(width / 2, height * 0.25, 'Snowline Sleds', {
            fontSize: '64px',
            fontFamily: 'Arial Black',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Add a glow tween to title
        this.tweens.add({
            targets: titleText,
            scale: 1.05,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // --- Buttons ---
        this.createGlassButton(width / 2, panelY - 50, 'PLAY', () => {
            // Go to HostJoin but keep background? 
            // Actually HostJoin usually has its own layout, but we can keep BackgroundScene running
            this.scene.start('HostJoinScene');
        });

        this.createGlassButton(width / 2, panelY + 50, 'OPTIONS', () => {
            console.log('Options clicked');
        });
    }

    createGlassButton(x: number, y: number, text: string, callback: () => void) {
        const btnWidth = 250;
        const btnHeight = 60;

        const container = this.add.container(x, y);
        
        // Button background (Glass)
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.3); // Darker tint for buttons
        bg.fillRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 15);
        bg.lineStyle(1, 0xffffff, 0.5);
        bg.strokeRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 15);
        
        // Text
        const txt = this.add.text(0, 0, text, {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        container.add([bg, txt]);
        
        // Interactive Zone
        const hitArea = new Phaser.Geom.Rectangle(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight);
        container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

        container.on('pointerover', () => {
            // Hover effect
            container.setScale(1.05);
            bg.clear();
            bg.fillStyle(0xffffff, 0.2); // Lighten on hover
            bg.fillRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 15);
            bg.lineStyle(1, 0xffffff, 0.8);
            bg.strokeRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 15);
        });

        container.on('pointerout', () => {
            // Reset
            container.setScale(1);
            bg.clear();
            bg.fillStyle(0x000000, 0.3);
            bg.fillRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 15);
            bg.lineStyle(1, 0xffffff, 0.5);
            bg.strokeRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 15);
        });

        container.on('pointerdown', callback);
        
        return container;
    }
}
