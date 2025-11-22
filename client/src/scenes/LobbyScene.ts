import Phaser from 'phaser';
import SocketClient from '../net/SocketClient';

export default class LobbyScene extends Phaser.Scene {
    private room: any;
    private isHost: boolean = false;
    private playerTexts: Map<string, Phaser.GameObjects.Text> = new Map();
    private startBtn?: Phaser.GameObjects.Container;
    
    // Selection state
    private currentSelection: { [key: string]: number } = {
        characters: 0,
        sleds: 0,
        hats: 0
    };

    // Preview container
    private previewContainer?: Phaser.GameObjects.Container;
    private previewSled?: Phaser.GameObjects.Text;
    private previewChar?: Phaser.GameObjects.Text;
    private previewHat?: Phaser.GameObjects.Text;

    constructor() {
        super('LobbyScene');
    }

    init(data: any) {
        this.room = data.room;
        this.isHost = data.isHost;
    }

    create() {
        const { width, height } = this.cameras.main;
        
        // Background for Lobby (Static Gradient since we stopped BackgroundScene)
        const graphics = this.add.graphics();
        graphics.fillGradientStyle(0x222244, 0x222244, 0x111122, 0x111122, 1);
        graphics.fillRect(0, 0, width, height);

        // --- Header ---
        this.add.text(width / 2, 50, `ROOM: ${this.room.code}`, { 
            fontSize: '48px', color: '#fff', fontStyle: 'bold', fontFamily: 'Arial Black' 
        }).setOrigin(0.5);
        
        this.add.text(width / 2, 90, `MODE: ${this.room.mode.toUpperCase()}`, { 
            fontSize: '20px', color: '#aaa' 
        }).setOrigin(0.5);

        // --- Panels ---
        // Left Panel: Customization
        this.createPanel(width * 0.25, height * 0.55, width * 0.4, height * 0.6);
        this.add.text(width * 0.25, height * 0.3, 'CUSTOMIZE', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);
        
        this.createPreview(width * 0.25, height * 0.45);
        this.createCosmeticControls(width * 0.25, height * 0.65);

        // Right Panel: Players
        this.createPanel(width * 0.75, height * 0.55, width * 0.4, height * 0.6);
        this.add.text(width * 0.75, height * 0.3, 'PLAYERS', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);
        this.updatePlayerList(this.room.players);

        // --- Start Button ---
        const isLocalHost = String(this.room.hostId) === String(SocketClient.id);
        if (isLocalHost) {
            this.startBtn = this.createGlassButton(width / 2, height - 80, 'START GAME', 0x00aa00, () => {
                SocketClient.emit('startGame', { code: this.room.code });
            });
        } else {
            this.add.text(width / 2, height - 80, 'Waiting for host...', {
                fontSize: '24px', color: '#888', fontStyle: 'italic'
            }).setOrigin(0.5);
        }

        // Socket Events
        SocketClient.on('playerJoined', (players: any) => {
            this.room.players = players;
            this.updatePlayerList(players);
        });

        SocketClient.on('playerUpdated', (data: any) => {
            if (this.room.players[data.id]) {
                this.room.players[data.id].cosmetics = data.cosmetics;
                this.updatePlayerList(this.room.players); 
            }
        });

        SocketClient.on('gameStarted', (data: any) => {
            this.scene.start('GameScene', { ...data, roomCode: this.room.code });
        });
        
        const myPlayer = this.room.players[SocketClient.id];
        if (myPlayer && myPlayer.cosmetics) {
            this.syncSelectionIndices(myPlayer.cosmetics);
        }
        this.updatePreviewVisuals();
    }

    createPanel(x: number, y: number, w: number, h: number) {
        const g = this.add.graphics();
        g.fillStyle(0xffffff, 0.05);
        g.fillRoundedRect(x - w/2, y - h/2, w, h, 20);
        g.lineStyle(1, 0xffffff, 0.2);
        g.strokeRoundedRect(x - w/2, y - h/2, w, h, 20);
    }

