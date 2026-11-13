
import Phaser from 'phaser';
import DamageText from './ui/DamageText.js';

export default class Monster extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, data, level, spawn) {
        super(scene, x, y, 'skeleton-idle-down-1');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.scene = scene;
        this.data = data;
        this.spawn = spawn;
        this.level = level;
        this.monsterId = data.id;

        this.isBoss = Boolean(
            data.boss?.enabled && level >= data.level.bossAt
        );

        this.monsterName = this.isBoss
            ? data.boss.name
            : data.name;

        const difference = level - data.level.min;
        const multiplier = this.isBoss
            ? data.boss.statMultiplier
            : 1;

        this.stats = {
            maxHealth: (
                data.stats.health +
                data.scaling.healthPerLevel * difference
            ) * multiplier,

            health: 0,

            physicalAttack: (
                data.stats.physicalAttack +
                data.scaling.physicalAttackPerLevel * difference
            ) * multiplier,

            physicalDefense: (
                data.stats.physicalDefense +
                data.scaling.physicalDefensePerLevel * difference
            ) * multiplier,

            magicalDefense: (
                data.stats.magicalDefense +
                data.scaling.magicalDefensePerLevel * difference
            ) * multiplier,

            moveSpeed: data.stats.moveSpeed
        };

        this.stats.health = this.stats.maxHealth;

        this.experienceReward =
            data.rewards.experience *
            (this.isBoss
                ? data.boss.experienceMultiplier
                : 1);

        this.centerX = x;
        this.centerY = y;

        this.isDead = false;
        this.isInCombat = false;
        this.isReturning = false;
        this.isAttacking = false;

        this.facing = 'down';
        this.attackRange = 40;
        this.attackCooldown = 1500;
        this.nextAttackTime = 0;
        this.combatStartedAt = 0;

        // Leash monsters to their spawn instead of allowing endless pursuit.
        this.maxChaseDistance =
            scene.map.tileWidth * 12;

        this.maxCombatDuration = 30000;

        this.loot = [];
        this.lootGenerated = false;
        this.respawnAt = null;
        this.lootCollectedAt = null;
        this.corpseHidden = false;

        this.savedRespawnTimer = null;
        this.corpseHideTimer = null;

        this.setCollideWorldBounds(true);
        this.body.setSize(20, 16);
        this.body.setOffset(22, 44);

        const distance =
            data.patrol.distance * scene.map.tileWidth;

        this.route = [
            { x: x - distance, y, direction: 'left' },
            { x, y, direction: 'right' },
            { x: x + distance, y, direction: 'right' },
            { x, y, direction: 'left' },
            { x, y: y - distance, direction: 'up' },
            { x, y, direction: 'down' },
            { x, y: y + distance, direction: 'down' },
            { x, y, direction: 'up' }
        ];

        this.routeIndex = 0;
        this.pauseUntil = 0;
        this.currentDestination = null;

        this.nameText = scene.add.text(
            x, y - 48, '',
            {
                fontFamily: 'Arial',
                fontSize: '12px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5).setDepth(100000);

        this.healthBar = scene.add.graphics()
            .setDepth(100000);

        this.enableMonsterInteraction();
        this.updateHealthBar();
        this.moveToNextPoint();

        this.on('pointerover', () => {
            if (!this.isDead) this.setTint(0xffffcc);
        });

        this.on('pointerout', () => this.clearTint());
    }

    setWeapon(id) {
        const allowed=['dagger','longsword','sabre','rapier','war_axe','flail','mace','halberd','scythe'];
        if(!allowed.includes(id))return;
        this.weaponId=id;
        if(!this.isDead){
            this.anims.stop();
            this.setTexture(`${this.variantId||'skeleton'}-${id}-idle-${this.facing}-1`);
        }
    }

    play(key, ignoreIfPlaying=false) {
        if(this.weaponId && typeof key==='string' && /^skeleton-(walk|idle|slash)-/.test(key)) {
            const armed=key.replace('skeleton-',`${this.variantId||'skeleton'}-${this.weaponId}-`);
            if(this.scene?.anims?.exists(armed))key=armed;
        }
        return super.play(key,ignoreIfPlaying);
    }

    enableMonsterInteraction() {
        const area = new Phaser.Geom.Rectangle(
            0, 0, this.width, this.height
        );

        if (!this.input) {
            this.setInteractive(
                area,
                Phaser.Geom.Rectangle.Contains
            );
        } else {
            this.input.hitArea = area;
            this.input.hitAreaCallback =
                Phaser.Geom.Rectangle.Contains;
            this.setInteractive();
        }

        if (this.input) {
            this.input.enabled = true;
            this.input.cursor = 'pointer';
        }
    }

    faceTarget(target) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;

        this.facing = Math.abs(dx) > Math.abs(dy)
            ? (dx > 0 ? 'right' : 'left')
            : (dy > 0 ? 'down' : 'up');
    }

