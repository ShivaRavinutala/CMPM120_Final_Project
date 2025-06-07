

class Level2 extends Phaser.Scene {
    constructor() {
        super("level2");
    }
  
    init(data) {
        this.playerSpeed = 200;
        this.remaining_abilities = data.remaining_abilities;
        this.ability = data.selected_ability;
        this.remaining_levels = data.remaining_levels;
    }

    preload() {
        this.load.setPath("./assets/");
        this.load.spritesheet("tilemap_sheet", "tilemap_packed.png", {
            frameWidth: 16,
            frameHeight: 16
        });
        this.load.image("tilemap_packed", "tilemap_packed.png");
        this.load.tilemapTiledJSON("dungeon1", "dungeon1.json");
        this.load.bitmapFont('font', 'Text.png', 'Text.xml');
    }

    create() {
        // player movement code
        this.map = this.add.tilemap("dungeon1",16,16, 25,25,); 
        this.tileset = this.map.addTilesetImage("tilemap_packed", "tilemap_packed");
        this.groundLayer = this.map.createLayer("Ground", this.tileset, 0, 0);
        this.groundLayer.setScale(3.0);
        this.boundaryLayer = this.map.createLayer("Boundary", this.tileset, 0, 0);
        this.boundaryLayer.setScale(3.0);

        this.player = this.physics.add.sprite(100, 100, "tilemap_sheet", 97).setScale(3.0);
        this.player.setCollideWorldBounds(true);

        this.aKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.pKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);

        // end of player movement code

        this.lives = 3;
        this.ability_used = false;
        this.ability_time = 10000;
        this.ability_active = false;

        this.add.bitmapText(100, 100, 'font', this.ability + ': Press P', 20).setOrigin(0.5);

        // Enemy Group
        this.enemyGroup = this.add.group({});

        const enemyX = 400;
        const enemyY = 300;
        const newEnemy = new EnemyA(this, enemyX, enemyY);
        this.enemyGroup.add(newEnemy);
    }

    update(time, delta) {
        this.playerMovement(this.playerSpeed);

        // Activate ability
        if (this.pKey.isDown && !this.ability_used) {
            this.ability_used = true;
            this.ability_start = time;
            this.ability_active = true;
            if (this.ability == 'Speed Boost') {
                this.playerSpeed *= 2;
            } else if (this.ability == 'Invisiblity') {
                // Stop Following Code
            } else if (this.ability == 'One-Hit') {
                // On Attack, set enemy health to 0
            } else if (this.ability == 'Invincibility') {
                // On enemy contact, do not modify player health
            } else if (this.ability == 'Screen-Wide Damage') {
                // For loop through all enemies, and decrement health by 1
            } else if (this.ability == 'Projectile') {
                // make key active that handles projectiles
            }
        }

        // Ability finished
        if (this.ability_active && time - this.ability_start > this.ability_time) {
            this.ability_active = false;
            if (this.ability == 'Speed Boost') {
                this.playerSpeed /= 2;
            } else if (this.ability == 'Invisiblity') {
                // Resume Following Code
            } else if (this.ability == 'One-Hit') {
                // On Attack, revert to decrement health
            } else if (this.ability == 'Invincibility') {
                // On enemy contact, decrement player health
            } else if (this.ability == 'Screen-Wide Damage') {
                
            } else if (this.ability == 'Projectile') {
                // Deactivate key that shoots projectiles
            }
        }

        const enemies = this.enemyGroup.getChildren();
        if (enemies.length > 0) {
        }

        enemies.forEach((enemy, index) => {
            if (!enemy || !enemy.active) {
              
                return; 
            }


            if (Phaser.Geom.Intersects.RectangleToRectangle(enemy.getBounds(), this.player.getBounds())) {
                console.warn(`[Level2] Update: Collision detected between player and enemy at (${enemy.x.toFixed(2)}, ${enemy.y.toFixed(2)})!`);
                this.lives -= 1;
                console.log(`[Level2] Update: Player lives remaining: ${this.lives}`);
                enemy.destroy(); 
                console.log(`[Level2] Update: Enemy destroyed. Remaining enemies in group: ${this.enemyGroup.getLength()}`);
            }
        });
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

    complete() {

        // Feel free to add code above this line
        this.scene.start("BossLevel", {cur_level: 2, remaining_abilities: this.remaining_abilities, remaining_levels: this.remaining_levels});
    }
}
