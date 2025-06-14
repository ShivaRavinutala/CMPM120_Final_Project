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
        this.load.tilemapTiledJSON("dungeon2", "dungeon2.json");
        this.load.bitmapFont('font', 'Text.png', 'Text.xml');
    }

    create() {
        this.map = this.add.tilemap("dungeon2",16,16, 25,25,); 
        this.tileset = this.map.addTilesetImage("tilemap_packed", "tilemap_packed");
        this.groundLayer = this.map.createLayer("Ground", this.tileset, 0, 0);
        this.groundLayer.setScale(3.0);
        this.boundaryLayer = this.map.createLayer("Boundary", this.tileset, 0, 0);
        this.boundaryLayer.setScale(3.0);

        this.boundaryLayer.setCollisionByProperty({ collides: true });

        this.player = this.physics.add.sprite(100, 100, "tilemap_sheet", 97).setScale(3.0);
        this.player.setCollideWorldBounds(true);
        this.sword = this.add.sprite(100, 100, "tilemap_sheet", 104).setScale(3.0);
        
        this.physics.add.collider(this.player, this.boundaryLayer);

        this.aKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.pKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);

        this.lives = 3;
        this.ability_used = false;
        this.ability_time = 10000;
        this.ability_active = false;

        this.sword_attack_active = false;

        this.player_projectiles = [];

        this.time_last_sword = 0;

        this.add.bitmapText(100, 100, 'font', this.ability + ': Press P', 20).setOrigin(0.5);

        this.cameras.main.setBounds(0, 0, this.map.widthInPixels * this.groundLayer.scaleX, this.map.heightInPixels * this.groundLayer.scaleY);
        this.cameras.main.startFollow(this.player);

         this.enemyGroup = this.add.group({});

         let numRows = this.groundLayer.layer.height;
         let numCols = this.groundLayer.layer.width;
         let validCoords = [];

         for (let x = 0; x < numCols; x++) {
                for (let y = 0; y < numRows; y++) {
                    let tile = this.groundLayer.getTileAt(x,y);
                    if (tile != null && tile.properties['cost'] == 1) {
                        let worldX = 48 * x;
                        let worldY = 48 * y;
                        validCoords.push([worldX, worldY]);
                        
                    }
                }
            }
            const NUM_GHOULS = 2;
            const NUM_BLACKSMITH = 2;
            const NUM_VIKING = 2;
            const NUM_DRUID = 2;
            for (let x = 0; x < NUM_GHOULS; x++) {
                let random_pick = Math.floor(Math.random() * validCoords.length);
                const newEnemy = new Ghoul(this, validCoords[random_pick][0], validCoords[random_pick][1]);
                this.enemyGroup.add(newEnemy);
            }

            for (let x = 0; x < NUM_BLACKSMITH; x++) {
                let random_pick = Math.floor(Math.random() * validCoords.length);
                const newEnemy = new Blacksmith(this, validCoords[random_pick][0], validCoords[random_pick][1]);
                this.enemyGroup.add(newEnemy);
            }

            for (let x = 0; x < NUM_VIKING; x++) {
                let random_pick = Math.floor(Math.random() * validCoords.length);
                const newEnemy = new Viking(this, validCoords[random_pick][0], validCoords[random_pick][1]);
                this.enemyGroup.add(newEnemy);
            }

            for (let x = 0; x < NUM_DRUID; x++) {
                let random_pick = Math.floor(Math.random() * validCoords.length);
                const newEnemy = new Druid(this, validCoords[random_pick][0], validCoords[random_pick][1]);
                this.enemyGroup.add(newEnemy);
            }

    }

    update(time, delta) {
        if (this.lives <= 0) {
            this.scene.restart({
                remaining_abilities: this.remaining_abilities,
                selected_ability: this.ability,
                remaining_levels: this.remaining_levels
            });
        }
        
        const enemies = this.enemyGroup.getChildren();
        
        if (enemies.length == 0) {
            this.complete();
        }

        this.playerMovement(this.playerSpeed);

        if (this.spaceKey.isDown && !this.sword_attack_active && (time - this.time_last_sword > 500)) {
            this.sword_attack_active = true;
            this.attack_rotation = - Math.PI/4;
            this.time_last_sword = time;
        }
        this.swordAttack(time);

        if (Phaser.Input.Keyboard.JustDown(this.pKey) && this.ability_active && this.ability == 'Projectile') {
            this.projectileAttack(this.playerSpeed * 2);
        }

        if (this.pKey.isDown && !this.ability_used) {
            this.ability_used = true;
            this.ability_start = time;
            this.ability_active = true;
            if (this.ability == 'Speed Boost') {
                this.playerSpeed *= 2;
            } else if (this.ability == 'Invisibility') {
                this.player.setAlpha(0.5);
            } else if (this.ability == 'One-Hit') {
                
            } else if (this.ability == 'Invincibility') {
                this.prev_lives = this.lives;
                this.lives = 1000000;
            } else if (this.ability == 'Screen-Wide Damage') {
                enemies.forEach((enemy, index) => {
                    if (!enemy || !enemy.active) {
                        return; 
                    }
                    enemy.takeDamage();
                });
            } else if (this.ability == 'Projectile') {
            }
        }

        if (this.ability_active && time - this.ability_start > this.ability_time) {
            this.ability_active = false;
            if (this.ability == 'Speed Boost') {
                this.playerSpeed /= 2;
            } else if (this.ability == 'Invisibility') {
                this.player.setAlpha(1);
            } else if (this.ability == 'One-Hit') {
            } else if (this.ability == 'Invincibility') {
                this.lives = this.prev_lives;
            } else if (this.ability == 'Screen-Wide Damage') {
            } else if (this.ability == 'Projectile') {
            }
        }

        enemies.forEach((enemy, index) => {
            if (!enemy || !enemy.active) {
                return; 
            }

            if (Phaser.Geom.Intersects.RectangleToRectangle(enemy.getBounds(), this.player.getBounds())) {
                this.lives -= 1;
                enemy.destroy(); 
            }

            if (this.sword_attack_active) {
                if (Phaser.Geom.Intersects.RectangleToRectangle(enemy.getBounds(), this.sword.getBounds())) {
                    if (this.ability_active && this.ability == 'One-Hit') {
                        enemy.takeFullDamage();
                    } else {
                        enemy.takeDamage();
                    }
                }
            }

            for (let x = 0; x < this.player_projectiles.length; x++) {
                if (Phaser.Geom.Intersects.RectangleToRectangle(enemy.getBounds(), this.player_projectiles[x].getBounds())) {
                    enemy.takeDamage();
                }
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
        this.base_sword_rotation = this.player.body.velocity.angle() + Math.PI / 2;
        this.sword.rotation = this.base_sword_rotation + this.attack_rotation;
        this.sword.x = this.player.x + 50 * Math.sin(this.sword.rotation);
        this.sword.y = this.player.y - 50 * Math.cos(this.sword.rotation);
    }

    swordAttack(time) {
        if (this.sword_attack_active && this.attack_rotation <= Math.PI/4) {
            this.attack_rotation += 0.01 * (time - this.time_last_sword);
            this.time_last_sword = time;
        } else {
            this.sword_attack_active = false;
            this.attack_rotation = 0;
        }
    }

    projectileAttack(speed) {
        const weapon = this.physics.add.sprite(this.player.x, this.player.y, 'tilemap_sheet', 101);
        this.player_projectiles.push(weapon);
        weapon.setVelocityX(speed * Math.cos(this.player.body.velocity.angle()));
        weapon.setVelocityY(speed * Math.sin(this.player.body.velocity.angle()));
    }

    complete() {
        this.scene.start("BossLevel", {cur_level: 2, remaining_abilities: this.remaining_abilities, remaining_levels: this.remaining_levels});
    }
}
