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

        this.health = 3;
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

        if (!(this.scene.ability_active && this.scene.ability == 'Invisibility')) {
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

        if (this.health <= 0) {
            this.destroy(this.scene);
        }

    }

    takeDamage() {
        this.health--;
    }

    takeFullDamage() {
        this.health = 0;
    }

    
    destroy(fromScene) {
        console.log(`Druid Destroying enemy at (${this.x.toFixed(2)}, ${this.y.toFixed(2)})`);
        super.destroy(fromScene);
    }
}