class AbilitySelect extends Phaser.Scene {
    constructor() {
        super("abilitySelect");
    }

    preload() {
        this.load.setPath("./assets/");
        this.load.bitmapFont('font', 'Text.png', 'Text.xml');
    }

    init(data) {
        if (data.remaining_abilities == null) {
            this.remaining_abilities = ['One Hit', 'Invisibility', 'Invincibility', 'Speed Boost', 'Projectile', 'Screen-Wide Damage']
        } else {
            this.remaining_abilities = data.remaining_abilities;
        }
        if (data.cur_level == null) {
            this.cur_level = 1;
        } else {
            this.cur_level = data.cur_level + 1;
        }
        if (data.remaining_levels == null) {
            this.remaining_levels = 3;
        } else {
            this.remaining_levels = data.remaining_levels - 1;
        }
    } 

    create() {
        this.width = this.sys.game.canvas.width;
        this.height = this.sys.game.canvas.height;

        let random = Math.floor(Math.random() * this.remaining_abilities.length);
        this.ability1 = this.remaining_abilities[random];
        this.remaining_abilities.splice(random, 1);

        random = Math.floor(Math.random() * this.remaining_abilities.length);
        this.ability2 = this.remaining_abilities[random];
        this.remaining_abilities.splice(random, 1);

        this.add.bitmapText(this.width/2, 120, 'font', 'Select an Ability', 20).setOrigin(0.5);
        this.add.bitmapText(this.width/2, 220, 'font', this.ability1 + ': Press A', 20).setOrigin(0.5);
        this.add.bitmapText(this.width/2, 420, 'font', this.ability2 + ': Press B', 20).setOrigin(0.5);

        this.aKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.bKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);
    }

    update(time, delta) {
        if (this.aKey.isDown) {
            this.scene.start("level" + this.cur_level, {selected_ability: this.ability1, remaining_abilities: this.remaining_abilities, remaining_levels: this.remaining_levels});
        } else if (this.bKey.isDown) {
            this.scene.start("level" + this.cur_level, {selected_ability: this.ability2, remaining_abilities: this.remaining_abilities, remaining_levels: this.remaining_levels});
        }
    }
}