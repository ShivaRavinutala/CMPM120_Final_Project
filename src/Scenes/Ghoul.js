class Ghoul extends Phaser.GameObjects.Sprite{
    constructor(scene, x, y) {
        super(scene, x, y, "tilemap_sheet", 121).setScale(3.0);
        this.health = 5;
        this.speed = 1.5; 

        console.log(`Ghoul Constructor: Creating enemy at (${x}, ${y})`);
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
        this.attackInterval = 5000;

        this.isInvisible = true;

        this.potions = [];

        this.health = 3;
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);

        if (!this.scene || !this.scene.player || !this.scene.player.active) {
            return;
        }
    }

    moveToPlayer(player) {
        const TILE_SIZE = 16;
        const SCALE = 3;
        const TILE_WORLD_SIZE = TILE_SIZE * SCALE;
        const tileX = Math.floor(this.x / TILE_WORLD_SIZE);
        const tileY = Math.floor(this.y / TILE_WORLD_SIZE);
        const mapWidth = this.scene.map.width;
        const mapHeight = this.scene.map.height;

        const target = [Math.floor(player.x / TILE_WORLD_SIZE), Math.floor(player.y / TILE_WORLD_SIZE)];

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


    followPath(path, enemy) {
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
            }
        });
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
            this.moveToPlayer(player);
        }

        if (time - this.lastAttackTime >= this.attackInterval) {
            this.lastAttackTime = time;
            this.shouldMove = true;
        }

        if ((Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= (3 * 16 * 3))) {
            this.isInvisible = false;
        } else {
            this.isInvisible = true;
        }

        if (this.isInvisible) {
            this.visible = false;
            this.scene.physics.add.overlap(this.scene.player, this, () => {
                this.scene.lives--;
            });
        } else {
            this.visible = true;
        }

        if (this.health <= 0) {
            this.destroy(this.scene);
        }

        this.lastAttackTime--;

    }

    takeDamage() {
        this.health--;
    }

    takeFullDamage() {
        this.health = 0;
    }

    
    destroy(fromScene) {
        console.log(`Ghoul Destroying enemy at (${this.x.toFixed(2)}, ${this.y.toFixed(2)})`);
        super.destroy(fromScene);
    }
}