import Phaser from 'phaser';
import SocketClient from '../net/SocketClient';
import Avalanche from '../game/Avalanche';
import { Progression } from '../game/Progression';

export default class GameScene extends Phaser.Scene {
    private roomCode: string = '';
    private mode: 'race' | 'endless' = 'race';
    private players: Map<string, Phaser.Physics.Matter.Sprite> = new Map();
    private localPlayerId: string | null = null;
    private gameStarted: boolean = false;
    private isFinished: boolean = false;
    private avalanche?: Avalanche;
    
    // Visuals
    private mountainLayers: Phaser.GameObjects.Graphics[] = [];
    private snowEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
    private decorations: Phaser.GameObjects.Text[] = [];
    
    // Stats
    private distanceTraveled: number = 0;
    private maxSpeed: number = 0;
    private totalFlips: number = 0;
    private startTime: number = 0;

    // UI
    private speedText?: Phaser.GameObjects.Text;
    private timerText?: Phaser.GameObjects.Text;
    private avalancheText?: Phaser.GameObjects.Text;
    private finishBanner?: Phaser.GameObjects.Container;

    // Terrain State
    private currentSeed: number = 0;
    private lastX: number = 0;
    private lastY: number = 0;
    private generatedDistance: number = 0;
    private TRACK_LENGTH: number = 15000; 
    private BUFFER_DISTANCE: number = 3000; 
    private finishLineX: number = 0;

    constructor() {
        super('GameScene');
    }

    init(data: any) {
        this.roomCode = data.roomCode;
        this.mode = data.mode || 'race';
        this.localPlayerId = SocketClient.id;
        this.currentSeed = data.seed;
        this.generatedDistance = 0;
        this.lastX = 0;
        this.lastY = 0;
        this.isFinished = false;
        
        this.createPlayers(data.players);
        
        if (this.mode === 'race') {
            this.generateRaceTrack();
        } else {
            this.generateInitialEndlessTerrain();
        }
    }

    create() {
        this.matter.world.setBounds(0, -50000, 1000000, 100000);
        this.matter.world.engine.positionIterations = 10;
        this.matter.world.engine.velocityIterations = 8;
        
        // 1. Background (Sky + Mountains)
        this.createBackground();

        this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        const localPlayer = this.players.get(this.localPlayerId!);
        if (localPlayer) {
            // HARD LOCK CAMERA
            this.cameras.main.startFollow(localPlayer, true, 1, 1);
            this.cameras.main.roundPixels = true; 
        }

        // 2. Snow Particles (Foreground)
        this.createSnow();

        this.createUI();

        if (this.mode === 'endless') {
            this.avalanche = new Avalanche(this, -1000);
        }

        let count = 5;
        const countText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, count.toString(), {
            fontSize: '72px', color: '#ff0000'
        }).setScrollFactor(0).setOrigin(0.5);

