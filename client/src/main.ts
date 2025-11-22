import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import MainMenuScene from './scenes/MainMenuScene';
import HostJoinScene from './scenes/HostJoinScene';
import LobbyScene from './scenes/LobbyScene';
import GameScene from './scenes/GameScene';
import ResultsScene from './scenes/ResultsScene';
import BackgroundScene from './scenes/BackgroundScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#333333',
    roundPixels: true, // Enable global roundPixels to fix shimmering
    physics: {
        default: 'matter',
        matter: {
            debug: false, // Turn off debug for the pretty menu
            gravity: { y: 1 }
        }
    },
    scene: [
        BootScene,
        BackgroundScene, // Register BackgroundScene
        MainMenuScene,
        HostJoinScene,
        LobbyScene,
        GameScene,
        ResultsScene
    ]
};

new Phaser.Game(config);

window.addEventListener('resize', () => {
    // Handle resize if needed, reload or scale
});
