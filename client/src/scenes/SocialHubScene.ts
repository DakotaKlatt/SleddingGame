import Phaser from 'phaser';
import SocketClient from '../net/SocketClient';

export default class SocialHubScene extends Phaser.Scene {
    private players: Map<string, Phaser.Physics.Matter.Sprite> = new Map();
    private chatBubbles: Map<string, Phaser.GameObjects.Container> = new Map();
    private localPlayerId: string | null = null;
    private roomCode: string = '';
    private chatInput?: HTMLInputElement;

    constructor() {
        super('SocialHubScene');
    }

    init(data: any) {
        this.roomCode = data.room.code;
        this.localPlayerId = SocketClient.id;
        this.createPlayers(data.room.players);
    }

    create() {
        const { width, height } = this.cameras.main;
        
        this.matter.world.setBounds(0, -1000, 5000, 2000);
        this.matter.world.engine.positionIterations = 10;
        this.matter.world.engine.velocityIterations = 8;

        // 1. Background
        this.createBackground();

        // 2. Village Terrain (Flat with some bumps)
        this.createVillageTerrain();

        // 3. Decor
        this.createDecorations();

        // 4. Camera
        const localPlayer = this.players.get(this.localPlayerId!);
        if (localPlayer) {
            this.cameras.main.startFollow(localPlayer, true, 0.1, 0.1);
            this.cameras.main.roundPixels = true;
        }

        // 5. Chat UI
        this.createChatUI();

        // 6. Controls
        this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        
        // Networking
        SocketClient.on('playerStateUpdate', (data: any) => {
            this.updateRemotePlayer(data.id, data.state);
        });

        SocketClient.on('playerJoined', (players: any) => {
            // Re-sync players
            // For simplicity, just add missing ones or refresh all
            // Ideally, just add new.
            Object.values(players).forEach((p: any) => {
                if (!this.players.has(p.id)) {
                    this.createSinglePlayer(p);
                }
            });
        });

        SocketClient.on('chatMessage', (data: any) => {
            this.showChatBubble(data.id, data.message);
        });

        this.time.addEvent({
            delay: 50,
            callback: () => this.sendPlayerState(),
            loop: true
        });
    }

    createBackground() {
        // Similar to GameScene but maybe more "Village" like
        const sky = this.add.graphics();
        sky.fillGradientStyle(0x88ccff, 0x88ccff, 0xffddff, 0xffddff, 1); // Brighter day
        sky.fillRect(-1000, -2000, 10000, 4000);
        sky.setScrollFactor(0);
        sky.setDepth(-100);
        
        // Background Mountains
        const mountains = this.add.graphics();
        mountains.fillStyle(0xffffff, 1);
        mountains.fillTriangle(0, 600, 400, 100, 800, 600);
        mountains.fillTriangle(600, 600, 1000, 200, 1400, 600);
        mountains.setScrollFactor(0.2);
        mountains.setDepth(-50);
    }

    createVillageTerrain() {
        // Flat ground
        this.matter.add.rectangle(2500, 600, 5000, 100, { isStatic: true, friction: 0.1 });
        const ground = this.add.graphics();
        ground.fillStyle(0xffffff, 1);
        ground.fillRect(0, 550, 5000, 500); // Visual fill
        
        // Add a ramp
        const rampVerts = [{x: 1000, y: 550}, {x: 1200, y: 450}, {x: 1200, y: 550}];
        this.matter.add.fromVertices(1100, 500, [rampVerts], { isStatic: true });
        const rampG = this.add.graphics();
        rampG.fillStyle(0xeeeeff, 1);
        rampG.fillTriangle(1000, 550, 1200, 450, 1200, 550);
    }

    createDecorations() {
        // Igloo
        const igloo = this.add.text(600, 500, '🏠', { fontSize: '150px' }).setOrigin(0.5, 1);
        
        // Trees
        for(let i=0; i<10; i++) {
            this.add.text(200 + i * 400, 550, '🌲', { fontSize: '80px' }).setOrigin(0.5, 1);
        }
        
        // Sign
        const sign = this.add.text(100, 550, '🚏\nTown', { fontSize: '40px', align: 'center' }).setOrigin(0.5, 1);
    }

    createPlayers(playersData: any) {
        Object.values(playersData).forEach((p: any) => this.createSinglePlayer(p));
    }

