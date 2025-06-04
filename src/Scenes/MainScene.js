class MainScene extends Phaser.Scene {
    constructor() {
        super("mainScene");
    }

    preload() {
        this.load.setPath("./assets/");
        this.load.spritesheet("tilemap_sheet", "tilemap_packed.png", {
            frameWidth: 16,
            frameHeight: 16
        });
    }

    create() {

    }

    update() {

    }
}
