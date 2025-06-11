class EndScene extends Phaser.Scene {
    constructor() {
        super("endScene");
    }

    preload() {
        this.load.setPath("./assets/");
        this.load.bitmapFont('font', 'Text.png', 'Text.xml');
    }

    init(data) {
    } 

    create() {
        this.width = this.sys.game.canvas.width;
        this.height = this.sys.game.canvas.height;


        this.add.bitmapText(this.width/2, 120, 'font', 'You Win! Press Space to Restart!', 20).setOrigin(0.5);

        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    update(time, delta) {
        if (this.spaceKey.isDown) {
            this.scene.start("abilitySelect");
        }
    }
}