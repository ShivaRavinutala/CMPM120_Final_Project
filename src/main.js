"use strict"

// game config
let config = {
    parent: 'phaser-game',
    type: Phaser.CANVAS,
    render: {
        pixelArt: true,
        render: {
            pixelArt: true,
            antialias: false,
            antialiasGL: false,
        },
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: {
                x: 0,
                y: 0
            }
        }
    },
    width: 800,
    height: 800,
    scene: [AbilitySelect, Level1, Level2, Level3, BossLevel]
}

var cursors;
const SCALE = 2.5;
var my = {sprite: {}, text: {}};

 const game = new Phaser.Game(config);