import Phaser from 'phaser';
import SocketClient from '../net/SocketClient';

export default class HostJoinScene extends Phaser.Scene {
    private selectedMode: 'race' | 'endless' = 'race';
    private modeText?: Phaser.GameObjects.Text;
    private previewIcon?: Phaser.GameObjects.Text;

    constructor() {
        super('HostJoinScene');
    }

    create() {
        SocketClient.connect();
        
        // Ensure background is running
        if (!this.scene.get('BackgroundScene').scene.settings.active) {
            this.scene.launch('BackgroundScene');
        }
        this.scene.bringToTop('HostJoinScene');

        const { width, height } = this.cameras.main;

        // --- Glass Panel ---
        const panelWidth = 600;
        const panelHeight = 500;
        const panelX = width / 2;
        const panelY = height / 2;

        const graphics = this.add.graphics();
        graphics.fillStyle(0x000000, 0.4); // Darker glass
        graphics.fillRoundedRect(panelX - panelWidth/2, panelY - panelHeight/2, panelWidth, panelHeight, 20);
        graphics.lineStyle(2, 0xffffff, 0.2);
        graphics.strokeRoundedRect(panelX - panelWidth/2, panelY - panelHeight/2, panelWidth, panelHeight, 20);

        this.add.text(width / 2, panelY - 200, 'GAME SETUP', {
            fontSize: '32px',
            fontFamily: 'Arial Black',
            color: '#ffffff'
        }).setOrigin(0.5);

        // --- Mode Selection ---
        this.add.text(width / 2, panelY - 120, 'SELECT MODE', { fontSize: '16px', color: '#aaa' }).setOrigin(0.5);

        // Mode Display Box
        const modeBox = this.add.container(width/2, panelY - 70);
        const mbBg = this.add.rectangle(0, 0, 300, 60, 0xffffff, 0.1).setInteractive();
        const mbBorder = this.add.graphics();
        mbBorder.lineStyle(1, 0xffffff, 0.5);
        mbBorder.strokeRect(-150, -30, 300, 60);
        
        this.modeText = this.add.text(0, 0, 'RACE (Point-to-Point)', {
            fontSize: '20px', color: '#ffff00', fontStyle: 'bold'
        }).setOrigin(0.5);
        
        modeBox.add([mbBg, mbBorder, this.modeText]);

        // Toggle Mode on Click
        mbBg.on('pointerdown', () => this.toggleMode());
        
        // Mode Description/Icon
        this.previewIcon = this.add.text(width/2, panelY, '🏁', { fontSize: '40px' }).setOrigin(0.5);

        // --- Action Buttons ---
        this.createGlassButton(width / 2, panelY + 80, 'HOST GAME', () => this.hostGame(false), 0x00aa00);
        this.createGlassButton(width / 2, panelY + 150, 'PLAY SOLO', () => this.hostGame(true), 0xaa0000);

        // --- Join Section ---
        this.add.text(width / 2, panelY + 210, 'OR JOIN WITH CODE:', { fontSize: '16px', color: '#aaa' }).setOrigin(0.5);
        
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'CODE';
        input.style.position = 'absolute';
        input.style.left = '50%';
        input.style.top = '85%'; // Approx position relative to screen
        input.style.transform = 'translate(-50%, -50%)';
        input.style.padding = '10px';
        input.style.fontSize = '16px';
        input.style.borderRadius = '5px';
        input.style.border = 'none';
        input.style.textAlign = 'center';
        input.style.textTransform = 'uppercase';
        input.style.width = '150px';
        document.body.appendChild(input);

        this.events.on('shutdown', () => {
            if (input.parentNode) input.parentNode.removeChild(input);
        });
        
        // Join Button (Small)
        const joinBtn = this.add.text(width/2 + 120, height * 0.85, 'GO', {
            fontSize: '20px', backgroundColor: '#0000aa', padding: {x:10, y:5}
        }).setOrigin(0.5).setInteractive();

        joinBtn.on('pointerdown', () => {
            if (input.value) this.joinGame(input.value.toUpperCase());
        });

        // Back Button
        const backBtn = this.add.text(width / 2, panelY + 280, 'BACK', {
            fontSize: '16px', color: '#888', fontStyle: 'underline'
        }).setOrigin(0.5).setInteractive();
        backBtn.on('pointerdown', () => this.scene.start('MainMenuScene'));

        // Socket Listeners
        SocketClient.on('roomCreated', (room: any) => {
            this.scene.stop('BackgroundScene'); // Stop BG when entering Lobby/Game
            this.scene.start('LobbyScene', { room, isHost: true });
        });

        SocketClient.on('roomJoined', (room: any) => {
            this.scene.stop('BackgroundScene');
            this.scene.start('LobbyScene', { room, isHost: false });
        });

        SocketClient.on('roomError', (err: string) => {
            alert(err);
        });
    }

    toggleMode() {
        if (this.selectedMode === 'race') {
            this.selectedMode = 'endless';
            this.modeText?.setText('ENDLESS CHASE');
            this.previewIcon?.setText('🏔️');
        } else {
            this.selectedMode = 'race';
            this.modeText?.setText('RACE (Point-to-Point)');
            this.previewIcon?.setText('🏁');
        }
    }

    hostGame(isSolo: boolean) {
        SocketClient.emit('createRoom', { mode: this.selectedMode, name: 'Host', isSolo });
    }

    joinGame(code: string) {
        SocketClient.emit('joinRoom', { code, name: 'Player' });
    }

    createGlassButton(x: number, y: number, text: string, callback: () => void, baseColor: number) {
        const btnWidth = 250;
        const btnHeight = 50;

        const container = this.add.container(x, y);
        
        const bg = this.add.graphics();
        bg.fillStyle(baseColor, 0.5); 
        bg.fillRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 10);
        bg.lineStyle(1, 0xffffff, 0.5);
        bg.strokeRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 10);
        
        const txt = this.add.text(0, 0, text, {
            fontSize: '20px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);

        container.add([bg, txt]);
        container.setInteractive(new Phaser.Geom.Rectangle(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight), Phaser.Geom.Rectangle.Contains);

        container.on('pointerover', () => container.setScale(1.05));
        container.on('pointerout', () => container.setScale(1));
        container.on('pointerdown', callback);
    }
}
