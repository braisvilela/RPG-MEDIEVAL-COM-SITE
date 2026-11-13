
import Phaser from 'phaser';
import WorldScene from './scenes/WorldScene.js';

document.documentElement.style.margin = '0';
document.documentElement.style.padding = '0';
document.documentElement.style.width = '100%';
document.documentElement.style.height = '100%';
document.documentElement.style.overflow = 'hidden';

document.body.style.margin = '0';
document.body.style.padding = '0';
document.body.style.width = '100%';
document.body.style.height = '100%';
document.body.style.overflow = 'hidden';

const config = {
    type: Phaser.AUTO,

    parent: document.body,

    width: window.innerWidth,
    height: window.innerHeight,

    pixelArt: true,
    roundPixels: true,

    backgroundColor: '#438c38',

    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },

    scene: [WorldScene],

    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.NO_CENTER,
        width: '100%',
        height: '100%'
    }
};

const game = new Phaser.Game(config);

export default game;
