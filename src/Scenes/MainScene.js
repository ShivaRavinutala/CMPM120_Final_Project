class EnemyB extends Phaser.GameObjects.Sprite {

    static STATES = {
        CHASING: 'chasing',
    };

    constructor(scene, x, y) {
        super(scene, x, y, "tilemap_sheet", 86).setScale(3.0);

        this.health = 2; 
        this.speed = 2.0;
        this.spriteScale = 3.0;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.state = EnemyB.STATES.CHASING;
        this.lastPathRecalculation = 0;
        this.pathRecalculationInterval = 1500; 

        // Attack properties
        this.lastAttackTime = -5000;
        this.attackCooldown = 3000; // 3 seconds between throws
        this.attackRange = 6 * (this.scene.map.tileWidth * this.spriteScale); // 6 tiles
        this.weaponSpeed = 400; // Speed of the thrown weapon

        // Array to keep track of active projectiles
        this.projectiles = [];

        this.finder = new EasyStar.js();
        const grid = [];
        for (let gridY = 0; gridY < scene.map.height; gridY++) {
            const col = [];
            for (let gridX = 0; gridX < scene.map.width; gridX++) {
                const tile = scene.groundLayer.getTileAt(gridX, gridY);
                col.push(tile ? tile.index : -1);
            }
            grid.push(col);
        }
        this.finder.setGrid(grid);

        let walkables = [48, 49, 50, 51, 52, 53, 42];
        this.finder.setAcceptableTiles(walkables);

        for (let tileID = scene.tileset.firstgid; tileID < scene.tileset.total; tileID++) {
            let props = scene.tileset.getTileProperties(tileID);
            if (props && props.cost != null) {
                this.finder.setTileCost(tileID, props.cost);
            }
        }
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        const player = this.scene.player;

        if (!player || !player.active || !this.active) {
            if (this.moveTween) this.moveTween.stop();
            this.projectiles.forEach(p => p.destroy());
            return;
        }

        // --- Handle Projectiles ---
        this.projectiles = this.projectiles.filter(weapon => {
            // Destroy projectile if it flies too far
            if (Phaser.Math.Distance.Between(this.x, this.y, weapon.x, weapon.y) > this.attackRange + 50) {
                weapon.destroy();
                return false;
            }
            return weapon.active;
        });


        const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        // --- Attack Logic ---
        if (distanceToPlayer <= this.attackRange && time - this.lastAttackTime > this.attackCooldown) {
            this.throwWeaponAtPlayer(player);
        }


        // --- Movement Logic ---
        // Always chase, even when attacking
        if (time - this.lastPathRecalculation > this.pathRecalculationInterval) {
            this.updatePath(player);
            this.lastPathRecalculation = time;
        }
    }

    throwWeaponAtPlayer(player) {
        if (!player.active) return;

        this.lastAttackTime = this.scene.time.now;

        // Stop moving briefly to attack
        if (this.moveTween) {
            this.moveTween.stop();
        }

        // Create the weapon projectile
        const weapon = this.scene.physics.add.sprite(this.x, this.y, 'tilemap_sheet', 117);
        weapon.setScale(this.spriteScale).setOrigin(0.5, 0.5);

        this.projectiles.push(weapon);

        // Add overlap check between this specific weapon and the player
        this.scene.physics.add.overlap(player, weapon, (playerRef, weaponRef) => {
            // Deal damage or other effect here
            console.log("Player hit by weapon!");
            this.scene.lives--;
            weaponRef.destroy(); // Destroy weapon on hit
        });

        // Launch the weapon
        this.scene.physics.moveToObject(weapon, player, this.weaponSpeed);

        // Set the weapon's rotation to face the player
        weapon.rotation = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    }

    updatePath(player) {
        if (!player) return;

        const TILE_WORLD_SIZE = this.scene.map.tileWidth * this.spriteScale;
        const fromTileX = Math.floor(this.x / TILE_WORLD_SIZE);
        const fromTileY = Math.floor(this.y / TILE_WORLD_SIZE);
        const toTileX = Math.floor(player.x / TILE_WORLD_SIZE);
        const toTileY = Math.floor(player.y / TILE_WORLD_SIZE);

        this.finder.findPath(fromTileX, fromTileY, toTileX, toTileY, (path) => {
            if (path !== null) {
                this.followPath(path);
            }
        });
        this.finder.calculate();
    }

    followPath(path) {
        if (this.moveTween) {
            this.moveTween.stop();
        }

        const TILE_WORLD_SIZE = this.scene.map.tileWidth * this.spriteScale;
        const tweens = [];
        for (let i = 0; i < path.length; i++) {
            tweens.push({
                x: path[i].x * TILE_WORLD_SIZE + (TILE_WORLD_SIZE / 2),
                y: path[i].y * TILE_WORLD_SIZE + (TILE_WORLD_SIZE / 2),
                duration: 1000 / this.speed,
            });
        }

        if (tweens.length > 0) {
            this.moveTween = this.scene.tweens.chain({
                targets: this,
                tweens: tweens
            });
        }
    }

    destroy(fromScene) {
        if (this.moveTween) this.moveTween.stop();
        this.scene.tweens.killTweensOf(this);
        // Clean up any remaining projectiles
        this.projectiles.forEach(p => p.destroy());
        this.projectiles = [];

        super.destroy(fromScene);
    }
}
class EnemyA extends Phaser.GameObjects.Sprite {

