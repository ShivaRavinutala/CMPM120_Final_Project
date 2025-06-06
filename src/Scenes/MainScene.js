class EnemyA extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, "tilemap_sheet", 86).setScale(3.0);
        this.health = 3;
        this.speed = 3; 

        console.log(`[EnemyA] Constructor: Creating enemy at (${x}, ${y})`);
        scene.add.existing(this);
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);

        if (!this.scene || !this.scene.player || !this.scene.player.active) {
            return;
        }

        const dx = this.scene.player.x - this.x;
        const dy = this.scene.player.y - this.y;
        const angle = Math.atan2(dy, dx);


        this.x += Math.cos(angle) * this.speed; 
        this.y += Math.sin(angle) * this.speed;

       
    }

    
    destroy(fromScene) {
        console.log(`[EnemyA] Destroying enemy at (${this.x.toFixed(2)}, ${this.y.toFixed(2)})`);
        super.destroy(fromScene);
    }
}

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
        this.load.image("tilemap_packed", "tilemap_packed.png");
        this.load.tilemapTiledJSON("dungeon1", "dungeon1.json");
    }

    create() {
        
        this.map = this.add.tilemap("dungeon1",16,16, 25,25,); 
        this.tileset = this.map.addTilesetImage("tilemap_packed", "tilemap_packed");
        this.groundLayer = this.map.createLayer("Ground", this.tileset, 0, 0);
        this.groundLayer.setScale(3.0);
        this.boundaryLayer = this.map.createLayer("Boundary", this.tileset, 0, 0);
        this.boundaryLayer.setScale(3.0);
        // Player
        this.player = this.physics.add.sprite(100, 100, "tilemap_sheet", 97).setScale(3.0);
        this.player.setCollideWorldBounds(true);

        // Controls
        this.aKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.lives = 3;

        // Enemy Group
        this.enemyGroup = this.add.group({});

        const enemyX = 400;
        const enemyY = 300;
        const newEnemy = new EnemyA(this, enemyX, enemyY);
        this.enemyGroup.add(newEnemy);
        


    }

    update(time, delta) {
       

        this.playerMovement(this.playerSpeed);

        const enemies = this.enemyGroup.getChildren();
        if (enemies.length > 0) {
        }

        enemies.forEach((enemy, index) => {
            if (!enemy || !enemy.active) {
              
                return; 
            }


            if (Phaser.Geom.Intersects.RectangleToRectangle(enemy.getBounds(), this.player.getBounds())) {
                console.warn(`[MainScene] Update: Collision detected between player and enemy at (${enemy.x.toFixed(2)}, ${enemy.y.toFixed(2)})!`);
                this.lives -= 1;
                console.log(`[MainScene] Update: Player lives remaining: ${this.lives}`);
                enemy.destroy(); 
                console.log(`[MainScene] Update: Enemy destroyed. Remaining enemies in group: ${this.enemyGroup.getLength()}`);
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

        if (this.aKey.isDown || this.dKey.isDown || this.wKey.isDown || this.sKey.isDown) {
            this.player.body.velocity.normalize().scale(speed);
        }
    }
}
