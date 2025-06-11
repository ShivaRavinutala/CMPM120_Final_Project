class Boss extends Phaser.GameObjects.Sprite {

    static STATES = {
        CHASING: 'chasing',
        DASHING: 'dashing',
        THROWING: 'throwing', 
        STUNNED: 'stunned',
    };

    constructor(scene, x, y, level = 1) {
        super(scene, x, y, "tilemap_sheet", 87).setScale(3.0);

        this.level = level;
        this.maxHealth = 15;
        this.health = this.maxHealth;
        this.phase = 1; 
        this.spriteScale = 3.0;
        this.speed = 2.5;
        this.dashSpeed = 2.25;

        this.state = Boss.STATES.CHASING;
        this.lastPathRecalculation = 0;
        this.pathRecalculationInterval = 1500;
        this.stunDuration = 1500;

        this.dashCount = 0;
        this.lastDashTime = -8000;
        this.shortDashCooldown = 500;
        this.longDashCooldown = 4500;

        // Phase 2 (Level 2+) ability
        this.tileSpawnHealthThreshold = this.maxHealth - 4;
        this.hasSpawnedHazardZones = false;
        this.hazardZoneProjectiles = [];

        // Phase 3 (Level 3 only) ability
        this.phase2HealthThreshold = this.maxHealth - 4;
        this.phase3HealthThreshold = this.maxHealth - 8;
        this.lastThrowTime = -5000;
        this.throwingCooldown = 3500;
        this.weaponSpeed = 400; 
        this.throwRange = 600; 
        this.thrownWeapons = []; 

        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.body.setSize(this.width * 0.5, this.height * 0.5);

        this.weapon = scene.add.sprite(this.x, this.y, 'tilemap_sheet', 118).setScale(this.spriteScale);
        this.weapon.setOrigin(0.5, 1.25);
        this.weapon.setVisible(false);
        this.weapon.setDepth(this.depth + 1);

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

        this.walkables = [48, 49, 50, 51, 52, 53, 42]; 
        this.finder.setAcceptableTiles(this.walkables);

        for (let tileID = scene.tileset.firstgid; tileID < scene.tileset.total; tileID++) {
            let props = scene.tileset.getTileProperties(tileID);
            if (props && props.cost != null) {
                this.finder.setTileCost(tileID, props.cost);
            }
        }
    }
    
    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        
        this.thrownWeapons = this.thrownWeapons.filter(weapon => {
            if (weapon.active && Phaser.Math.Distance.Between(this.x, this.y, weapon.x, weapon.y) > this.throwRange) {
                weapon.destroy();
                return false;
            }
            return weapon.active;
        });

        const player = this.scene.player;

        if (!player || !player.active || !this.active) {
            if (this.moveTween) this.moveTween.stop();
            this.body.setVelocity(0, 0);
            return;
        }

        const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const TILE_WORLD_SIZE = this.scene.map.tileWidth * this.spriteScale;
        const dashRange = 5 * TILE_WORLD_SIZE;
        const throwAttackRange = 8 * TILE_WORLD_SIZE; 

        // Phase 3: Cone attack
        if (this.level === 3 && this.phase === 3 &&
            this.state === Boss.STATES.CHASING &&
            distanceToPlayer <= throwAttackRange &&
            time - this.lastThrowTime > this.throwingCooldown) {
            this.throwWeapons();
        }
        // Phase 1: Dash attack
        else if (this.state === Boss.STATES.CHASING &&
            distanceToPlayer <= dashRange &&
            time - this.lastDashTime > this.longDashCooldown) {
            this.startDashSequence(player);
        }

        switch (this.state) {
            case Boss.STATES.CHASING:
                if (time - this.lastPathRecalculation > this.pathRecalculationInterval) {
                    this.updatePath(player);
                    this.lastPathRecalculation = time;
                }
                break;
            case Boss.STATES.DASHING:
            case Boss.STATES.THROWING:
            case Boss.STATES.STUNNED:
                break;
        }

        if (this.health <= 0) {
            this.destroy();
        }
    }

    startDashSequence(player) {
        this.state = Boss.STATES.DASHING;
        if (this.moveTween) this.moveTween.stop();
        this.dashCount = 0;

        this.performDash(player, () => {
            this.scene.time.delayedCall(this.shortDashCooldown, () => {
                if (!this.active) return;
                this.performDash(this.scene.player, () => {
                    this.getStunned();
                    this.lastDashTime = this.scene.time.now;
                });
            });
        });
    }

    performDash(player, onCompleteCallback) {
        if (!player || !player.active) {
            this.getStunned();
            return;
        }
        this.dashCount++;

        this.weapon.setPosition(this.x, this.y).setVisible(true);
        const angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        this.weapon.rotation = angleToPlayer + Math.PI / 2;

        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const duration = (distance / this.dashSpeed) * 16.67;

        this.scene.tweens.add({
            targets: [this, this.weapon],
            x: player.x,
            y: player.y,
            duration: Math.max(250, duration),
            ease: 'Power2',
            onComplete: onCompleteCallback
        });
    }

    throwWeapons() {
        if (this.state !== Boss.STATES.CHASING) return;
    
        this.state = Boss.STATES.THROWING;
        this.lastThrowTime = this.scene.time.now;
        if (this.moveTween) this.moveTween.stop();
    
        const player = this.scene.player;
        if (!player || !player.active) {
            this.state = Boss.STATES.CHASING; 
            return;
        }
    
        if (!this.scene.enemyProjectiles) {
            console.warn("Scene is missing 'enemyProjectiles' group for boss attack.");
            this.state = Boss.STATES.CHASING;
            return;
        }
    
        const angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        const throwAngleOffset = Phaser.Math.DegToRad(25);
    
        const angles = [
            angleToPlayer - throwAngleOffset, 
            angleToPlayer,                     
            angleToPlayer + throwAngleOffset 
        ];
    
        angles.forEach(angle => {
            const projectile = this.scene.physics.add.sprite(this.x, this.y, 'tilemap_sheet', 117);
            this.scene.enemyProjectiles.add(projectile);
            
            projectile.setScale(this.spriteScale * 0.8).setDepth(this.depth - 1);
            projectile.rotation = angle;
    
            this.scene.physics.velocityFromRotation(angle, this.weaponSpeed, projectile.body.velocity);
            this.thrownWeapons.push(projectile);
        });
    
        this.scene.time.delayedCall(500, () => {
            if (this.active) {
                this.state = Boss.STATES.CHASING;
            }
        });
    }

    spawnHazardZones() {
        if (!this.scene.enemyProjectiles) {
            console.warn("Scene is missing 'enemyProjectiles' group for boss hazard zone attack.");
            return;
        }
        
        const walkableTiles = [];
        const TILE_WORLD_SIZE = this.scene.map.tileWidth * this.spriteScale;

        for (let y = 0; y < this.scene.map.height; y++) {
            for (let x = 0; x < this.scene.map.width; x++) {
                const tile = this.scene.groundLayer.getTileAt(x, y);
                if (tile && this.walkables.includes(tile.index)) {
                     walkableTiles.push({
                        x: x * TILE_WORLD_SIZE + (TILE_WORLD_SIZE / 2),
                        y: y * TILE_WORLD_SIZE + (TILE_WORLD_SIZE / 2)
                    });
                }
            }
        }
        
        const numHazards = Math.min(walkableTiles.length, 15); 
        if (walkableTiles.length > 0) {
            for (let i = 0; i < numHazards; i++) {
                const pos = Phaser.Math.RND.pick(walkableTiles);
                
                const index = walkableTiles.indexOf(pos);
                if (index > -1) {
                    walkableTiles.splice(index, 1);
                }

                const hazardSprite = this.scene.enemyProjectiles.create(pos.x, pos.y, 'tilemap_sheet', 117);
                hazardSprite.setScale(this.spriteScale).setAlpha(0.75).setImmovable(true);
                this.hazardZoneProjectiles.push(hazardSprite);
            }
        }
    }

    getStunned() {
        this.state = Boss.STATES.STUNNED;
        this.body.setVelocity(0, 0);
        this.weapon.setVisible(false);
        if (this.moveTween) this.moveTween.stop();

        this.scene.time.delayedCall(this.stunDuration, () => {
            if (this.active) {
                this.state = Boss.STATES.CHASING;
                this.lastPathRecalculation = 0;
            }
        });
    }

    updatePath(player) {
        if (!player || this.state !== Boss.STATES.CHASING) return;

        const TILE_WORLD_SIZE = this.scene.map.tileWidth * this.spriteScale;
        const fromTileX = Math.floor(this.x / TILE_WORLD_SIZE);
        const fromTileY = Math.floor(this.y / TILE_WORLD_SIZE);
        const toTileX = Math.floor(player.x / TILE_WORLD_SIZE);
        const toTileY = Math.floor(player.y / TILE_WORLD_SIZE);

        this.finder.findPath(fromTileX, fromTileY, toTileX, toTileY, (path) => {
            if (path !== null && path.length > 1) {
                this.followPath(path);
            }
        });
        this.finder.calculate();
    }

    followPath(path) {
        if (this.moveTween) this.moveTween.stop();
        if (this.state !== Boss.STATES.CHASING) return;

        const TILE_WORLD_SIZE = this.scene.map.tileWidth * this.spriteScale;
        const tweens = [];
        for (let i = 1; i < path.length; i++) {
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

    triggerPhaseChangeEffects() {
        if (this.scene) {
            const player = this.scene.player;
            if (player) {
                const TILE_WORLD_SIZE = this.scene.map.tileWidth * this.spriteScale;
                const distanceToMove = 3 * TILE_WORLD_SIZE;
                const angle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
                let newX = this.x + Math.cos(angle) * distanceToMove;
                let newY = this.y + Math.sin(angle) * distanceToMove;
                const gameWidth = this.scene.sys.game.config.width;
                const gameHeight = this.scene.sys.game.config.height;
                newX = Phaser.Math.Clamp(newX, 50, gameWidth - 50);
                newY = Phaser.Math.Clamp(newY, 50, gameHeight - 50);
                this.setPosition(newX, newY);
                this.weapon.setPosition(newX, newY);
            }
        }

        if (this.moveTween) {
            this.moveTween.stop();
        }
        this.body.setVelocity(0, 0);
        this.lastPathRecalculation = 0;
    }

    takeDamage(amount = 1) {
        if (this.health <= 0) return;

        this.health -= amount;

        this.scene.tweens.add({
            targets: this,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                if(this.active){
                   this.setAlpha(1.0);
                }
            }
        });

        // Phase 2 transition (Level 2+ boss)
        if (this.level >= 2 && !this.hasSpawnedHazardZones && this.health <= this.tileSpawnHealthThreshold) {
            this.spawnHazardZones();
            this.hasSpawnedHazardZones = true;
        }

        // Phase 3 transition (Level 3 boss only)
        if (this.level === 3) {
            if (this.phase < 3 && this.health <= this.phase3HealthThreshold) {
                this.phase = 3;
                console.log("BOSS: PHASE 3 ACTIVATED");
                this.triggerPhaseChangeEffects();
            } else if (this.phase < 2 && this.health <= this.phase2HealthThreshold) {
                this.phase = 2;
                console.log("BOSS: PHASE 2 ACTIVATED");
                this.triggerPhaseChangeEffects();
            }
        }
    }

    takeFullDamage() {
        this.takeDamage(this.health);
    }

    destroy() {
        this.clearTint();
        this.setAlpha(1.0);
        if (this.moveTween) this.moveTween.stop();
        if (this.scene) {
            this.scene.tweens.killTweensOf(this);
        }
        if (this.weapon) this.weapon.destroy();
        this.thrownWeapons.forEach(p => { if (p.active) p.destroy()});
        this.thrownWeapons = [];
        this.hazardZoneProjectiles.forEach(proj => { if(proj.active) proj.destroy()});
        this.hazardZoneProjectiles = [];
        super.destroy();
    }
}