        const timer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                count--;
                countText.setText(count.toString());
                if (count <= 0) {
                    countText.destroy();
                    this.startGame();
                }
            },
            repeat: 4
        });

        SocketClient.on('playerStateUpdate', (data: any) => {
            this.updateRemotePlayer(data.id, data.state);
        });
        
        SocketClient.on('playerFinished', (data: any) => {
            console.log(`Player ${data.id} finished!`);
        });
    }

    createBackground() {
        const { width, height } = this.cameras.main;
        
        // Static Sky Gradient
        const sky = this.add.graphics();
        sky.fillGradientStyle(0x6666ff, 0x6666ff, 0xff9999, 0xff9999, 1);
        sky.fillRect(0, -50000, width * 10, 100000); // Huge skybox
        sky.setScrollFactor(0);
        sky.setDepth(-100);

        // Parallax Mountains
        this.createMountainLayer(0.1, 0x333388, 500, -1000);
        this.createMountainLayer(0.2, 0x4444aa, 300, -500);
    }

    createMountainLayer(scrollFactor: number, color: number, heightVar: number, yOffset: number) {
        const graphics = this.add.graphics();
        graphics.fillStyle(color, 1);
        
        // We need a wide looping mountain range or just generate a huge one
        // For simplicity, let's generate a very wide range relative to scroll
        const points: {x: number, y: number}[] = [];
        
        let x = -5000; // Start way back
        let y = yOffset;
        
        points.push({ x, y: 50000 }); // Bottom left anchor (Deep)
        points.push({ x, y });

        while (x < 50000) { // Cover a large distance
            x += 200 + Math.random() * 400;
            y = yOffset + (Math.random() - 0.5) * heightVar;
            points.push({ x, y });
        }

        points.push({ x, y: 50000 }); // Bottom right anchor (Deep)
        
        graphics.fillPoints(points, true);
        graphics.setScrollFactor(scrollFactor);
        graphics.setDepth(-50 + scrollFactor * 10);
    }

    createSnow() {
        // Ensure texture exists (shared with BackgroundScene, but just in case)
        if (!this.textures.exists('snow_particle')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('snow_particle', 8, 8);
        }

        this.snowEmitter = this.add.particles(0, 0, 'snow_particle', {
            x: { min: 0, max: this.cameras.main.width },
            y: -50,
            lifespan: 6000,
            gravityY: 10,
            speedY: { min: 20, max: 50 },
            scale: { min: 0.1, max: 0.4 },
            quantity: 2,
            frequency: 50,
            tint: 0xffffff
        });
        
        this.snowEmitter.setScrollFactor(0); // Snow stays on screen
        this.snowEmitter.setDepth(10);
    }

    startGame() {
        this.gameStarted = true;
        this.startTime = Date.now();
        if (this.avalanche) this.avalanche.start();
        
        const localPlayer = this.players.get(this.localPlayerId!);
        if (localPlayer) {
            localPlayer.setStatic(false);
            localPlayer.setVelocityX(10); 
        }

        this.time.addEvent({
            delay: 50, 
            callback: () => this.sendPlayerState(),
            loop: true
        });
    }

    createPlayers(playersData: any) {
        Object.values(playersData).forEach((p: any) => {
            const isLocal = p.id === this.localPlayerId;
            const cosmetics = p.cosmetics || { character: '🏂', sled: '🛷', hat: '🧢' };
            
            const textureKey = `player_texture_${p.id}`;
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

            const sprite = this.matter.add.sprite(0, 0, textureKey);
            
            sprite.setBody({
                type: 'rectangle',
                width: 50, 
                height: 20
            }, {
                friction: 0.002, 
                frictionAir: 0.005,
                density: 0.01,
                restitution: 0.1,
                chamfer: { radius: 5 }
            });

            sprite.setDisplaySize(64, 64);
            sprite.setDepth(5); // Player depth
            
            if (isLocal) {
                sprite.setPosition(200, -200);
                sprite.setStatic(true);
            } else {
                sprite.setPosition(200, -200);
                sprite.setSensor(true);
                sprite.setIgnoreGravity(true);
            }

            this.players.set(p.id, sprite);
        });
    }

    seededRandom(seed: number) {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    // --- TERRAIN GENERATION ---

    generateRaceTrack() {
        // Initial Platform
        this.createVisibleBlock(0, 0, 400, 20, 0.02);
        this.lastX = 200;
        this.lastY = 0;
        
        const segmentWidth = 200;
        
        while (this.generatedDistance < this.TRACK_LENGTH) {
            this.addVariedSegment(segmentWidth);
        }
        
        this.finishLineX = this.lastX;
        this.createFinishLine();
        
        // Stop Platform
        this.createVisibleBlock(this.finishLineX + 2000, this.lastY + 200, 4000, 20, 0.5);
    }

    generateInitialEndlessTerrain() {
        this.createVisibleBlock(0, 0, 400, 20, 0.02);
        this.lastX = 200;
        this.lastY = 0;
        this.generateEndlessChunk(4000);
    }

    generateEndlessChunk(distance: number) {
        let generated = 0;
        const segmentWidth = 200;
        while (generated < distance) {
            this.addVariedSegment(segmentWidth);
            generated += segmentWidth;
        }
    }

    createVisibleBlock(x: number, y: number, w: number, h: number, friction: number) {
        this.matter.add.rectangle(x, y, w, h, { isStatic: true, friction: friction });
        const g = this.add.graphics();
        g.fillStyle(0xffffff, 1);
        g.fillRect(x - w/2, y - h/2, w, h);
        // Deep fill for block
        g.fillRect(x - w/2, y + h/2, w, 50000); // DEEP fill
        g.setDepth(0);
    }

    addVariedSegment(width: number) {
        const rand = this.seededRandom(this.currentSeed++);
        
        let drop = 0;
        let friction = 0.005; 

        if (rand < 0.6) {
            drop = 50 + this.seededRandom(this.currentSeed++) * 100;
        } else if (rand < 0.8) {
            drop = 150 + this.seededRandom(this.currentSeed++) * 150;
            friction = 0.001; 
        } else if (rand < 0.9) {
            drop = -20 + this.seededRandom(this.currentSeed++) * 40;
        } else {
            drop = 300 + this.seededRandom(this.currentSeed++) * 200;
        }
        
        const nextX = this.lastX + width;
        const nextY = this.lastY + drop;
        
        const angle = Math.atan2(nextY - this.lastY, nextX - this.lastX);
        const dist = Phaser.Math.Distance.Between(this.lastX, this.lastY, nextX, nextY);
        const midX = (this.lastX + nextX) / 2;
        const midY = (this.lastY + nextY) / 2;
        
        // Physics
        this.matter.add.rectangle(midX, midY, dist + 2, 20, { 
            isStatic: true,
            angle: angle,
            friction: friction
        });

        // Visuals (Graphics)
        const g = this.add.graphics();
        g.fillStyle(0xffffff, 1);
        
        // Vertices for the segment rectangle:
        const halfThick = 10; // 20 height / 2
        
        // Perpendicular vector for thickness
        const perpX = -Math.sin(angle) * halfThick;
        const perpY = Math.cos(angle) * halfThick;

        const p1 = { x: this.lastX - perpX, y: this.lastY - perpY };
        const p2 = { x: this.lastX + perpX, y: this.lastY + perpY };
        const p3 = { x: nextX + perpX, y: nextY + perpY };
        const p4 = { x: nextX - perpX, y: nextY - perpY };
        
        g.fillPoints([p1, p2, p3, p4], true);
        
        // Add DEEP fill below
        const deep = 50000; // Increased from 500 to 50000
        const p1_deep = { x: this.lastX, y: this.lastY + deep };
        const p4_deep = { x: nextX, y: nextY + deep };
        
        // Draw terrain fill below
        const fillG = this.add.graphics();
        fillG.fillStyle(0xeeeeff, 1); // Slightly darker snow for depth
        fillG.fillPoints([
            { x: this.lastX, y: this.lastY }, 
            { x: nextX, y: nextY }, 
            p4_deep, 
            p1_deep
        ], true);
        fillG.setDepth(-1);

        // --- DECORATIONS (Trees & Rocks) ---
        // Random chance to spawn a decoration on this segment
        if (this.seededRandom(this.currentSeed * 2) > 0.7) {
            const decoType = this.seededRandom(this.currentSeed * 3) > 0.5 ? '🌲' : '🪨';
            
            // Position somewhere along the segment surface
            const t = 0.2 + this.seededRandom(this.currentSeed * 4) * 0.6; // 20% to 80% along segment
            const decoX = this.lastX + (nextX - this.lastX) * t;
            const decoY = this.lastY + (nextY - this.lastY) * t;
            
            // Offset slightly up (perp) to sit on surface
            const upX = Math.sin(angle) * 30;
            const upY = -Math.cos(angle) * 30;

            const deco = this.add.text(decoX + upX, decoY + upY, decoType, {
                fontSize: '40px'
            }).setOrigin(0.5, 1); // Anchor bottom center
            
            deco.setRotation(angle); // Align with slope? Or keep upright? 
            // Usually trees grow up (gravity aligned), but rocks might align with slope.
            // Let's keep upright for now, except maybe rocks slightly tilted?
            if (decoType === '🌲') {
                deco.setRotation(0); // Trees upright
            } else {
                deco.setRotation(angle); // Rocks align
            }
            deco.setDepth(1); // Behind player but in front of terrain
            
            this.decorations.push(deco);
        }

        this.lastX = nextX;
        this.lastY = nextY;
        this.generatedDistance += width;
    }

    createFinishLine() {
        const finishLine = this.add.graphics();
        for(let i=0; i<20; i++) {
             finishLine.fillStyle(i%2===0 ? 0xffffff : 0x000000);
             finishLine.fillRect(this.finishLineX, this.lastY - 500 + (i*50), 50, 50);
        }
        this.add.text(this.finishLineX, this.lastY - 600, 'FINISH', { fontSize: '48px', color: '#00ff00', fontStyle: 'bold' }).setOrigin(0.5);
    }

    createUI() {
        this.speedText = this.add.text(this.cameras.main.width - 20, 20, '0 mph', {
            fontSize: '32px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

        if (this.mode === 'race') {
            this.timerText = this.add.text(this.cameras.main.width / 2, 20, '00:00', {
                fontSize: '32px', color: '#ffff00', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
        }

        if (this.mode === 'endless') {
            this.avalancheText = this.add.text(this.cameras.main.width / 2, 20, 'AVALANCHE: -1000m', {
                fontSize: '32px', color: '#ff4444', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
        }
    }

    createFinishEffects() {
        const { width, height } = this.cameras.main;
        this.finishBanner = this.add.container(width / 2, height / 3).setScrollFactor(0).setDepth(200);
        const bg = this.add.rectangle(0, 0, width, 150, 0x000000, 0.5);
        const text = this.add.text(0, 0, 'FINISHED!', {
            fontSize: '80px', color: '#ffff00', fontStyle: 'bold', stroke: '#ff0000', strokeThickness: 8
        }).setOrigin(0.5);
        const subText = this.add.text(0, 80, 'Stopping...', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
        this.finishBanner.add([bg, text, subText]);
        this.finishBanner.setScale(0);
        this.tweens.add({ targets: this.finishBanner, scale: 1, duration: 500, ease: 'Back.out' });
        this.createFireworks();
    }

    createFireworks() {
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(4, 4, 4);
        graphics.generateTexture('particle', 8, 8);

        const emitter = this.add.particles(0, 0, 'particle', {
            lifespan: 2000,
            speed: { min: 200, max: 400 },
            scale: { start: 1, end: 0 },
            gravityY: 300,
            emitting: false
        });

        const launchFirework = () => {
            const x = this.cameras.main.scrollX + Math.random() * this.cameras.main.width;
            const y = this.cameras.main.scrollY + Math.random() * (this.cameras.main.height / 2);
            const color = Phaser.Math.RND.pick([0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff]);
            emitter.setPosition(x, y);
            emitter.setParticleTint(color);
            emitter.explode(50);
        };

        this.time.addEvent({ delay: 500, callback: launchFirework, repeat: 10 });
    }

    finishRace() {
        if (this.isFinished) return;
        this.isFinished = true;
        SocketClient.emit('playerFinished', { code: this.roomCode, time: Date.now() - this.startTime });
        this.createFinishEffects();
        this.time.delayedCall(6000, () => { this.gameOver('Finished!'); });
    }

    update(time: number, delta: number) {
        if (!this.gameStarted) return;

        const player = this.players.get(this.localPlayerId!);
        if (!player) return;

        if (this.mode === 'race') {
            if (!this.isFinished) {
                const elapsed = Date.now() - this.startTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                const ms = Math.floor((elapsed % 1000) / 10);
                this.timerText?.setText(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`);
            }
            if (!this.isFinished && player.x > this.finishLineX) {
                this.finishRace();
            }
        }

        if (this.mode === 'endless') {
            if (player.x + this.BUFFER_DISTANCE > this.lastX) {
                this.generateEndlessChunk(2000);
            }
            if (this.avalanche) {
                this.avalanche.update(delta, this.players);
                const dist = Math.floor((player.x - this.avalanche.x) / 100);
                this.avalancheText?.setText(`AVALANCHE: -${dist}m`);
                if (player.x < this.avalanche.x) {
                    this.gameOver('Avalanche caught you!');
                }
            }
        }

        const keys = this.input.keyboard!.addKeys('A,D') as any;
        if (!this.isFinished) {
            if (keys.A.isDown) {
                player.setAngularVelocity(-0.05);
            } else if (keys.D.isDown) {
                player.setAngularVelocity(0.05);
            }
        } else {
            player.setAngularVelocity(player.body!.angularVelocity * 0.9);
        }

        const velocity = player.body!.velocity;
        const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
        if (this.speedText) {
            this.speedText.setText(`${Math.round(speed * 2.2)} mph`);
        }

        if (speed > this.maxSpeed) this.maxSpeed = speed;
        if (player.x > this.distanceTraveled) this.distanceTraveled = player.x;

        if (player.y > this.lastY + 3000) {
            if (!this.isFinished) {
                this.gameOver('You fell off the world!');
            }
        }
    }

    // ... rest of methods ...
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

    gameOver(reason: string) {
        if (!this.gameStarted) return;
        this.gameStarted = false;
        this.scene.pause();
        
        const stats = {
            distance: this.distanceTraveled,
            maxSpeed: this.maxSpeed,
            flips: this.totalFlips,
            wins: reason === 'Finished!' ? 1 : 0
        };
        
        const newUnlocks = Progression.checkUnlocks(stats);
        
        this.scene.start('ResultsScene', {
            reason,
            stats,
            unlocks: newUnlocks
        });
    }
}
