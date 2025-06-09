class Viking extends Phaser.GameObjects.Sprite {

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

        this.state = Viking.STATES.CHASING;
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

        if (this.state === Viking.STATES.CHASING &&
            distanceToPlayer <= dashRange &&
            time - this.lastDashTime > this.dashCooldown) {
            this.dashAtPlayer(player);
        }

        switch (this.state) {
            case Viking.STATES.CHASING:
                if (time - this.lastPathRecalculation > this.pathRecalculationInterval) {
                    this.updatePath(player);
                    this.lastPathRecalculation = time;
                }
                break;
            case Viking.STATES.DASHING:
                break;
            case Viking.STATES.STUNNED:
                break;
        }

        if (this.health <= 0) {
            this.destroy(this.scene);
        }
    }

    updatePath(player) {
        if (!player || this.state !== Viking.STATES.CHASING) return;

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

        if (this.state !== Viking.STATES.CHASING) {
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

        this.state = Viking.STATES.DASHING;
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
        this.state = Viking.STATES.STUNNED;
        this.body.setVelocity(0, 0);
        this.weapon.setVisible(false);

        this.scene.time.delayedCall(this.stunDuration, () => {
            this.state = Viking.STATES.CHASING;
        });
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
        if (this.weapon) {
            this.weapon.destroy();
        }
        super.destroy(fromScene);
    }
}