class BossLevel extends Phaser.Scene {
    constructor() {
        super("BossLevel");
    }

    init(data) {
        this.playerSpeed = 200;
        this.bossStage = data.cur_level || 1;
        this.remaining_abilities = data.remaining_abilities;
        this.remaining_levels = data.remaining_levels;
        this.playerCanTakeDamage = true;
        console.log(this.remaining_levels);
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
        this.map = this.add.tilemap("dungeon1", 16, 16, 25, 25);
        this.tileset = this.map.addTilesetImage("tilemap_packed", "tilemap_packed");
        this.groundLayer = this.map.createLayer("Ground", this.tileset, 0, 0);
        this.groundLayer.setScale(3.0);
        this.boundaryLayer = this.map.createLayer("Boundary", this.tileset, 0, 0);
        this.boundaryLayer.setScale(3.0);

        this.boundaryLayer.setCollisionByProperty({
            collides: true
        });

        this.player = this.physics.add.sprite(100, 100, "tilemap_sheet", 97).setScale(3.0);
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(this.player.width * 0.5, this.player.height * 0.5);

        this.sword = this.physics.add.sprite(this.player.x, this.player.y, 'tilemap_sheet', 104).setScale(3.0);
        this.sword.body.setEnable(false);

        this.aKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.lives = 3;
        this.sword_attack_active = false;
        this.attack_rotation = 0;
        this.base_sword_rotation = 0;
        this.time_last_sword = 0;

        this.boss = new Boss(this, 600, 400, this.bossStage);

        this.enemyProjectiles = this.physics.add.group({
            allowGravity: false,
        });

        this.physics.add.collider(this.player, this.boundaryLayer);
        this.physics.add.collider(this.boss, this.boundaryLayer);
        this.physics.add.overlap(this.player, this.boss, this.handlePlayerBossCollision, null, this);
        this.physics.add.overlap(this.player, this.boss.weapon, this.handlePlayerBossCollision, null, this);
        this.physics.add.overlap(this.player, this.enemyProjectiles, this.handlePlayerProjectileCollision, null, this);
        this.physics.add.overlap(this.sword, this.boss, this.handleSwordBossHit, null, this);
    }

