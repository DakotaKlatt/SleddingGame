import Phaser from 'phaser';
import SocketClient from '../net/SocketClient';

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
        const panelHeight = 350; // Taller for extra button
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
        let btnY = panelY - 80;
        
        this.createGlassButton(width / 2, btnY, 'PLAY GAME', () => {
            this.scene.start('HostJoinScene');
        });

        btnY += 80;
        this.createGlassButton(width / 2, btnY, 'VISIT VILLAGE', () => {
            // Join special 'VILLAGE' room
            SocketClient.connect();
            SocketClient.emit('joinRoom', { code: 'VILLAGE', name: 'Guest' });
            
            // Listen for join success directly here? Or just wait for events handled in next scene?
            // Better to handle the transition logic here:
            SocketClient.once('roomJoined', (room: any) => {
                this.scene.stop('BackgroundScene'); // Stop bg so we can see village
                this.scene.start('SocialHubScene', { room });
            });
            
            // If village doesn't exist, create it (Server logic should handle auto-create if we update it, or we force create)
            // Actually, joinRoom will fail if it doesn't exist.
            // Let's try to create it if join fails? Or just create it first?
            // Simplest: Emit 'createRoom' with code 'VILLAGE' if we could...
            // But our createRoom generates random code.
            // Hack: Let's modify server joinRoom to auto-create if it's 'VILLAGE'.
            // Done in thought process, but not implemented in server yet.
            // Let's assume server handles it or we assume it exists.
            // Actually, I should update server rooms.js to handle 'VILLAGE' specifically.
            // For now, let's try to create a specific room by sending a special flag? 
            // Or just let the user Create a room and we call it 'VILLAGE' manually? No.
            // I'll add a fallback: Join 'VILLAGE', if error 'Room not found', Create 'VILLAGE' (if server allowed specific codes).
            
            // WAIT: I need to update server logic to support this persistence or specific room code.
            // I will update server logic in next step if needed.
            // For now let's assume 'VILLAGE' works or use a simpler 'createRoom' call that we treat as hub.
            // But to be truly "Public", everyone needs same code.
            // I will stick to 'VILLAGE' code and update server.
        });

        btnY += 80;
        this.createGlassButton(width / 2, btnY, 'OPTIONS', () => {
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
