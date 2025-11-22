import Phaser from 'phaser';

export default class BackgroundScene extends Phaser.Scene {
    private terrainGraphics?: Phaser.GameObjects.Graphics;
    private npcs: Phaser.Physics.Matter.Sprite[] = [];
    private snowEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;

    constructor() {
        super('BackgroundScene');
    }

    create() {
        const { width, height } = this.cameras.main;

        // 0. Generate Particle Texture (Fix for black squares)
        if (!this.textures.exists('snow_particle')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('snow_particle', 8, 8);
        }

        // 1. Dynamic Sky Gradient (Dawn/Dusk vibe)
        const graphics = this.add.graphics();
        graphics.fillGradientStyle(0x6666ff, 0x6666ff, 0xff9999, 0xff9999, 1);
        graphics.fillRect(0, 0, width, height);

        // 2. Parallax Mountains (Background)
        this.createMountainLayer(0.3, 0x333388, 200);
        this.createMountainLayer(0.6, 0x4444aa, 100);

        // 3. Active Slope (Foreground where emojis sled)
        this.createPhysicsSlope();

        // 4. Snow Particles
        this.createSnow();

        // 5. Spawn NPCs loop
        this.time.addEvent({
            delay: 2000,
            callback: () => this.spawnNPC(),
            loop: true
        });
    }

    createMountainLayer(scrollFactor: number, color: number, offset: number) {
        const graphics = this.add.graphics();
        graphics.fillStyle(color, 1);
        
        const points: {x: number, y: number}[] = [];
        points.push({ x: 0, y: this.cameras.main.height });
        
        let x = 0;
        let y = this.cameras.main.height / 2 + offset;
        
        points.push({ x, y });

        while (x < this.cameras.main.width + 100) {
            x += 50 + Math.random() * 100;
            y += (Math.random() - 0.5) * 100;
            points.push({ x, y });
        }

        points.push({ x: this.cameras.main.width, y: this.cameras.main.height });
        graphics.fillPoints(points, true);
        graphics.setScrollFactor(scrollFactor);
    }

    createPhysicsSlope() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        const verts = [
            { x: 0, y: height * 0.4 },
            { x: width * 0.5, y: height * 0.8 },
            { x: width, y: height },
            { x: width, y: height + 100 },
            { x: 0, y: height + 100 }
        ];

        this.matter.add.fromVertices(width / 2, height * 0.9, [verts], {
            isStatic: true,
            friction: 0.001
        });
        
        const gfx = this.add.graphics();
        gfx.fillStyle(0xffffff, 1); 
        gfx.fillPoints(verts.map(v => ({ x: v.x, y: v.y + height * 0.2 })));
    }

    createSnow() {
        this.snowEmitter = this.add.particles(0, 0, 'snow_particle', {
            x: { min: 0, max: this.cameras.main.width },
            y: -50,
            lifespan: 6000,
            gravityY: 10,
            speedY: { min: 20, max: 50 },
            scale: { min: 0.1, max: 0.4 },
            quantity: 2,
            frequency: 100,
            tint: 0xffffff
        });
    }

    spawnNPC() {
        const chars = ['🏂', '🎅', '👽', '🤖', '🧟', '🦸', '🥷', '🧍'];
        const sleds = ['🛷', '🛸', '🛶', '📦', '🚽', '🛹'];
        
        const char = Phaser.Math.RND.pick(chars);
        const sled = Phaser.Math.RND.pick(sleds);
        
        const key = `npc_${Date.now()}`;
        const size = 64;
        const canvas = this.textures.createCanvas(key, size, size);
        if (canvas) {
            const ctx = canvas.context;
            ctx.font = '40px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(sled, size/2, size/2 + 10);
            ctx.fillText(char, size/2, size/2 - 10);
            canvas.refresh();
        }

        const startX = -50;
        const startY = this.cameras.main.height * 0.3;

        const sprite = this.matter.add.sprite(startX, startY, key, undefined, {
            friction: 0.001,
            frictionAir: 0.005,
            restitution: 0.5,
            shape: 'circle'
        });
        
        sprite.setVelocityX(10 + Math.random() * 10);
        sprite.setAngularVelocity(Math.random() * 0.2 - 0.1);

        this.npcs.push(sprite);

        if (this.npcs.length > 20) {
            const old = this.npcs.shift();
            if (old) {
                old.destroy();
                this.textures.remove(old.texture.key);
            }
        }
    }
}