    handleSwordBossHit(sword, boss) {
        if(this.sword_attack_active){
            sword.body.setEnable(false);
            boss.takeDamage(1);
        }
    }

    handlePlayerBossCollision(player, bossPart) {
        this.takePlayerDamage(1);
    }

    handlePlayerProjectileCollision(player, projectile) {
        this.takePlayerDamage(1);
        if (!projectile.body.immovable) {
            projectile.destroy();
        }
    }

    takePlayerDamage(damage) {
        if (!this.playerCanTakeDamage) {
            return;
        }

        this.lives -= damage;
        this.playerCanTakeDamage = false;
        this.player.setAlpha(0.5);

        if (this.lives <= 0) {
            this.scene.restart({
                cur_level: this.bossStage,
                remaining_abilities: this.remaining_abilities,
                remaining_levels: this.remaining_levels
            });
        }

        this.time.delayedCall(1000, () => {
            if(this.player.active){
                this.playerCanTakeDamage = true;
                this.player.setAlpha(1.0);
            }
        });
    }

    update(time, delta) {
        this.playerMovement(this.playerSpeed);
        this.swordAttack(time);

        if (this.boss && !this.boss.active) {
            this.boss = null;
            this.complete();
        }

        if (this.spaceKey.isDown && !this.sword_attack_active && (time - this.time_last_sword > 500)) {
            this.sword_attack_active = true;
            this.attack_rotation = -Math.PI / 4;
            this.time_last_sword = time;
            this.sword.body.setEnable(true);
        }
    }
    
    swordAttack(time) {
        if (this.sword_attack_active) {
            if (this.attack_rotation <= Math.PI / 4) {
                this.attack_rotation += 0.01 * (time - this.time_last_sword);
                this.time_last_sword = time;
            } else {
                this.sword_attack_active = false;
                this.attack_rotation = 0;
                this.sword.body.setEnable(false);
            }
        }
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

        if (this.player.body.velocity.length()) {
           this.base_sword_rotation = this.player.body.velocity.angle() + Math.PI / 2;
        }
        this.sword.rotation = this.base_sword_rotation + this.attack_rotation;
        this.sword.x = this.player.x + 50 * Math.sin(this.sword.rotation);
        this.sword.y = this.player.y - 50 * Math.cos(this.sword.rotation);
    }

    complete() {
        if (this.remaining_levels == 1) {
            this.scene.start("endScene");
        } else {
            this.scene.start("abilitySelect", {
                cur_level: this.bossStage,
                remaining_abilities: this.remaining_abilities,
                remaining_levels: this.remaining_levels
            });
        }
    }
}