    static STATES = {
        CHASING: 'chasing',
        DASHING: 'dashing',
        STUNNED: 'stunned',
    };

    constructor(scene, x, y) {
        // Call the Sprite constructor
        super(scene, x, y, "tilemap_sheet", 87).setScale(3.0);

        this.health = 3;
        this.speed = 2.5;
        this.dashSpeed = 2;
        this.spriteScale = 3.0;

        // Add the enemy sprite itself to the scene and physics engine
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.state = EnemyA.STATES.CHASING;
        this.lastPathRecalculation = 0;
        this.pathRecalculationInterval = 2000;
        this.lastDashTime = -5000;
        this.dashCooldown = 4500;
        this.stunDuration = 1500;

        // Weapon setup - created as a separate sprite in the scene
        this.weapon = scene.add.sprite(this.x, this.y, 'tilemap_sheet', 118).setScale(this.spriteScale);
        this.weapon.setOrigin(0.5, 1.25);
        this.weapon.setVisible(false); // Hide it initially

        this.finder = new EasyStar.js();
        const grid = [];
        for (let gridY = 0; gridY < scene.map.height; gridY++) {
            const col = [];
            for (let gridX = 0; gridX < scene.map.width; gridX++) {
                const tile = scene.groundLayer.getTileAt(gridX, gridY);
                col.push(tile ? tile.index : -1);
            }
            grid.push(col);
        }
        this.finder.setGrid(grid);

        let walkables = [48, 49, 50, 51, 52, 53, 42];
        this.finder.setAcceptableTiles(walkables);

        for (let tileID = scene.tileset.firstgid; tileID < scene.tileset.total; tileID++) {
            let props = scene.tileset.getTileProperties(tileID);
            if (props && props.cost != null) {
                this.finder.setTileCost(tileID, props.cost);
            }
        }
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        const player = this.scene.player;

        if (!player || !player.active || !this.active) {
            if (this.moveTween) this.moveTween.stop();
            return;
        }

        const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const TILE_WORLD_SIZE = this.scene.map.tileWidth * this.spriteScale;
        const dashRange = 4 * TILE_WORLD_SIZE;

        if (this.state === EnemyA.STATES.CHASING &&
            distanceToPlayer <= dashRange &&
            time - this.lastDashTime > this.dashCooldown) {
            this.dashAtPlayer(player);
        }

        switch (this.state) {
            case EnemyA.STATES.CHASING:
                if (time - this.lastPathRecalculation > this.pathRecalculationInterval) {
                    this.updatePath(player);
                    this.lastPathRecalculation = time;
                }
                break;
            case EnemyA.STATES.DASHING:
                break;
            case EnemyA.STATES.STUNNED:
                break;
        }
    }

    updatePath(player) {
        if (!player || this.state !== EnemyA.STATES.CHASING) return;

        const TILE_WORLD_SIZE = this.scene.map.tileWidth * this.spriteScale;
        const fromTileX = Math.floor(this.x / TILE_WORLD_SIZE);
        const fromTileY = Math.floor(this.y / TILE_WORLD_SIZE);
        const toTileX = Math.floor(player.x / TILE_WORLD_SIZE);
        const toTileY = Math.floor(player.y / TILE_WORLD_SIZE);

        this.finder.findPath(fromTileX, fromTileY, toTileX, toTileY, (path) => {
            if (path !== null) {
                this.followPath(path);
            }
        });
        this.finder.calculate();
    }

