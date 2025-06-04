class MainScene extends Phaser.Scene {
    constructor() {
        super("mainScene");
    }

    init() {
        this.playerSpeed = 200;
    }

    preload() {
        this.load.setPath("./assets/");
        this.load.spritesheet("tilemap_sheet", "tilemap_packed.png", {
            frameWidth: 16,
            frameHeight: 16
        });
    }

    create() {
        // player movement code

        this.player = this.physics.add.sprite(100, 100, "tilemap_sheet", 97).setScale(3.0);
        this.player.setCollideWorldBounds(true);

        this.aKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // end of player movement code
    }

    update() {
        this.playerMovement(this.playerSpeed);
    }

    playerMovement(speed) {
        this.player.setVelocity(0);

        if (this.aKey.isDown) {
            this.player.setVelocityX(-speed);
        } else if (this.dKey.isDown) {
            this.player.setVelocityX(speed);
        }

        if (this.wKey.isDown) {
            this.player.setVelocityY(-speed);
        } else if (this.sKey.isDown) {
            this.player.setVelocityY(speed);
        }

        this.player.body.velocity.normalize().scale(speed);
    }
}