    createGlassButton(x: number, y: number, text: string, color: number, callback: () => void) {
        const w = 300, h = 70;
        const c = this.add.container(x, y);
        const bg = this.add.graphics();
        bg.fillStyle(color, 0.8);
        bg.fillRoundedRect(-w/2, -h/2, w, h, 15);
        bg.lineStyle(2, 0xffffff, 0.5);
        bg.strokeRoundedRect(-w/2, -h/2, w, h, 15);
        
        const t = this.add.text(0, 0, text, { fontSize: '32px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        c.add([bg, t]);
        c.setInteractive(new Phaser.Geom.Rectangle(-w/2, -h/2, w, h), Phaser.Geom.Rectangle.Contains);
        c.on('pointerdown', callback);
        c.on('pointerover', () => c.setScale(1.05));
        c.on('pointerout', () => c.setScale(1));
        return c;
    }

    // ... (Rest of logic remains largely same, just updated positions slightly) ...
    
    createPreview(x: number, y: number) {
        this.previewContainer = this.add.container(x, y);
        
        const bg = this.add.circle(0, 40, 70, 0xffffff, 0.1);
        this.previewContainer.add(bg);

        // Sled (bottom)
        this.previewSled = this.add.text(0, 10, '🛷', { fontSize: '50px' }).setOrigin(0.5);
        this.previewContainer.add(this.previewSled);

        // Character (middle)
        this.previewChar = this.add.text(0, -15, '🏂', { fontSize: '50px' }).setOrigin(0.5);
        this.previewContainer.add(this.previewChar);

        // Hat (top)
        this.previewHat = this.add.text(0, -55, '🧢', { fontSize: '40px' }).setOrigin(0.5);
        this.previewContainer.add(this.previewHat);
    }

    createCosmeticControls(x: number, y: number) {
        const types = ['characters', 'sleds', 'hats'];
        
        types.forEach((type, i) => {
            const yPos = y + (i * 70);
            
            this.add.text(x, yPos - 25, type.toUpperCase().slice(0, -1), { 
                fontSize: '14px', color: '#888' 
            }).setOrigin(0.5);

            const leftArrow = this.add.text(x - 100, yPos, '◄', { 
                fontSize: '32px', color: '#fff' 
            }).setOrigin(0.5).setInteractive();
            
            const rightArrow = this.add.text(x + 100, yPos, '►', { 
                fontSize: '32px', color: '#fff' 
            }).setOrigin(0.5).setInteractive();

            const nameText = this.add.text(x, yPos, 'Loading...', { 
                fontSize: '20px', color: '#fff' 
            }).setOrigin(0.5);

            const updateText = () => {
                const items = this.registry.get(`${type}_data`);
                if (items && items.length > 0) {
                    const idx = this.currentSelection[type];
                    nameText.setText(`${items[idx].id} ${items[idx].name}`);
                }
            };

            updateText();

            leftArrow.on('pointerdown', () => {
                this.changeSelection(type, -1);
                updateText();
            });

            rightArrow.on('pointerdown', () => {
                this.changeSelection(type, 1);
                updateText();
            });
        });
    }

    changeSelection(type: string, dir: number) {
        const items = this.registry.get(`${type}_data`);
        if (!items || items.length === 0) return;

        let idx = this.currentSelection[type];
        idx += dir;
        if (idx < 0) idx = items.length - 1;
        if (idx >= items.length) idx = 0;
        
        this.currentSelection[type] = idx;
        
        const selectedItem = items[idx];
        const field = type === 'characters' ? 'character' : type === 'sleds' ? 'sled' : 'hat';
        
        SocketClient.emit('updateCosmetics', { 
            code: this.room.code, 
            cosmetics: { [field]: selectedItem.id } 
        });

        this.updatePreviewVisuals();
    }

    updatePreviewVisuals() {
        const getId = (type: string) => {
            const items = this.registry.get(`${type}_data`);
            if (!items) return null;
            return items[this.currentSelection[type]]?.id;
        };

        const charId = getId('characters');
        const sledId = getId('sleds');
        const hatId = getId('hats');

        if (charId && this.previewChar) this.previewChar.setText(charId);
        if (sledId && this.previewSled) this.previewSled.setText(sledId);
        if (hatId && this.previewHat) this.previewHat.setText(hatId);
    }

    syncSelectionIndices(cosmetics: any) {
        const findIdx = (type: string, id: string) => {
            const items = this.registry.get(`${type}_data`);
            if (!items) return 0;
            return items.findIndex((i: any) => i.id === id);
        };

        if (cosmetics.character) this.currentSelection.characters = Math.max(0, findIdx('characters', cosmetics.character));
        if (cosmetics.sled) this.currentSelection.sleds = Math.max(0, findIdx('sleds', cosmetics.sled));
        if (cosmetics.hat) this.currentSelection.hats = Math.max(0, findIdx('hats', cosmetics.hat));
    }

    updatePlayerList(players: any) {
        this.playerTexts.forEach(text => text.destroy());
        this.playerTexts.clear();

        const playerIds = Object.keys(players);
        const startX = this.cameras.main.width * 0.75;
        const startY = this.cameras.main.height * 0.4;

        playerIds.forEach((id, index) => {
            const p = players[id];
            const isMe = id === SocketClient.id;
            const charEmoji = p.cosmetics?.character || '❓';
            
            const container = this.add.container(startX, startY + (index * 50));
            
            // Strip BG
            const bg = this.add.rectangle(0, 0, 300, 40, isMe ? 0x444488 : 0xffffff, isMe ? 0.5 : 0.1);
            
            const text = this.add.text(0, 0, 
                `${charEmoji} ${p.name} ${p.isHost ? '👑' : ''}`, {
                fontSize: '20px',
                color: '#ffffff'
            }).setOrigin(0.5);
            
            container.add([bg, text]);
            
            // Store reference if needed (but here we reconstruct)
            // We'll just clear the container list next update
            this.playerTexts.set(id, text); // This type mismatch in map is minor for now as we just clear visuals
        });
    }
}