    followPath(path) {
        if (this.moveTween) {
            this.moveTween.stop();
        }

        if (this.state !== EnemyA.STATES.CHASING) {
            return;
        }

        const TILE_WORLD_SIZE = this.scene.map.tileWidth * this.spriteScale;
        const tweens = [];
        for (let i = 0; i < path.length; i++) {
            tweens.push({
                x: path[i].x * TILE_WORLD_SIZE + (TILE_WORLD_SIZE / 2),
                y: path[i].y * TILE_WORLD_SIZE + (TILE_WORLD_SIZE / 2),
                duration: 1000 / this.speed,
            });
        }

        if (tweens.length > 0) {
            this.moveTween = this.scene.tweens.chain({
                targets: this,
                tweens: tweens
            });
        }
    }

    dashAtPlayer(player) {
        if (this.moveTween) {
            this.moveTween.stop();
        }

        this.state = EnemyA.STATES.DASHING;
        this.lastDashTime = this.scene.time.now;

        this.weapon.setPosition(this.x, this.y);
        this.weapon.setVisible(true);
        const angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        this.weapon.rotation = angleToPlayer;

        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const duration = (distance / this.dashSpeed) * 16.67;

        this.scene.tweens.add({
            targets: [this, this.weapon], // Tween both the enemy and the weapon
            x: player.x,
            y: player.y,
            duration: Math.max(200, duration),
            ease: 'Power2',
            onComplete: () => {
                this.getStunned();
            }
        });
    }

    getStunned() {
        this.state = EnemyA.STATES.STUNNED;
        this.body.setVelocity(0, 0);
        this.weapon.setVisible(false);

        this.scene.time.delayedCall(this.stunDuration, () => {
            this.state = EnemyA.STATES.CHASING;
        });
    }

    destroy(fromScene) {
        if (this.moveTween) this.moveTween.stop();
        this.scene.tweens.killTweensOf(this);
        if (this.weapon) {
            this.weapon.destroy();
        }
        super.destroy(fromScene);
    }
}


class Druid extends Phaser.GameObjects.Sprite{
    constructor(scene, x, y) {
        super(scene, x, y, "tilemap_sheet", 84).setScale(3.0);
        this.health = 5;
        this.speed = 2; 

        console.log(`Druid Constructor: Creating enemy at (${x}, ${y})`);
        scene.add.existing(this);

        this.cooldown = 0;

        this.finder = new EasyStar.js();

        const grid = [];
        for (let y = 0; y < this.scene.map.height; y++) {
            const col = [];
            for (let x = 0; x < this.scene.map.width; x++) {
                const tile = this.scene.groundLayer.getTileAt(x, y);
                col.push(tile ? tile.index : -1);
            }
            grid.push(col);
        }
        this.finder.setGrid(grid);

        let walkables = [48, 49, 50, 51, 52, 53, 42];

        this.finder.setAcceptableTiles(walkables);

        for (let tileID = this.scene.tileset.firstgid; tileID < this.scene.tileset.total; tileID++) {
            let props = this.scene.tileset.getTileProperties(tileID);
            if (props && props.cost != null) {
                this.finder.setTileCost(tileID, props.cost);
            }
        }

        this.lastAttackTime = 0;
        this.attackInterval = 7000;

        this.reachedSafeSpot = false;

        this.potions = [];
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);

