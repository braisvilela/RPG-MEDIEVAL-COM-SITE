
import Phaser from 'phaser';

export default class CombatSystem {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.target = null;
        this.attackRange = 48;
        this.attackCooldown = 1000;
        this.lastAttackTime = -Infinity;
        this.isAttacking = false;
        this.attackToken = 0;
    }

    getWeapon() {
        return this.scene.inventorySystem
            ?.getEquippedWeapon() || null;
    }

    getCombat() {
        return this.getWeapon()?.combat || {
            range: 48,
            attackCooldown: 1000,
            ammoCost: 0,
            manaCost: 0
        };
    }

    selectTarget(monster) {
        if (
            !monster ||
            monster.isDead ||
            !monster.active ||
            monster.isReturning ||
            this.player.isDead
        ) return false;

        this.target = monster;
        this.attackToken++;
        this.isAttacking = false;

        return true;
    }

    cancelTarget() {
        this.target = null;
        this.attackToken++;
        this.isAttacking = false;
        this.player.attackAnimationToken = (this.player.attackAnimationToken || 0) + 1;
        this.player.isAttacking = false;
        if (this.player.body?.enable) this.player.setVelocity(0, 0);

        if (
            !this.player.isDead &&
            !this.player.isCasting
        ) {
            this.player.setVelocity(0, 0);
            this.player.playIdle();
        }
    }

    update(time) {
        const target = this.target;
        if (!target) return;

        if (
            target.isDead ||
            !target.active ||
            target.isReturning ||
            this.player.isDead
        ) {
            this.cancelTarget();
            return;
        }

        if (this.player.isCasting) return;

        const combat = this.getCombat();
        const range = Number(combat.range) || 48;

        const distance = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            target.x,
            target.y
        );

        if (distance > range) {
            if (!this.isAttacking) {
                this.player.moveTowards(target);
            }
            return;
        }

        this.player.setVelocity(0, 0);
        this.player.faceTarget(target);

        if (
            this.isAttacking ||
            this.player.isAttacking
        ) return;

        const cooldown =
            Number(combat.attackCooldown) || 1000;

        if (time - this.lastAttackTime < cooldown) {
            this.player.playIdle();
            return;
        }

        this.attack(time);
    }

    attack(time) {
        const target = this.target;

        if (
            !target ||
            target.isDead ||
            target.isReturning
        ) return;

        const weapon = this.getWeapon();
        const combat = this.getCombat();

        const type = weapon?.weaponClass || 'melee';
        const inventory = this.scene.inventorySystem;

        const ammoCost = Number(combat.ammoCost) || 0;
        const manaCost = Number(combat.manaCost) || 0;
        const ammoType = combat.ammoType;

        const equipped = inventory?.getEquipped('Weapon');
        if (combat.consumeEquipped && (!equipped || equipped.quantity < 1)) {
            this.cancelTarget();
            return;
        }
        if (ammoCost > 0) {
            if (
                !ammoType ||
                !inventory.hasItem(ammoType, ammoCost)
            ) {
                console.log('[COMBATE] Sem flechas.');
                this.player.setVelocity(0, 0);
                this.player.playIdle();
                this.lastAttackTime = time;
                return;
            }
        }

        if (
            manaCost > 0 &&
            this.player.stats.mana < manaCost
        ) {
            console.log('[COMBATE] Mana insuficiente.');
            this.player.setVelocity(0, 0);
            this.player.playIdle();
            this.lastAttackTime = time;
            return;
        }

        if (ammoCost > 0) {
            if (
                !inventory.removeItem(
                    ammoType,
                    ammoCost
                )
            ) return;
        }

        if (manaCost > 0) {
            this.player.stats.mana -= manaCost;
        }
        if (combat.consumeEquipped) {
            equipped.quantity -= 1;
            if (equipped.quantity <= 0) {
                inventory.equipment.Weapon = null;
                this.exhaustedWeapon = true;
            }
            inventory.notifyChange();
        }

        this.scene.saveProgress?.();

        this.lastAttackTime = time;
        this.isAttacking = true;

        const token = ++this.attackToken;

        this.player.faceTarget(target);
        this.player.playSlash(['bow','throwing','ranged'].includes(type) ? 'shoot' : 'slash');

        const physical =
            Number(this.player.stats.physicalAttack) || 1;

        const magical =
            Number(this.player.stats.magicalAttack) || 1;

        const chance = Phaser.Math.Clamp(
            Number(this.player.stats.criticalChance) || 0,
            0,
            1
        );

        const multiplier =
            Number(this.player.stats.criticalDamage) || 1.5;

        const critical = Math.random() < chance;

        let damage = type === 'magic' ? magical : physical;
        const skillKey = type === 'magic' ? 'magicItems' : type === 'bow' ? 'bowCrossbow' : type === 'throwing' ? 'rangedWeapons' : 'meleeCombat';
        const skillLevel = Math.max(1, Number(this.player.skills?.[skillKey]) || 1);
        const playerLevel = Math.max(1, Number(this.player.level) || 1);
        damage *= (1 + (playerLevel - 1) * 0.005 + (skillLevel - 1) * 0.01);

        if (critical) {
            damage *= multiplier;
        }

        const attackRange =
            Number(combat.range) || 48;

        this.scene.time.delayedCall(250, () => {
            if (
                token !== this.attackToken ||
                target.isDead ||
                !target.active ||
                this.player.isDead
            ) return;

            const distance = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                target.x,
                target.y
            );

            if (distance > attackRange + 15) return;

            if (
                type === 'ranged' || type === 'throwing' || type === 'bow' ||
                type === 'magic'
            ) {
                this.launchProjectile(
                    target,
                    damage,
                    type,
                    Number(combat.projectileSpeed) || 300,
                    critical,
                    combat.projectile
                );
            } else {
                if (!this.scene.multiplayerSystem?.attack(target,damage,'physical',critical)) {
                    target.takeDamage(damage, { type: 'physical', critical });
                }
            }
        });

        this.scene.time.delayedCall(500, () => {
            if (token !== this.attackToken) return;

            this.isAttacking = false;
            // Never leave the player's animation state locked after an attack.
            this.player.isAttacking = false;
            if (this.exhaustedWeapon) { this.exhaustedWeapon = false; this.cancelTarget(); return; }

            if (
                !this.player.isDead &&
                !this.player.isCasting
            ) {
                this.player.playIdle();
            }
        });
    }

    launchProjectile(
        target,
        damage,
        type,
        speed,
        critical = false,
        projectileKey = null
    ) {
        const startX = this.player.x;
        const startY = this.player.y - 20;

        const color = type === 'magic'
            ? 0x64baff
            : 0xd5b17c;

        const radius = type === 'magic' ? 7 : 4;

        const hasTexture = projectileKey && this.scene.textures.exists(projectileKey);
        const projectile = hasTexture
            ? this.scene.add.sprite(startX, startY, projectileKey, 5)
            : this.scene.add.circle(startX, startY, radius, color);

        if (hasTexture) {
            // Cada arquivo é uma grade 3x3: 8 direções, centro sem projétil.
            // Preserva proporção e tamanho do quadro, não da folha inteira.
            projectile.setDisplaySize(24, 24);
        }
        projectile.setDepth(100005);

        const startTime = this.scene.time.now;
        const maxLifetime = 2500;

        let finished = false;

        const update = (time, delta) => {
            if (finished) return;

            if (
                !target.active ||
                target.isDead ||
                time - startTime > maxLifetime
            ) {
                cleanup();
                return;
            }

            const dx = target.x - projectile.x;
            const dy = target.y - 20 - projectile.y;
            const distance = Math.hypot(dx, dy);

            if (hasTexture && distance > 0) {
                // Linhas da spritesheet: NW N NE / W vazio E / SW S SE.
                const angle = Math.atan2(dy, dx);
                const octant = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
                const frames = [5, 8, 7, 6, 3, 0, 1, 2];
                projectile.setFrame(frames[octant]);
            }

            if (distance <= 12) {
                if (!this.scene.multiplayerSystem?.attack(target,damage,type,critical)) {
                    target.takeDamage(damage, { type, critical });
                }

                cleanup();
                return;
            }

            const step = speed * (delta / 1000);

            if (distance > 0) {
                projectile.x +=
                    dx / distance * Math.min(step, distance);

                projectile.y +=
                    dy / distance * Math.min(step, distance);
            }
        };

        const cleanup = () => {
            if (finished) return;

            finished = true;

            this.scene.events.off('update', update);
            projectile.destroy();
        };

        this.scene.events.on('update', update);
        this.scene.events.once('shutdown', cleanup);
    }
}