    startCombat(player) {
        if (this.isDead || this.isReturning) return;

        if (!this.isInCombat) {
            this.isInCombat = true;
            this.combatStartedAt = this.scene.time.now;
            this.nextAttackTime = 0;
        }
    }

    startReturning() {
        if (this.isDead || this.isReturning) return;

        this.isReturning = true;
        this.isInCombat = false;
        this.isAttacking = false;

        this.setVelocity(0, 0);

        if (this.scene.combatSystem?.target === this) {
            this.scene.combatSystem.cancelTarget();
        }
    }

    updateReturn() {
        const distance = Phaser.Math.Distance.Between(
            this.x, this.y,
            this.centerX, this.centerY
        );

        if (distance < 4) {
            this.setPosition(this.centerX, this.centerY);
            this.setVelocity(0, 0);

            this.isReturning = false;
            this.isInCombat = false;
            this.stats.health = this.stats.maxHealth;

            this.routeIndex = 0;
            this.currentDestination = null;

            this.pauseUntil =
                this.scene.time.now + this.data.patrol.pause;

            this.updateHealthBar();
            this.play(`skeleton-idle-${this.facing}`, true);
            return;
        }

        this.faceTarget({
            x: this.centerX,
            y: this.centerY
        });

        const angle = Phaser.Math.Angle.Between(
            this.x, this.y,
            this.centerX, this.centerY
        );

        this.setVelocity(
            Math.cos(angle) * this.stats.moveSpeed,
            Math.sin(angle) * this.stats.moveSpeed
        );

        this.play(`skeleton-walk-${this.facing}`, true);
    }

    moveToNextPoint() {
        if (this.isDead || this.isReturning) return;

        this.currentDestination =
            this.route[this.routeIndex];

        this.facing = this.currentDestination.direction;
    }

    updatePatrol() {
        if (!this.data.patrol.enabled) {
            this.setVelocity(0, 0);
            this.play(`skeleton-idle-${this.facing}`, true);
            return;
        }

        if (this.scene.time.now < this.pauseUntil) {
            this.setVelocity(0, 0);
            this.play(`skeleton-idle-${this.facing}`, true);
            return;
        }

        if (!this.currentDestination) {
            this.moveToNextPoint();
        }

        const point = this.currentDestination;

        const distance = Phaser.Math.Distance.Between(
            this.x, this.y,
            point.x, point.y
        );

        if (distance < 4) {
            this.setPosition(point.x, point.y);
            this.setVelocity(0, 0);

            this.routeIndex =
                (this.routeIndex + 1) % this.route.length;

            this.currentDestination = null;

            this.pauseUntil =
                this.scene.time.now + this.data.patrol.pause;

            this.play(`skeleton-idle-${this.facing}`, true);
            return;
        }

        const angle = Phaser.Math.Angle.Between(
            this.x, this.y,
            point.x, point.y
        );

        this.setVelocity(
            Math.cos(angle) * this.data.patrol.speed,
            Math.sin(angle) * this.data.patrol.speed
        );

        this.play(`skeleton-walk-${this.facing}`, true);
    }

    updateMonster(delta, player) {
        if (this.isDead) return;

        this.setDepth(this.y);
        this.nameText.setPosition(this.x, this.y - 48);
        this.updateHealthBar();

        if (this.isReturning) {
            this.updateReturn();
            return;
        }

        if (
            !this.isInCombat &&
            !player.isDead &&
            player.level < this.level
        ) {
            const distance = Phaser.Math.Distance.Between(
                this.x, this.y,
                player.x, player.y
            );

            if (
                distance <=
                (this.data.stats.aggroRange || 0)
            ) {
                this.startCombat(player);
            }
        }

        if (this.isInCombat) {
            if (player.isDead) {
                this.startReturning();
                return;
            }

            const duration =
                this.scene.time.now - this.combatStartedAt;

            const distanceFromSpawn =
                Phaser.Math.Distance.Between(
                    this.x, this.y,
                    this.centerX, this.centerY
                );

            if (
                duration > this.maxCombatDuration ||
                distanceFromSpawn > this.maxChaseDistance
            ) {
                this.startReturning();
                return;
            }

            this.updateCombat(player);
            return;
        }

        this.updatePatrol();
    }

    updateCombat(player) {
        if (this.isDead || this.isReturning) return;

        const distance = Phaser.Math.Distance.Between(
            this.x, this.y,
            player.x, player.y
        );

        this.faceTarget(player);

        if (distance <= this.attackRange) {
            this.setVelocity(0, 0);

            if (
                !this.isAttacking &&
                this.scene.time.now >= this.nextAttackTime
            ) {
                this.attackPlayer(player);
            } else if (!this.isAttacking) {
                this.play(
                    `skeleton-idle-${this.facing}`,
                    true
                );
            }

            return;
        }

        const angle = Phaser.Math.Angle.Between(
            this.x, this.y,
            player.x, player.y
        );

        this.setVelocity(
            Math.cos(angle) * this.stats.moveSpeed,
            Math.sin(angle) * this.stats.moveSpeed
        );

        this.play(`skeleton-walk-${this.facing}`, true);
    }