        if (!this.scene || !this.scene.player || !this.scene.player.active) {
            return;
        }
    }

    async moveToSafeSpot(player) {
        const TILE_SIZE = 16;
        const SCALE = 3;
        const TILE_WORLD_SIZE = TILE_SIZE * SCALE;
        const tileX = Math.floor(this.x / TILE_WORLD_SIZE);
        const tileY = Math.floor(this.y / TILE_WORLD_SIZE);
        const mapWidth = this.scene.map.width;
        const mapHeight = this.scene.map.height;

        const target = await this.findSafeSpot(player); // <-- wait for a valid safe spot
        if (!target) {
            console.warn("No safe spot found.");
            return;
        }

        const [targetX, targetY] = target;

        // Debug logging
        //console.log(`Druid tile: (${tileX}, ${tileY}) -> Target tile: (${targetX}, ${targetY})`);

        if (
            tileX < 0 || tileX >= mapWidth ||
            tileY < 0 || tileY >= mapHeight ||
            targetX < 0 || targetX >= mapWidth ||
            targetY < 0 || targetY >= mapHeight
        ) {
            console.warn("Pathfinding skipped due to out-of-bounds coordinates.");
            return;
        }

        this.finder.findPath(tileX, tileY, targetX, targetY, (path) => {
            if (path === null) {
                console.warn("Path was not found.");
            } else {
                console.log(path);
                this.followPath(path, this);
            }
        });

        this.finder.calculate();
    }


    findSafeSpot(player) {
        const TILE_SIZE = 16;
        const SCALE = 3;
        const TILE_WORLD_SIZE = TILE_SIZE * SCALE;

        const tileX = Math.floor(this.x / TILE_WORLD_SIZE);
        const tileY = Math.floor(this.y / TILE_WORLD_SIZE);
        //const player = this.scene.player;
        const playerTileX = Math.floor(player.x / TILE_WORLD_SIZE);
        const playerTileY = Math.floor(player.y / TILE_WORLD_SIZE);

        const mapWidth = this.scene.map.width;
        const mapHeight = this.scene.map.height;

        const candidates = [];

        // 5x5 area centered on the player
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                const tx = playerTileX + dx;
                const ty = playerTileY + dy;

                // Skip center tile (where player is)
                if (dx === 0 && dy === 0) continue;

                if (tx >= 0 && tx < mapWidth && ty >= 0 && ty < mapHeight) {
                    candidates.push([tx, ty]);
                }
            }
        }

        // Shuffle the candidates so we try a random spot each time
        Phaser.Utils.Array.Shuffle(candidates);

        return new Promise((resolve, reject) => {
            const tryNext = () => {
                if (candidates.length === 0) {
                    console.warn("No valid safe spot found.");
                    resolve(null);
                    return;
                }

                const [targetX, targetY] = candidates.pop();

                this.finder.findPath(tileX, tileY, targetX, targetY, (path) => {
                    if (path === null) {
                        // Try next
                        tryNext();
                    } else {
                        // Found a valid spot
                        resolve([targetX, targetY]);
                    }
                });

                this.finder.calculate(); // Triggers the pathfinding
            };

            tryNext();
        });
    }



    followPath(path, enemy) {
        //if (path.length < 4) return;
        console.log(path);

        var tweens = [];
        for(var i = 0; i < path.length-1; i++){
            var ex = path[i+1].x;
            var ey = path[i+1].y;
            tweens.push({
                x: ex*this.scene.map.tileWidth*3 + 24,
                y: ey*this.scene.map.tileHeight*3 + 24,
                duration: 200
            });
        }
    
        this.reachedSafeSpot = false;

        this.scene.tweens.chain({
            targets: enemy,
            tweens: tweens,
            onComplete: () => {
                this.reachedSafeSpot = true;
                console.log("Druid reached safe spot");
            }
        });
    }


    snipePlayer(player) {
        const potion = this.scene.physics.add.sprite(this.x, this.y, 'tilemap_sheet', 114);
        potion.setScale(3.0);
        this.scene.physics.moveToObject(potion, player, 300);
        this.potions.push(potion);
    }

    createPuddle(x, y) {
        const puddle = this.scene.add.sprite(x, y, 'tilemap_sheet', 61);
        this.scene.physics.add.existing(puddle);
        puddle.setDepth(10);
        puddle.setScale(3.0);

        this.scene.physics.add.overlap(this.scene.player, puddle, () => {
            this.scene.lives--;
        });

        this.scene.time.delayedCall(5000, () => puddle.destroy());
    }

    update(time, delta, player) {
        if (this.cooldown > 0) {
            this.cooldown--;
        }

        if (!player || !player.active) return;

        if (this.shouldMove) {
            this.shouldMove = false;
            let playerTileX = Math.floor(player.x / (16*3));
            let playerTileY = Math.floor(player.y / (16*3));
            console.log("In enemy update: ", playerTileX, playerTileY);
            this.moveToSafeSpot(player);
        }

        if (time - this.lastAttackTime >= this.attackInterval) {
            this.lastAttackTime = time;
            this.shouldMove = true;
        }

        if (this.reachedSafeSpot && (Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= (4 * 16 * 3)) && (this.cooldown === 0)) {
            this.snipePlayer(player);
            this.cooldown = 50;
        }

        this.potions = this.potions.filter(potion => {
            const dist = Phaser.Math.Distance.Between(potion.x, potion.y, this.x, this.y);
            console.log(dist, 4 * 16 * 3);
            if (dist > 4 * 16 * 3) {  // 4 tiles
                this.createPuddle(potion.x, potion.y);
                potion.destroy();
                return false;
            }

            this.scene.physics.add.overlap(this.scene.player, potion, () => {
                this.scene.lives--;
                potion.destroy();
            });
            return true;
        });

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
        const newEnemy = new EnemyB(this, enemyX, enemyY);
        this.enemyGroup.add(newEnemy);
        this.cameras.main.setDeadzone(200, 200);
        this.cameras.main.startFollow(this.player);


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
