import Phaser from 'phaser';

export default class Avalanche {
    public x: number;
    private speed: number;
    private scene: Phaser.Scene;
    private graphics: Phaser.GameObjects.Graphics;
    private text: Phaser.GameObjects.Text;
    private gameStarted: boolean = false;

    constructor(scene: Phaser.Scene, startX: number) {
        this.scene = scene;
        this.x = startX;
        this.speed = 50; // Initial speed px/sec (increased from 5 to be visible)

        this.graphics = scene.add.graphics();
        this.text = scene.add.text(startX, 100, 'AVALANCHE!', {
            fontSize: '32px', color: '#ff0000', fontStyle: 'bold'
        }).setOrigin(0.5, 1);
        
        // Draw initial wall
        this.draw();
    }

    start() {
        this.gameStarted = true;
    }

    update(dt: number, players: Map<string, Phaser.Physics.Matter.Sprite>) {
        if (!this.gameStarted) return;

        // Increase speed slowly
        this.speed += 10 * (dt / 1000); // +10 px/sec per second

        // Move
        this.x += this.speed * (dt / 1000);

        this.draw();

        // Check collisions
        this.checkEliminations(players);
    }

    draw() {
        // Update visuals
        this.graphics.clear();
        
        // Draw the wall
        this.graphics.fillStyle(0xffffff, 0.8);
        this.graphics.fillRect(this.x - 1000, -5000, 1000, 10000); // Big wall behind
        
        // Red line
        this.graphics.lineStyle(5, 0xff0000);
        this.graphics.lineBetween(this.x, -5000, this.x, 5000);

        // Text follow
        this.text.setPosition(this.x, this.scene.cameras.main.scrollY + 100);
        this.text.setText(`AVALANCHE\nSpeed: ${Math.round(this.speed)}`);
    }

    checkEliminations(players: Map<string, Phaser.Physics.Matter.Sprite>) {
        players.forEach((sprite, id) => {
            // If active and behind avalanche
            if (sprite.active && sprite.x < this.x) {
                // Logic handled in GameScene for local player
            }
        });
    }
}