    createSinglePlayer(p: any) {
        if (this.players.has(p.id)) return;

        const isLocal = p.id === this.localPlayerId;
        const cosmetics = p.cosmetics || { character: '🏂', sled: '🛷', hat: '🧢' };
        
        const textureKey = `hub_player_${p.id}`;
        if (!this.textures.exists(textureKey)) {
            const size = 64;
            const canvas = this.textures.createCanvas(textureKey, size, size);
            if (canvas) {
                const ctx = canvas.context;
                ctx.font = '40px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(cosmetics.sled, size/2, size/2 + 10);
                ctx.fillText(cosmetics.character, size/2, size/2 - 10);
                ctx.font = '30px Arial';
                ctx.fillText(cosmetics.hat, size/2, size/2 - 35);
                canvas.refresh();
            }
        }

        const sprite = this.matter.add.sprite(500, 400, textureKey);
        sprite.setBody({
            type: 'rectangle',
            width: 50, 
            height: 20
        }, {
            friction: 0.05, // Higher friction for control in hub
            frictionAir: 0.01,
            restitution: 0,
            chamfer: { radius: 5 }
        });
        sprite.setFixedRotation(); // Don't flip over in hub? Or maybe just high angular damping
        
        if (isLocal) {
            sprite.setStatic(false);
        } else {
            sprite.setSensor(true);
            sprite.setIgnoreGravity(true);
        }

        this.players.set(p.id, sprite);
    }

    createChatUI() {
        this.chatInput = document.createElement('input');
        this.chatInput.type = 'text';
        this.chatInput.placeholder = 'Say something...';
        this.chatInput.style.position = 'absolute';
        this.chatInput.style.bottom = '20px';
        this.chatInput.style.left = '50%';
        this.chatInput.style.transform = 'translateX(-50%)';
        this.chatInput.style.width = '300px';
        this.chatInput.style.padding = '10px';
        this.chatInput.style.borderRadius = '20px';
        this.chatInput.style.border = '2px solid #fff';
        this.chatInput.style.backgroundColor = 'rgba(0,0,0,0.5)';
        this.chatInput.style.color = '#fff';
        this.chatInput.style.fontSize = '16px';
        
        document.body.appendChild(this.chatInput);

        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.chatInput?.value) {
                const message = this.chatInput.value;
                this.chatInput.value = '';
                SocketClient.emit('chatMessage', { code: this.roomCode, message });
            }
        });

        this.events.on('shutdown', () => {
            if (this.chatInput?.parentNode) {
                this.chatInput.parentNode.removeChild(this.chatInput);
            }
        });
    }

    showChatBubble(playerId: string, message: string) {
        const player = this.players.get(playerId);
        if (!player) return;

        // Remove existing bubble for this player
        if (this.chatBubbles.has(playerId)) {
            this.chatBubbles.get(playerId)?.destroy();
        }

        const container = this.add.container(player.x, player.y - 60);
        
        const text = this.add.text(0, 0, message, {
            fontSize: '16px',
            color: '#000000',
            backgroundColor: '#ffffff',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5);
        
        // Bubble Graphics (Rounded rect handled by text backgroundColor mostly, but let's make it nicer)
        // Actually standard Phaser Text background is square. 
        // Let's use a graphics backing
        const bg = this.add.graphics();
        bg.fillStyle(0xffffff, 1);
        bg.fillRoundedRect(-text.width/2 - 5, -text.height/2 - 5, text.width + 10, text.height + 10, 10);
        
        container.add([bg, text]);
        container.setDepth(100); // Top

        this.chatBubbles.set(playerId, container);

        // Follow player
        const updateListener = () => {
            if (player.active && container.active) {
                container.setPosition(player.x, player.y - 60);
            } else {
                container.destroy();
            }
        };
        this.events.on('update', updateListener);

        // Fade out
        this.time.delayedCall(4000, () => {
            this.tweens.add({
                targets: container,
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    container.destroy();
                    this.events.off('update', updateListener);
                }
            });
        });
    }

    update(time: number, delta: number) {
        const player = this.players.get(this.localPlayerId!);
        if (!player) return;

        const keys = this.input.keyboard!.addKeys('A,D') as any;
        const speed = 5;

        if (keys.A.isDown) {
            player.setVelocityX(-speed);
            player.setFlipX(true); // If we had a sprite that could flip
        } else if (keys.D.isDown) {
            player.setVelocityX(speed);
            player.setFlipX(false);
        }
        
        // Constrain rotation so they don't faceplant in the hub
        player.setAngularVelocity(0);
        player.setAngle(0);
    }

    sendPlayerState() {
        const player = this.players.get(this.localPlayerId!);
        if (!player) return;
        SocketClient.emit('playerState', {
            code: this.roomCode,
            state: { x: player.x, y: player.y, angle: player.angle }
        });
    }

    updateRemotePlayer(id: string, state: any) {
        const p = this.players.get(id);
        if (p) {
            p.setPosition(state.x, state.y);
            p.setAngle(state.angle);
        }
    }
}

