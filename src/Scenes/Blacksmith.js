class Blacksmith extends Phaser.GameObjects.Sprite {

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

        this.state = Blacksmith.STATES.CHASING;
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
        if (distanceToPlayer <= this.attackRange && time - this.lastAttackTime > this.attackCooldown && !(this.scene.ability_active && this.scene.ability == 'Invisibility')) {
            this.throwWeaponAtPlayer(player);
        }


        // --- Movement Logic ---
        // Always chase, even when attacking
        if (time - this.lastPathRecalculation > this.pathRecalculationInterval && !(this.scene.ability_active && this.scene.ability == 'Invisibility')) {
            this.updatePath(player);
            this.lastPathRecalculation = time;
        }

        if (this.health <= 0) {
            this.destroy(this.scene);
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

    takeDamage() {
        this.health--;
    }

    takeFullDamage() {
        this.health = 0;
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