    attackPlayer(player) {
        if (
            this.isDead ||
            this.isReturning ||
            this.isAttacking
        ) return;

        this.isAttacking = true;

        this.nextAttackTime =
            this.scene.time.now + this.attackCooldown;

        this.setVelocity(0, 0);
        this.play(`skeleton-slash-${this.facing}`);

        this.scene.time.delayedCall(250, () => {
            if (
                this.isDead ||
                this.isReturning ||
                player.isDead
            ) return;

            const distance = Phaser.Math.Distance.Between(
                this.x, this.y,
                player.x, player.y
            );

            if (distance <= this.attackRange + 10) {
                // O Player exibe o dano recebido.
                player.takeDamage(
                    this.stats.physicalAttack
                );
            }
        });

        this.scene.time.delayedCall(500, () => {
            this.isAttacking = false;

            if (!this.isDead && !this.isReturning) {
                this.play(
                    `skeleton-idle-${this.facing}`,
                    true
                );
            }
        });
    }

    updateHealthBar() {
        if (this.isDead) return;

        const width = 40;

        const percentage = Phaser.Math.Clamp(
            this.stats.health / this.stats.maxHealth,
            0, 1
        );

        this.healthBar.clear();
        this.healthBar.fillStyle(0x000000, 1);

        this.healthBar.fillRect(
            this.x - 20,
            this.y - 36,
            width,
            5
        );

        this.healthBar.fillStyle(0xff3333, 1);

        this.healthBar.fillRect(
            this.x - 20,
            this.y - 36,
            width * percentage,
            5
        );

        this.nameText.setText(
            `${this.monsterName} Lv. ${this.level}`
        );
    }

    takeDamage(amount, options = {}) {
        if (this.isDead || this.isReturning) return 0;

        this.startCombat(this.scene.player);

        const magical = options.type === 'magic';

        const defense = magical
            ? this.stats.magicalDefense
            : this.stats.physicalDefense;

        const damage = Math.max(
            1,
            Math.floor(
                (Number(amount) || 0) -
                (Number(defense) || 0)
            )
        );

        const previousHealth = this.stats.health;

        this.stats.health = Math.max(
            0,
            previousHealth - damage
        );

        const actualDamage =
            previousHealth - this.stats.health;

        if (actualDamage > 0) {
            DamageText.dealt(
                this.scene,
                this,
                actualDamage,
                Boolean(options.critical)
            );
        }

        if (this.stats.health <= 0) {
            this.die();
        } else {
            this.updateHealthBar();
        }

        return actualDamage;
    }

    die() {
        if (this.isDead) return;

        this.isDead = true;
        this.isInCombat = false;
        this.isReturning = false;
        this.isAttacking = false;

        this.setVelocity(0, 0);

        if (this.body) {
            this.body.enable = false;
        }

        this.scene.tweens.killTweensOf(this);

        if (this.scene.combatSystem?.target === this) {
            this.scene.combatSystem.cancelTarget();
        }

        this.scene.chatUI?.combat(`${this.monsterName} morreu. Loot disponível no corpo.`);
        this.scene.player.gainExperience(
            this.experienceReward
        );

        this.nameText.setText(
            `${this.monsterName} - Morto`
        );

        this.healthBar.clear();

        this.play('skeleton-hurt-up');

        this.once(
            'animationcomplete-skeleton-hurt-up',
            () => {
                if (this.isDead) {
                    this.setTexture(
                        'skeleton-hurt-up-6'
                    );
                }
            }
        );
    }

    respawn() {
        this.anims.stop();

        this.setTexture(`${this.variantId||'skeleton'}-${this.weaponId||'dagger'}-idle-down-1`);

        this.setPosition(
            this.centerX,
            this.centerY
        );

        this.stats.health = this.stats.maxHealth;

        this.isDead = false;
        this.isInCombat = false;
        this.isReturning = false;
        this.isAttacking = false;

        this.setActive(true);
        this.setVisible(true);

        if (this.body) {
            this.body.reset(
                this.centerX,
                this.centerY
            );

            this.body.enable = true;
            this.body.setSize(20, 16);
            this.body.setOffset(22, 44);
        }

        this.clearTint();

        this.facing = 'down';
        this.nextAttackTime = 0;
        this.combatStartedAt = 0;
        this.routeIndex = 0;
        this.pauseUntil = 0;
        this.currentDestination = null;

        this.nameText.setVisible(true);
        this.healthBar.setVisible(true);

        this.updateHealthBar();
        this.enableMonsterInteraction();
        this.moveToNextPoint();
    }
}
