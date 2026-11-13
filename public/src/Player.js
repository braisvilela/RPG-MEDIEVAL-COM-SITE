
import Phaser from 'phaser';
import DamageText from './ui/DamageText.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, data) {
        super(scene, x, y, 'player-idle-down-1');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.scene = scene;

        this.skills = {...{meleeCombat:1,bowCrossbow:1,rangedWeapons:1,magicItems:1}, ...(data.skills||{})};
        this.level = data.level ?? 1;
        this.experience = data.experience ?? 0;
        this.experienceToNextLevel =
            data.experienceToNextLevel ?? 100;

        this.stats = structuredClone(data.stats);
        this.baseStats = structuredClone(data.stats);
        this.currency = structuredClone(
            data.currency || { gold: 0 }
        );

        this.facing = 'down';
        this.playerName = 'Player';
        this.isDead = false;
        this.isCasting = false;
        this.isAttacking = false;
        this.regenerationTimer = 0;

        this.setCollideWorldBounds(true);
        this.body.setSize(20, 16);
        this.body.setOffset(22, 44);

        this.nameText = scene.add.text(x, y - 65, '', {
            fontFamily: 'Arial',
            fontSize: '12px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(100001);

        this.statusBars = scene.add.graphics()
            .setDepth(100001);

        this.playIdle();
        this.updatePlayerUI();
    }

    applyEquipmentBonuses(bonuses = {}) {
        const currentHealth = Number(
            this.stats.health ?? this.stats.maxHealth
        );

        const currentMana = Number(
            this.stats.mana ?? this.stats.maxMana
        );

        const next = { ...this.baseStats };

        for (const [key, value] of Object.entries(bonuses)) {
            if (key === 'health' || key === 'mana') continue;

            const amount = Number(value);
            if (!Number.isFinite(amount)) continue;

            next[key] = (Number(next[key]) || 0) + amount;
        }

        next.maxHealth = Math.max(
            1, Number(next.maxHealth) || 1
        );

        next.maxMana = Math.max(
            0, Number(next.maxMana) || 0
        );

        next.moveSpeed = Math.max(
            1, Number(next.moveSpeed) || 180
        );

        this.stats = {
            ...next,
            health: Phaser.Math.Clamp(
                Number.isFinite(currentHealth)
                    ? currentHealth
                    : next.maxHealth,
                0,
                next.maxHealth
            ),
            mana: Phaser.Math.Clamp(
                Number.isFinite(currentMana)
                    ? currentMana
                    : next.maxMana,
                0,
                next.maxMana
            )
        };

        this.updatePlayerUI();
    }

    updateStatusBars() {
        if (!this.active || !this.nameText || !this.statusBars) {
            return;
        }

        const width = 48;
        const x = this.x - width / 2;
        const healthY = this.y - 53;
        const manaY = healthY + 9;

        const healthPercent = Phaser.Math.Clamp(
            (Number(this.stats.health) || 0) /
            Math.max(1, Number(this.stats.maxHealth) || 1),
            0, 1
        );

        const manaPercent = Phaser.Math.Clamp(
            (Number(this.stats.mana) || 0) /
            Math.max(1, Number(this.stats.maxMana) || 1),
            0, 1
        );

        this.nameText.setPosition(this.x, this.y - 65);
        this.nameText.setText(
            `${this.playerName} Lv. ${this.level}`
        );

        this.statusBars.clear();
        this.statusBars.fillStyle(0x000000, 1);

        this.statusBars.fillRect(
            x - 1, healthY - 1, width + 2, 8
        );

        this.statusBars.fillRect(
            x - 1, manaY - 1, width + 2, 6
        );

        this.statusBars.fillStyle(0xff3333, 1);
        this.statusBars.fillRect(
            x, healthY, width * healthPercent, 6
        );

        this.statusBars.fillStyle(0x3388ff, 1);
        this.statusBars.fillRect(
            x, manaY, width * manaPercent, 4
        );
    }

    updatePlayerUI() {
        this.updateStatusBars();
    }

    playIdle() {
        if (
            this.isDead ||
            this.isCasting ||
            this.isAttacking
        ) return;

        const key = `player-idle-${this.facing}`;

        if (
            this.anims.currentAnim?.key !== key ||
            !this.anims.isPlaying
        ) {
            this.play(key, true);
        }
    }

    moveManually(keys) {
        if (
            this.isDead ||
            this.isCasting ||
            !this.body?.enable
        ) {
            this.setVelocity(0, 0);
            return;
        }

        let vx =
            Number(Boolean(keys.right?.isDown)) -
            Number(Boolean(keys.left?.isDown));

        let vy =
            Number(Boolean(keys.down?.isDown)) -
            Number(Boolean(keys.up?.isDown));

        const length = Math.hypot(vx, vy);

        if (length > 0) {
            // Manual movement cancels a possibly interrupted attack animation.
            if (this.isAttacking) {
                this.attackAnimationToken = (this.attackAnimationToken || 0) + 1;
                this.isAttacking = false;
            }
            vx /= length;
            vy /= length;

            this.facing = Math.abs(vx) > Math.abs(vy)
                ? (vx > 0 ? 'right' : 'left')
                : (vy > 0 ? 'down' : 'up');

            const speed = Math.max(
                1, Number(this.stats.moveSpeed) || 180
            );

            this.setVelocity(vx * speed, vy * speed);
            this.play(`player-walk-${this.facing}`, true);
        } else {
            this.setVelocity(0, 0);
            this.playIdle();
        }

        this.setDepth(this.y);
    }

    moveTowards(target) {
        if (
            this.isDead ||
            this.isCasting ||
            this.isAttacking ||
            !this.body?.enable ||
            !target
        ) return;

        const angle = Phaser.Math.Angle.Between(
            this.x, this.y, target.x, target.y
        );

        const vx = Math.cos(angle);
        const vy = Math.sin(angle);

        this.facing = Math.abs(vx) > Math.abs(vy)
            ? (vx > 0 ? 'right' : 'left')
            : (vy > 0 ? 'down' : 'up');

        const speed = Math.max(
            1, Number(this.stats.moveSpeed) || 180
        );

        this.setVelocity(vx * speed, vy * speed);
        this.play(`player-walk-${this.facing}`, true);
        this.setDepth(this.y);
    }

    faceTarget(target) {
        if (!target) return;

        const dx = target.x - this.x;
        const dy = target.y - this.y;

        this.facing = Math.abs(dx) > Math.abs(dy)
            ? (dx > 0 ? 'right' : 'left')
            : (dy > 0 ? 'down' : 'up');
    }

    playSlash(mode = 'slash') {
        if (
            this.isDead ||
            this.isCasting ||
            this.isAttacking
        ) return;

        this.isAttacking = true;
        this.setVelocity(0, 0);

        const animation = mode === 'shoot' && this.scene.anims.exists(`player-shoot-${this.facing}`) ? `player-shoot-${this.facing}` : `player-slash-${this.facing}`;

        this.play(animation);

        // The attack can be interrupted by manual movement or a target change.
        // Always release the attack lock, even when animationcomplete never fires.
        this.attackAnimationToken = (this.attackAnimationToken || 0) + 1;
        const token = this.attackAnimationToken;
        const finish = () => {
            if (token !== this.attackAnimationToken) return;
            this.isAttacking = false;
            if (!this.isDead && !this.isCasting &&
                Math.abs(this.body?.velocity?.x || 0) + Math.abs(this.body?.velocity?.y || 0) < 1) {
                this.playIdle();
            }
        };
        this.once(`animationcomplete-${animation}`, finish);
        this.scene.time.delayedCall(650, finish);
    }

    updateRegeneration(delta) {
        if (this.isDead) return;

        this.regenerationTimer += delta;

        while (this.regenerationTimer >= 1000) {
            this.regenerationTimer -= 1000;

            this.stats.health = Math.min(
                this.stats.maxHealth,
                this.stats.health + 1
            );

            this.stats.mana = Math.min(
                this.stats.maxMana,
                this.stats.mana + 1
            );
        }
    }

    takeDamage(amount) {
        if (this.isDead) return 0;

        const attack = Number(amount) || 0;
        const defense = Number(
            this.stats.physicalDefense
        ) || 0;

        const damage = Math.max(
            1,
            Math.floor(attack - defense)
        );

        const previousHealth = this.stats.health;

        this.stats.health = Math.max(
            0,
            previousHealth - damage
        );

        const actualDamage = previousHealth - this.stats.health;

        if (actualDamage > 0) {
            this.scene.chatUI?.combat(`Você sofreu ${actualDamage} de dano.`);
            DamageText.received(
                this.scene,
                this,
                actualDamage
            );
        }

        this.updatePlayerUI();

        if (this.stats.health <= 0) {
            this.die();
        }

        return actualDamage;
    }

    heal(amount) {
        if (this.isDead) return;

        this.stats.health = Math.min(
            this.stats.maxHealth,
            this.stats.health + (Number(amount) || 0)
        );

        this.updatePlayerUI();
    }

    die() {
        if (this.isDead) return;

        this.isDead = true;
        this.isCasting = false;
        this.isAttacking = false;

        this.setVelocity(0, 0);

        if (this.body) {
            this.body.enable = false;
        }

        this.scene.combatSystem?.cancelTarget();

        this.play('player-hurt-up');

        this.once(
            'animationcomplete-player-hurt-up',
            () => this.respawn()
        );
    }

    respawn() {
        const x = 5.5 * this.scene.map.tileWidth;
        const y = 5.5 * this.scene.map.tileHeight;

        this.setPosition(x, y);

        if (this.body) {
            this.body.reset(x, y);
            this.body.enable = true;
        }

        this.stats.health = this.stats.maxHealth;
        this.stats.mana = this.stats.maxMana;

        this.facing = 'down';
        this.isDead = false;
        this.isCasting = false;
        this.isAttacking = false;
        this.regenerationTimer = 0;

        this.setVelocity(0, 0);
        this.playIdle();
        this.updatePlayerUI();
    }

    gainExperience(amount) {
        this.experience += Number(amount) || 0;

        while (
            this.experienceToNextLevel > 0 &&
            this.experience >= this.experienceToNextLevel
        ) {
            this.experience -= this.experienceToNextLevel;
            this.level++;

            this.experienceToNextLevel = Math.floor(
                this.experienceToNextLevel * 1.5
            );
        }

        this.updatePlayerUI();
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        this.updatePlayerUI();
    }

    destroy(fromScene) {
        this.nameText?.destroy();
        this.statusBars?.destroy();
        super.destroy(fromScene);
    }
}
