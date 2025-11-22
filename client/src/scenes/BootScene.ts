import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        this.add.text(width / 2, height / 2, 'Loading...', {
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5);
    }

    async create() {
        await this.loadDynamicAssets();
    }

    async loadDynamicAssets() {
        const types = ['characters', 'sleds', 'hats'];

        try {
            for (const type of types) {
                const res = await fetch(`/api/cosmetics/${type}`);
                const data = await res.json();
                this.registry.set(`${type}_data`, data.items);
                console.log(`Loaded ${type} metadata`);
            }
            
            // No actual files to load for emojis, so we proceed
            this.scene.start('MainMenuScene');
        } catch (err) {
            console.error('Error loading assets:', err);
            this.scene.start('MainMenuScene');
        }
    }
}
