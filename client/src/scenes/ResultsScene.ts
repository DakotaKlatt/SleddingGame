import Phaser from 'phaser';

export default class ResultsScene extends Phaser.Scene {
    constructor() {
        super('ResultsScene');
    }

    init(data: any) {
        this.data.set('results', data);
    }

    create() {
        const { width, height } = this.cameras.main;
        const results = this.data.get('results');

        this.add.text(width / 2, 100, 'GAME OVER', {
            fontSize: '48px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(width / 2, 180, results.reason || '', {
            fontSize: '32px', color: '#ffaaaa'
        }).setOrigin(0.5);

        const stats = results.stats;
        if (stats) {
            this.add.text(width / 2, 250, `Distance: ${Math.round(stats.distance)}m`, { fontSize: '24px' }).setOrigin(0.5);
            this.add.text(width / 2, 290, `Top Speed: ${Math.round(stats.maxSpeed)}`, { fontSize: '24px' }).setOrigin(0.5);
        }

        if (results.unlocks && results.unlocks.length > 0) {
            this.add.text(width / 2, 350, 'NEW UNLOCKS!', {
                fontSize: '32px', color: '#ffff00', fontStyle: 'bold'
            }).setOrigin(0.5);

            results.unlocks.forEach((id: string, i: number) => {
                this.add.text(width / 2, 400 + (i * 30), `- ${id}`, {
                    fontSize: '24px', color: '#ffff00'
                }).setOrigin(0.5);
            });
        }

        const btn = this.add.text(width / 2, height - 100, 'BACK TO MENU', {
            fontSize: '28px',
            backgroundColor: '#444',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();

        btn.on('pointerdown', () => this.scene.start('MainMenuScene'));
    }
}
